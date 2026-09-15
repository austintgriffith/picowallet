#!/usr/bin/env node
// Dev server for the emulator: static UI, the emulated flash (firmware/ + emu/sketches/), a control
// channel so tools/emu can drive the page, and a proxy to the wallet app so requests from the
// emulated firmware are same-origin.
//   node emu/server.mjs [--port 4242] [--app http://localhost:3001] [--open]
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { ROOT, listWorkspace, readWorkspaceFile, writeWorkspaceFile, readShims, entryFor, isRunnable } from "./core/workspace.mjs";
import { ship, findUsbPort } from "./core/ship.mjs";
import { listDevices, flash } from "./core/devices.mjs";

const EMU = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const PORT = +(opt("port", process.env.EMU_PORT || 4242));
const APP = opt("app", process.env.EMU_APP || "http://localhost:3001");
const OPEN = args.includes("--open");

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".json": "application/json", ".png": "image/png", ".stl": "model/stl", ".py": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const STATIC = [
  ["/web/", join(EMU, "web")],
  ["/core/", join(EMU, "core")],
  ["/vendor/micropython/", join(EMU, "node_modules/@micropython/micropython-webassembly-pyscript")],
  ["/vendor/three/addons/", join(EMU, "node_modules/three/examples/jsm")],
  ["/vendor/three/", join(EMU, "node_modules/three/build")],
  ["/vendor/codemirror/", join(EMU, "node_modules/codemirror")],
  ["/stl/", join(ROOT, "case/zez0000")],
];

const clients = new Set();          // SSE responses (emulator pages)
const pending = new Map();          // reply id -> { resolve, timer }
let seq = 0;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  // SharedArrayBuffer needs cross-origin isolation; everything is served from here so that is free.
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cache-Control", "no-store");
  try {
    if (url.pathname === "/") return sendFile(res, join(EMU, "web/index.html"));
    if (url.pathname === "/skill") { res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }); return res.end(readFileSync(join(EMU, "SKILL.md"))); }
    if (url.pathname.startsWith("/app/")) return proxy(req, res, url.pathname.slice(4) + url.search);
    if (url.pathname.startsWith("/ctl/")) {
      // The wallet app (another origin) may drive the virtual device's serial port for testing.
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "content-type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
      return control(req, res, url);
    }
    for (const [prefix, dir] of STATIC) {
      if (url.pathname.startsWith(prefix)) {
        const rel = normalize(decodeURIComponent(url.pathname.slice(prefix.length)));
        if (rel.startsWith("..")) break;
        return sendFile(res, join(dir, rel));
      }
    }
    res.writeHead(404); res.end("not found");
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" }); res.end(String(e.stack || e));
  }
});

function sendFile(res, path) {
  if (!existsSync(path) || !statSync(path).isFile()) { res.writeHead(404); return res.end("not found: " + path); }
  res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
  res.end(readFileSync(path));
}

function json(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

function body(req) {
  return new Promise((resolve) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => resolve(Buffer.concat(c))); });
}

async function control(req, res, url) {
  const p = url.pathname.slice(5);
  if (p === "boot" && req.method === "GET") {
    const files = listWorkspace().map((f) => {
      const { data } = readWorkspaceFile(f.name);
      if (!f.name.endsWith(".py")) return { ...f, b64: data.toString("base64") };
      const text = data.toString("utf8"), mod = f.name.slice(0, -3);
      return { ...f, text, runnable: isRunnable(mod, text), entry: entryFor(mod) };
    });
    return json(res, 200, { files, shims: readShims(), appUrl: "/app", clients: clients.size });
  }
  if (p === "files" && req.method === "GET") return json(res, 200, { files: listWorkspace() });
  if (p === "file" && req.method === "GET") {
    const f = readWorkspaceFile(url.searchParams.get("name"));
    if (!f) return json(res, 404, { error: "no such file" });
    return json(res, 200, { name: f.name, src: f.src, text: f.data.toString("utf8") });
  }
  if (p === "file" && req.method === "POST") {
    const { name, content, src } = JSON.parse((await body(req)).toString("utf8"));
    return json(res, 200, writeWorkspaceFile(name, content, src));
  }
  if (p === "events") {
    res.writeHead(200, { "content-type": "text/event-stream", connection: "keep-alive" });
    res.write("retry: 1000\n\n");
    clients.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 15000);
    req.on("close", () => { clearInterval(ping); clients.delete(res); });
    return;
  }
  if (p === "reply" && req.method === "POST") {
    const { id, result } = JSON.parse((await body(req)).toString("utf8"));
    const w = pending.get(id);
    if (w) { clearTimeout(w.timer); pending.delete(id); w.resolve(result); }
    return json(res, 200, { ok: true });
  }
  if (p === "cmd" && req.method === "POST") {
    const cmd = JSON.parse((await body(req)).toString("utf8"));
    if (clients.size === 0) {
      openBrowser();
      const t0 = Date.now();
      while (clients.size === 0 && Date.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 200));
      if (clients.size === 0) return json(res, 409, { error: "no emulator page is open; run tools/emu to open one" });
      await new Promise((r) => setTimeout(r, 1500)); // let the page boot
    }
    try {
      const result = await ask(cmd, cmd.timeout || 60000);
      return json(res, 200, result);
    } catch (e) {
      return json(res, 504, { error: String(e.message || e) });
    }
  }
  if (p === "ship" && req.method === "POST") {
    const { name, target, port, boot } = JSON.parse((await body(req)).toString("utf8"));
    const r = await ship(name, { target, port, boot });
    return json(res, r.ok ? 200 : 500, r);
  }
  if (p === "flash" && req.method === "POST") {
    const { path, port, version, wifi } = JSON.parse((await body(req)).toString("utf8"));
    let r; try { r = await flash({ path, port }, { version, wifi }); } catch (e) { r = { ok: false, error: String(e.message || e) }; }
    return json(res, r.ok ? 200 : 500, r);
  }
  if (p === "devices" && req.method === "GET") return json(res, 200, { devices: listDevices() });
  if (p === "usb" && req.method === "GET") return json(res, 200, { port: findUsbPort() });
  if (p === "state" && req.method === "GET") return json(res, 200, { ok: true, clients: clients.size, app: APP, port: PORT });
  json(res, 404, { error: "unknown control route" });
}

function ask(cmd, timeoutMs) {
  const id = ++seq;
  const client = [...clients].at(-1);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("emulator page did not answer")); }, timeoutMs);
    pending.set(id, { resolve, timer });
    client.write(`data: ${JSON.stringify({ id, ...cmd })}\n\n`);
  });
}

function proxy(req, res, path) {
  const target = new URL(APP);
  const headers = { ...req.headers, host: target.host };
  const up = http.request({ hostname: target.hostname, port: target.port || 80, path, method: req.method, headers }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  up.on("error", (e) => { res.writeHead(502, { "content-type": "text/plain" }); res.end("app unreachable at " + APP + ": " + e.message); });
  req.pipe(up);
}

function openBrowser() {
  const u = `http://localhost:${PORT}/`;
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try { spawn(cmd, [u], { stdio: "ignore", detached: true }).unref(); } catch (e) {}
}

server.listen(PORT, () => {
  console.log(`picowallet emulator  http://localhost:${PORT}/   app proxy -> ${APP}`);
  if (OPEN) openBrowser();
});
