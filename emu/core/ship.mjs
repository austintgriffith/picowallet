// Put a module on the real Pico and run it. Used by `tools/emu ship NAME` and the page's
// "send to Pico" button (server route /ctl/ship).
//   ship(name, { target: "usb" | "wifi", port, boot }) -> { ok, port, lines, blocking, error? }
// boot: also write main.py so the module runs at power-up (USB only; refused on a board whose
// main.py mentions the wallet, which is the wallet Pico).
// usb: `port` from the device picker, else the first /dev/cu.usbmodem* (mac) or /dev/ttyACM* (linux). wifi: the wallet Pico's
// socket console (PICO_HOST, default picowallet.local:2323), same as tools/pico.
// The module is copied (lcd.py too if the board lacks it), the board is soft-reset (USB), then the
// module is imported with the same snippet the emulator uses. Output is followed for a few seconds; a module that never returns
// (a `while True`) is reported as blocking and left running.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIRMWARE, SKETCHES, listWorkspace, entryFor } from "./workspace.mjs";
import { runCode } from "./runtime.mjs";
import { MPREMOTE, lock, serialPorts } from "./devices.mjs";

const FOLLOW_MS = 4000;

export function findUsbPort() { return serialPorts()[0] || null; }

// resume=false lets mpremote soft-reset first: every timer from the last module dies, and main.py
// does not run again (raw REPL skips it). That is what makes a send replace what is on the screen.
function mp(port, args, timeoutMs, resume = true) {
  return new Promise((resolve) => {
    const child = spawn(MPREMOTE, ["connect", port, ...(resume ? ["resume"] : []), ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", done = false;
    const finish = (code, killed) => { if (done) return; done = true; resolve({ code, killed, out }); };
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", (e) => { out += String(e); finish(1, false); });
    child.on("exit", (c) => finish(c, false));
    setTimeout(() => { if (!done) { child.kill("SIGKILL"); finish(null, true); } }, timeoutMs);
  });
}

const lines = (s) => s.replace(/\r/g, "").split("\n").map((l) => l.trimEnd()).filter(Boolean);

export async function ship(name, opts = {}) {
  name = name.replace(/\.py$/, "").replace(/^.*\//, "");
  const file = listWorkspace().find((f) => f.name === name + ".py");
  if (!file) return { ok: false, error: `no module ${name}.py in firmware/ or emu/sketches/` };
  const src = join(file.src === "firmware" ? FIRMWARE : SKETCHES, file.name);
  const target = opts.target || "usb";
  const port = target === "wifi" ? `socket://${process.env.PICO_HOST || "picowallet.local"}:2323` : (opts.port || findUsbPort());
  if (!port) return { ok: false, error: "no Pico on USB (nothing at /dev/cu.usbmodem*); plug one in, or ship --wifi" };
  if (opts.port && target !== "wifi" && !serialPorts().includes(opts.port)) return { ok: false, error: "no board at " + opts.port + " any more" };

  for (let i = 0; i < 20 && lock.busy; i++) await new Promise((r) => setTimeout(r, 500));
  lock.busy = true;
  try { return await doShip(name, file, src, port, target, !!opts.boot); } finally { lock.busy = false; }
}

async function doShip(name, file, src, port, target, boot) {
  // USB: soft reset first (kills the old module's timers; raw-REPL reset skips main.py), then copy,
  // then run, all without another reset: a reset right after a copy can lose the write on LittleFS.
  // WiFi wallet: a soft reset would rerun boot.py and drop the console, so no reset there; runCode
  // stops the old copy of the module instead.
  const probe = "import os; print(os.listdir()); print('MAIN:', open('main.py').read()[:200].replace('\\n', ' ') if 'main.py' in os.listdir() else '')";
  const ls = await mp(port, ["exec", probe], 15000, target === "wifi");
  if (ls.code !== 0) return { ok: false, port, error: "cannot talk to the Pico at " + port, lines: lines(ls.out) };
  const have = ls.out.includes("'lcd.py'");
  const mainNow = (ls.out.match(/MAIN:\s*(.*)/) || [])[1] || "";
  let bootNote = "";
  if (boot) {
    if (target === "wifi" || /wallet/.test(mainNow)) bootNote = "main.py left alone: this looks like the wallet Pico";
    else {
      const lcdFirst = dependencies(name).includes("lcd.py") && name !== "lcd" ? "    import lcd     # first: framebuffer on a fresh heap (RP2040)\n" : "";
      writeFileSync(join(SKETCHES, ".main.py"), `# written by the emulator's send: run ${name} at power-up\nimport sys\ntry:\n${lcdFirst}    import ${name}\n${entryFor(name) ? "    " + entryFor(name) + "\n" : ""}except Exception as e:\n    sys.print_exception(e)\n`);
      bootNote = `main.py now runs ${name} at power-up`;
    }
  }

  // Everything the module imports (recursively) that lives in firmware/ or emu/sketches/, plus any
  // "x.bin" it names, goes too. mpremote cp skips files the board already has unchanged.
  const args = [];
  for (const dep of dependencies(name)) {
    const f = listWorkspace().find((x) => x.name === dep);
    if (f && dep !== file.name) args.push("cp", join(f.src === "firmware" ? FIRMWARE : SKETCHES, dep), `:${dep}`, "+");
  }
  args.push("cp", src, `:${file.name}`, "+");
  if (bootNote.startsWith("main.py now")) args.push("cp", join(SKETCHES, ".main.py"), ":main.py", "+");
  args.push("exec", "import os\nif hasattr(os, 'sync'): os.sync()");
  const c = await mp(port, args, 120000);
  if (c.code !== 0) return { ok: false, port, error: "copy failed", lines: lines(c.out) };
  const first = dependencies(name).includes("lcd.py") && name !== "lcd" ? ["lcd"] : [];
  // USB: soft-reset before the run (resume=false) so the heap is fresh. mpremote's copy helpers
  // stay resident under resume and fragment it; on an RP2040 the framebuffer then fails to fit.
  const r = await mp(port, ["exec", runCode(name, entryFor(name), first)], FOLLOW_MS, target === "wifi");
  const out = lines(c.out).concat(lines(r.out));
  const failed = out.some((l) => /^Traceback/.test(l));
  if (bootNote) out.push(bootNote);
  return { ok: !failed && (r.killed || r.code === 0), port, blocking: r.killed, copiedLcd: !have, lines: out, bootNote,
    copied: out.filter((l) => /^cp /.test(l)).map((l) => l.replace(/^cp .*\//, "").replace(/ :.*$/, "")) };
}

// Files (names with extension) the module needs from the workspace, the module itself last.
export function dependencies(name) {
  const ws = listWorkspace();
  const text = (n) => { const f = ws.find((x) => x.name === n + ".py"); return f ? readFileSync(join(f.src === "firmware" ? FIRMWARE : SKETCHES, f.name), "utf8") : null; };
  const seen = new Set(), order = [];
  (function visit(n) {
    if (seen.has(n)) return;
    seen.add(n);
    const t = text(n);
    if (t == null) return;
    for (const m of t.matchAll(/^\s*(?:import\s+([\w, ]+)|from\s+(\w+)\s+import)/gm)) {
      const names = m[2] ? [m[2]] : m[1].split(",").map((x) => x.trim().split(/\s+as\s+/)[0]);
      for (const d of names) if (d && d !== "secrets" && text(d) != null) visit(d);
    }
    for (const m of t.matchAll(/["'](\w+\.bin)["']/g)) if (ws.some((x) => x.name === m[1]) && !order.includes(m[1])) order.push(m[1]);
    order.push(n + ".py");
  })(name);
  return order;
}
