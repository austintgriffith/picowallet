#!/usr/bin/env node
// Run a module on the emulated Pico without a browser, poke keys, save screenshots.
//   node emu/headless.mjs mock --wait 300 --key right --wait 200 --shot shots/1.png
// Steps run in order:
//   --wait MS            let timers run for MS ms
//   --key NAME[:MS]      press a key (A B X Y up down left right press) for MS ms (default 80)
//   --hold NAME / --release NAME
//   --exec CODE          one REPL line
//   --shot PATH.png      save the screen (2x) as PNG
//   --app URL            wallet app for requests (default http://localhost:3001)
//   --heap BYTES         MicroPython heap (default 448 KB)
//   --quiet              no Python stdout
// Exit code 1 if the module raised during import. Modules with a blocking loop (demo) never
// return from import here, so the steps after it never run; use the page for those.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { loadMicroPython } from "@micropython/micropython-webassembly-pyscript";
import { createDevice, KEY_ORDER, frameToRGBA, W, H } from "./core/runtime.mjs";
import { readWorkspace, readShims, entryFor } from "./core/workspace.mjs";
import { encodePNG, scaleRGBA } from "./core/png.mjs";

const argv = process.argv.slice(2);
let mod = null; const steps = []; let app = "http://localhost:3001"; let heap; let quiet = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    if (k === "quiet") { quiet = true; continue; }
    const v = argv[++i];
    if (k === "app") app = v; else if (k === "heap") heap = +v; else steps.push([k, v]);
  } else mod = a;
}
if (!mod) { console.error("usage: headless.mjs MODULE [--wait MS] [--key K[:MS]] [--exec CODE] [--shot out.png]"); process.exit(2); }

const keys = new Int32Array(16);
let failed = false;
const dev = await createDevice({
  loadMicroPython, keys, heapsize: heap,
  files: readWorkspace(), shims: readShims(), appUrl: app,
  http: curl,
  onStdout: (l) => { if (!quiet) console.log(l); if (/^Traceback/.test(l)) failed = true; },
  onReset: () => { console.log("[machine.reset() called]"); },
});
dev.run(mod, entryFor(mod));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const idx = (k) => { const i = KEY_ORDER.indexOf(k); if (i < 0) throw new Error("no key " + k); return i; };
for (const [k, v] of steps) {
  if (k === "wait") await sleep(+v);
  else if (k === "key") { const [n, ms] = v.split(":"); keys[idx(n)] = 1; await sleep(+(ms || 80)); keys[idx(n)] = 0; await sleep(60); }
  else if (k === "hold") keys[idx(v)] = 1;
  else if (k === "release") keys[idx(v)] = 0;
  else if (k === "exec") dev.exec(v);
  else if (k === "send") dev.writeStdin(v + "\n");
  else if (k === "shot") {
    const rgba = scaleRGBA(frameToRGBA(dev.frame), W, H, 2);
    mkdirSync(dirname(v), { recursive: true });
    writeFileSync(v, encodePNG(W * 2, H * 2, rgba));
    console.log("[shot]", v, "frames so far:", dev.frames);
  } else console.error("unknown step --" + k);
}
dev.dispose();
process.exit(failed ? 1 : 0);

function curl(method, url, body, headers, timeoutMs) {
  const args = ["-s", "-S", "-X", method, "--max-time", String(Math.ceil(timeoutMs / 1000)), "-o", "-", "-w", "\n__STATUS__%{http_code}"];
  for (const [k, v] of Object.entries(headers)) args.push("-H", `${k}: ${v}`);
  if (body != null) args.push("--data-binary", body);
  args.push(url);
  const out = execFileSync("curl", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const i = out.lastIndexOf("\n__STATUS__");
  return { status: +out.slice(i + 11), text: out.slice(0, i) };
}
