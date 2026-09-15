// The page: editor + console on the left, the device on the right, a Worker running MicroPython,
// and a control channel (SSE) so tools/emu can drive everything from a terminal.
import { createDevice3D } from "/web/device3d.js";

const KEY_ORDER = ["A", "B", "X", "Y", "up", "down", "left", "right", "press"];
// keyboard -> device. Joystick: W A S D + space. Buttons: numpad 9 6 3 . (top row 9 6 3 . works too).
const KEYMAP = { w: "up", a: "left", s: "down", d: "right", " ": "press", 9: "A", 6: "B", 3: "X", ".": "Y" };
const CODEMAP = { Numpad9: "A", Numpad6: "B", Numpad3: "X", NumpadDecimal: "Y", Space: "press" };
const keyOf = (e) => CODEMAP[e.code] || KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sab = typeof SharedArrayBuffer !== "undefined" && self.crossOriginIsolated ? new SharedArrayBuffer(16 * 4) : null;
const keys = new Int32Array(sab || new ArrayBuffer(16 * 4));
// Serial input to the device (its USB stdin): Int32 [head, tail] + a 64 KB byte ring.
const serialSab = sab ? new SharedArrayBuffer(8 + 65536) : null;
const serialCtl = serialSab ? new Int32Array(serialSab, 0, 2) : null;
const serialBuf = serialSab ? new Uint8Array(serialSab, 8) : null;
function sendLine(text) {
  if (!text.endsWith("\n")) text += "\n";
  appendLog("<< " + text.trimEnd(), "in");
  if (!serialSab) { if (worker) worker.postMessage({ type: "send", line: text }); return; }
  const bytes = new TextEncoder().encode(text);
  let h = Atomics.load(serialCtl, 0);
  for (const b of bytes) serialBuf[h++ % serialBuf.length] = b;
  Atomics.store(serialCtl, 0, h);
}
const screen = $("#screen"), sctx = screen.getContext("2d");
const flatscreen = $("#flatscreen"), fctx = flatscreen.getContext("2d");
const img = sctx.createImageData(240, 240);

let worker = null, seq = 0, running = null, main = localStorage.getItem("emu.main") || "mock";
const files = new Map();          // name -> { src, text?, b64?, dirty }
let current = null, editor = null, editorFallback = null, loading = false;
const log = [];
let execCapture = null;
const waiting = new Map();
let frames = 0, fpsCount = 0, fps = 0;
let device3d = null;

// ---- editor ------------------------------------------------------------------------------
if (window.CodeMirror) {
  editor = CodeMirror.fromTextArea($("#src"), {
    mode: "python", lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false, viewportMargin: 50,
    extraKeys: { "Cmd-Enter": runFile, "Ctrl-Enter": runFile, "Cmd-S": saveAll, "Ctrl-S": saveAll,
      Tab: (cm) => cm.somethingSelected() ? cm.indentSelection("add") : cm.replaceSelection("    ", "end") },
  });
  // `loading` guards setValue in openFile; a binary tab (text undefined) shows a placeholder and is never dirty.
  editor.on("change", () => { if (loading || !current) return; const f = files.get(current); if (f && f.text !== undefined) { f.text = editor.getValue(); f.dirty = true; renderTabs(); } });
} else {
  editorFallback = $("#src");
  editorFallback.addEventListener("input", () => { const f = files.get(current); if (f && f.text !== undefined) { f.text = editorFallback.value; f.dirty = true; renderTabs(); } });
  editorFallback.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runFile(); } });
}
const getSrc = () => (editor ? editor.getValue() : editorFallback.value);
const setSrc = (t) => { loading = true; try { if (editor) { editor.setValue(t); editor.clearHistory(); } else editorFallback.value = t; } finally { loading = false; } };

function openFile(name) {
  const f = files.get(name);
  if (!f) return;
  current = name;
  setSrc(f.text !== undefined ? f.text : `# ${name}: binary, ${Math.round(atob(f.b64).length / 1024)} KB`);
  if (editor) editor.setOption("readOnly", f.text === undefined ? "nocursor" : false);
  renderTabs();
}

function renderTabs() {
  const tabs = $("#tabs");
  tabs.innerHTML = "";
  const order = [...files.values()].sort((a, b) => (a.src === b.src ? a.name.localeCompare(b.name) : a.src === "sketches" ? -1 : 1));
  for (const f of order) {
    const b = document.createElement("button");
    b.textContent = f.name;
    b.className = (f.name === current ? "on " : "") + (f.dirty ? "dirty" : "");
    b.innerHTML += `<span class="src">${f.src === "sketches" ? "sketch" : "fw"}</span>`;
    b.onclick = () => openFile(f.name);
    tabs.appendChild(b);
    if (f.name === current) b.scrollIntoView({ inline: "nearest", block: "nearest" });
  }
  // The run menu lists only modules that show something (start themselves, or have an entry point
  // the server knows); lcd, keccak and the like are libraries.
  const sel = $("#main");
  sel.innerHTML = "";
  const runnable = order.filter((f) => f.name.endsWith(".py") && (f.runnable || f.name === main + ".py"));
  for (const f of runnable) { const o = document.createElement("option"); o.value = f.name.slice(0, -3); o.textContent = f.name.slice(0, -3) + (f.src === "sketches" ? "" : "  (fw)"); sel.appendChild(o); }
  if (!runnable.some((f) => f.name === main + ".py") && runnable.length) main = runnable[0].name.slice(0, -3);
  sel.value = main;
}
function setMain(name) { main = name; localStorage.setItem("emu.main", main); renderTabs(); }

async function saveFile(name) {
  const f = files.get(name);
  if (!f || f.text === undefined || !f.dirty) return;
  await fetch("/ctl/file", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, content: f.text, src: f.src }) });
  f.dirty = false;
  if (worker) await ask({ type: "write", name, data: f.text });
  renderTabs();
}
async function saveAll() { for (const [n, f] of files) if (f.dirty) await saveFile(n); }

$("#newfile").onclick = async () => {
  let name = prompt("new sketch name (module name, no spaces)", "sketch");
  if (!name) return;
  name = name.replace(/\.py$/, "").replace(/[^\w-]/g, "_") + ".py";
  if (!files.has(name)) files.set(name, { name, src: "sketches", text: TEMPLATE.replace(/NAME/g, name.slice(0, -3)), dirty: true });
  openFile(name);
  await saveFile(name);
};

const TEMPLATE = `# NAME: a sketch for the Pico wallet. Run: tools/emu run NAME
import time
from machine import Timer
from lcd import LCD, Keys, color, BLACK, WHITE, GREEN, RED, YELLOW, GREY

lcd = LCD()
keys = Keys()
timer = None
x, y, dx, dy = 100, 100, 3, 2


def draw():
    lcd.fill(BLACK)
    lcd.fill_rect(x, y, 40, 40, GREEN)
    lcd.center_text("NAME", 8, YELLOW, 2)
    lcd.center_text("X quits", 224, GREY)
    lcd.show()


def tick(_):
    global x, y, dx, dy
    for k in keys.pressed():          # names: A B X Y up down left right press
        if k == "X":
            stop(); return
    x += dx; y += dy
    if x < 0 or x > 200: dx = -dx
    if y < 20 or y > 200: dy = -dy
    draw()


def start():
    global timer
    draw()
    timer = Timer(period=40, mode=Timer.PERIODIC, callback=tick)


def stop():
    if timer:
        timer.deinit()


start()
`;

// ---- console -------------------------------------------------------------------------------
function appendLog(line, cls) {
  log.push(line);
  if (log.length > 2000) log.shift();
  const d = document.createElement("div");
  if (cls) d.className = cls; else if (/^(Traceback|  File |\w+Error:)/.test(line)) d.className = "err";
  d.textContent = line;
  const el = $("#log");
  el.appendChild(d);
  while (el.childElementCount > 600) el.firstChild.remove();
  el.scrollTop = el.scrollHeight;
  if (execCapture) execCapture.push(line);
}
const hist = []; let hi = 0;
$("#repl").addEventListener("keydown", async (e) => {
  const inp = e.target;
  if (e.key === "Enter" && inp.value.trim()) {
    const code = inp.value; inp.value = ""; hist.push(code); hi = hist.length;
    appendLog(">>> " + code, "in");
    await exec(code);
  } else if (e.key === "ArrowUp") { if (hi > 0) inp.value = hist[--hi]; e.preventDefault(); }
  else if (e.key === "ArrowDown") { inp.value = hi < hist.length - 1 ? hist[++hi] : (hi = hist.length, ""); e.preventDefault(); }
});

// ---- device ------------------------------------------------------------------------------
function ask(msg) { return askWith(msg).promise; }
function askWith(msg) {
  const id = ++seq;
  const promise = new Promise((resolve, reject) => { waiting.set(id, { resolve, reject }); worker.postMessage({ ...msg, id }); });
  return { id, promise };
}
const started = new Map();   // id -> resolve, fired when the worker enters run() for that request

async function exec(code) {
  if (!worker) return ["device is not running"];
  execCapture = [];
  try { await ask({ type: "exec", code }); } catch (e) { appendLog(String(e), "err"); }
  const out = execCapture; execCapture = null;
  return out;
}

async function reboot(runName) {
  if (worker) { worker.terminate(); worker = null; for (const w of waiting.values()) w.reject(new Error("rebooted")); waiting.clear(); }
  for (const i of KEY_ORDER.keys()) keys[i] = 0;
  if (serialCtl) { Atomics.store(serialCtl, 0, 0); Atomics.store(serialCtl, 1, 0); }
  setConn("booting", "");
  const b = await (await fetch("/ctl/boot")).json();
  mark("boot payload");
  for (const f of b.files) {
    const old = files.get(f.name);
    if (old && old.dirty) continue;
    files.set(f.name, { ...f, dirty: false });
  }
  for (const n of [...files.keys()]) if (!b.files.some((f) => f.name === n) && !files.get(n).dirty) files.delete(n);
  if (!current || !files.has(current)) openFile(files.has(runName + ".py") ? runName + ".py" : [...files.keys()][0]);
  else { const f = files.get(current); if (!f.dirty && f.text !== undefined && f.text !== getSrc()) setSrc(f.text); }
  renderTabs();
  const payload = b.files.map((f) => { const cur = files.get(f.name); return cur && cur.text !== undefined ? { name: f.name, text: cur.text } : f; });
  worker = new Worker("/web/worker.js", { type: "module" });
  worker.onmessage = onMsg;
  worker.onerror = (e) => appendLog("worker: " + e.message, "err");
  mark("worker created");
  const entry = (files.get(runName + ".py") || {}).entry || "";
  appendLog(`── boot, import ${runName}${entry ? "; " + entry : ""} ──`, "sys");
  frames = 0;
  execCapture = [];
  // A module with a `while True` (demo) never returns from import. The worker says "started"
  // when it enters run(); if "done" has not come 2.5 s after that, call it running and move on.
  const { id, promise } = askWith({ type: "boot", keys: sab || keys.buffer, serial: serialSab, files: payload, shims: b.shims, appUrl: b.appUrl, run: runName, entry });
  const startedP = new Promise((r) => started.set(id, r));
  let how = null;
  const done = promise.then(() => (how = "done"), (e) => { appendLog(String(e), "err"); how = "error"; });
  await Promise.race([done, startedP.then(() => sleep(2500))]);
  started.delete(id);
  const busy = how === null;
  const out = execCapture; execCapture = null;
  running = runName;
  const failed = out.some((l) => /^Traceback/.test(l));
  setConn(failed ? "error in " + runName : "running " + runName + (busy ? " (busy loop)" : ""), failed ? "bad" : "ok");
  return { ok: !failed, busy, lines: out };
}

function onMsg(e) {
  const m = e.data;
  if (m.type === "frame") {
    const b = new Uint8Array(m.buf), d = img.data;
    for (let i = 0, o = 0; i < b.length; i += 2, o += 4) {
      const c = (b[i] << 8) | b[i + 1];
      d[o] = (c >> 8) & 0xf8; d[o + 1] = (c >> 3) & 0xfc; d[o + 2] = (c << 3) & 0xf8; d[o + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);
    fctx.putImageData(img, 0, 0);
    frames = m.frames; fpsCount++;
    if (device3d) device3d.updateScreen();
  } else if (m.type === "out") appendLog(m.line);
  else if (m.type === "mark") console.log(m.text);
  else if (m.type === "pwm") { if (m.pin === 13 && device3d) device3d.setBacklight(m.frac); }
  else if (m.type === "pin") { if (m.pin === "LED" && device3d) device3d.setLed(!!m.v); }
  else if (m.type === "reset") { appendLog("machine.reset()", "sys"); reboot(main); }
  else if (m.type === "started") { const r = started.get(m.id); if (r) r(); }
  else if (m.type === "done") { const w = waiting.get(m.id); if (w) { waiting.delete(m.id); m.error ? w.reject(new Error(m.error)) : w.resolve(); } }
}

function setConn(text, cls) { const c = $("#conn"); c.textContent = text; c.className = cls; }
setInterval(() => { fps = fpsCount; fpsCount = 0; $("#fps").textContent = fps + " fps"; $("#frames").textContent = frames + " frames"; }, 1000);

// ▶ run and ↻ reset run the module picked in the menu. Cmd/Ctrl+Enter runs the file in the editor
// and makes it the picked module when it is runnable. Picking in the menu only selects (and opens
// the file); nothing runs until ▶.
async function runMain() { await saveAll(); await reboot(main); }
async function runFile() {
  await saveAll();
  const name = current && current.endsWith(".py") ? current.slice(0, -3) : main;
  const f = files.get(name + ".py");
  if (f && f.runnable) setMain(name);
  await reboot(name);
}
$("#run").onclick = runMain;
$("#reset").onclick = () => reboot(main);
$("#main").onchange = (e) => { setMain(e.target.value); if (files.has(main + ".py")) openFile(main + ".py"); };

// Boards on USB: the server lists serial ports (MicroPython) and bootloader drives (BOOTSEL held
// while plugging in) every 3 s. ⇪ sends the picked module to the picked board; for a bootloader
// board the same button flashes MicroPython instead.
let devices = [];
const devSel = $("#device");
function pickedDevice() { return devices.find((d) => (d.port || d.path) === devSel.value) || null; }
async function pollDevices() {
  try { devices = (await (await fetch("/ctl/devices")).json()).devices; } catch { devices = []; }
  const was = devSel.value;
  devSel.innerHTML = "";
  for (const d of devices) { const o = document.createElement("option"); o.value = d.port || d.path; o.textContent = d.label; devSel.appendChild(o); }
  if (!devices.length) { const o = document.createElement("option"); o.value = ""; o.textContent = "no board on USB"; devSel.appendChild(o); }
  if (devices.some((d) => (d.port || d.path) === was)) devSel.value = was;
  const d = pickedDevice(), b = $("#ship");
  b.classList.toggle("off", !d);
  const needsMp = d && (d.kind === "bootsel" || d.mp === false);
  b.textContent = needsMp ? "⚡ install MicroPython" : "⇪ send to Pico";
  b.disabled = !!(d && d.kind === "serial" && d.mp === null);
  b.title = !d ? "plug a Pico into this Mac"
    : d.kind === "bootsel" ? `put MicroPython on the board at ${d.path}`
    : d.mp === false ? `this board runs something else; reboot it into its bootloader and put MicroPython on it`
    : d.mp === null ? "asking the board what it is…" : `copy ${main}.py to ${d.port} and import it`;
}
pollDevices(); setInterval(pollDevices, 3000);
try { $("#boot").checked = localStorage.getItem("emu.boot") === "1"; } catch {}
$("#boot").onchange = () => localStorage.setItem("emu.boot", $("#boot").checked ? "1" : "0");
devSel.onchange = pollDevices;
$("#ship").onclick = async () => {
  const d = pickedDevice();
  if (!d) { appendLog("no board on USB", "err"); return; }
  const b = $("#ship"); b.disabled = true;
  try {
    if (d.kind === "bootsel" || d.mp === false) {
      const wifi = confirm("Is this a Pico W / Pico 2 W (has WiFi)?\n\nOK = WiFi build, Cancel = plain build");
      appendLog(`── install MicroPython (${wifi ? "WiFi" : "plain"} build) on ${d.port || d.path} ──`, "sys");
      const r = await (await fetch("/ctl/flash", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: d.path, port: d.port, wifi }) })).json();
      appendLog(r.error ? r.error : `installed ${r.file}; ${r.note}`, r.error ? "err" : "sys");
    } else {
      await saveAll();
      appendLog(`── send ${main} to ${d.port} ──`, "sys");
      const r = await (await fetch("/ctl/ship", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: main, port: d.port, boot: $("#boot").checked }) })).json();
      for (const l of r.lines || []) appendLog(l);
      if (r.error) appendLog(r.error, "err");
      else appendLog(`${r.ok ? "running" : "failed"} ${main} on ${r.port}${r.blocking ? " (busy loop, left running)" : ""}${r.copiedLcd ? "; lcd.py copied too" : ""}`, r.ok ? "sys" : "err");
    }
  } catch (e) { appendLog("ship: " + e.message, "err"); }
  b.disabled = false;
  pollDevices();
};

$("#shot").onclick = () => { const a = document.createElement("a"); a.href = shotDataURL(); a.download = `pico-${Date.now()}.png`; a.click(); };
function shotDataURL() {
  const c = document.createElement("canvas"); c.width = c.height = 480;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(screen, 0, 0, 480, 480);
  return c.toDataURL("image/png");
}

// ---- keys --------------------------------------------------------------------------------
function setKey(name, down) {
  const i = KEY_ORDER.indexOf(name);
  if (i < 0) return;
  if (sab) Atomics.store(keys, i, down ? 1 : 0);
  else { keys[i] = down ? 1 : 0; if (worker) worker.postMessage({ type: "keys", state: Array.from(keys) }); }
  if (device3d) device3d.setKey(name, down);
  for (const b of document.querySelectorAll(`#flat [data-key="${name}"]`)) b.classList.toggle("down", down);
}
const isTyping = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.closest?.(".CodeMirror"));
window.addEventListener("keydown", (e) => {
  if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = keyOf(e);
  if (!k) return;
  e.preventDefault();
  if (!e.repeat) setKey(k, true);
});
window.addEventListener("keyup", (e) => { const k = keyOf(e); if (k) setKey(k, false); });
window.addEventListener("blur", () => { for (const k of KEY_ORDER) setKey(k, false); });
for (const b of document.querySelectorAll("#flat [data-key]")) {
  const k = b.dataset.key;
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); setKey(k, true); $("#right").focus({ preventScroll: true }); });
  b.addEventListener("pointerup", () => setKey(k, false));
  b.addEventListener("pointerleave", () => setKey(k, false));
}
$("#stage").addEventListener("pointerdown", () => $("#right").focus({ preventScroll: true }));

// ---- views -------------------------------------------------------------------------------
function setView(v) {
  localStorage.setItem("emu.view", v);
  $("#stage").hidden = v !== "3d"; $("#flat").hidden = v !== "flat";
  $("#view3d").classList.toggle("on", v === "3d"); $("#viewflat").classList.toggle("on", v === "flat");
  if (device3d) device3d.resize();
}
$("#view3d").onclick = () => setView("3d");
$("#viewflat").onclick = () => setView("flat");

// ---- control channel for tools/emu -------------------------------------------------------
const handlers = {
  async run({ name }) { const r = await reboot(name); const f = files.get(name + ".py"); if (f) { openFile(name + ".py"); if (f.runnable) setMain(name); } return r; },
  async exec({ code }) { appendLog(">>> " + code, "in"); return { ok: true, lines: await exec(code) }; },
  async key({ name, ms }) { setKey(name, true); await sleep(ms || 80); setKey(name, false); await sleep(60); return { ok: true }; },
  async keys({ names }) { for (const n of names) { const [k, ms] = n.split(":"); setKey(k, true); await sleep(+(ms || 80)); setKey(k, false); await sleep(120); } return { ok: true }; },
  async shot() { return { ok: true, png: shotDataURL() }; },
  async log({ n }) { return { ok: true, lines: log.slice(-(n || 40)) }; },
  async state() { return { ok: true, main, running, frames, fps, sharedKeys: !!sab, view: localStorage.getItem("emu.view") || "3d", files: [...files.keys()] }; },
  async reset() { return reboot(main); },
  async main({ name }) { setMain(name); return { ok: true }; },
  async send({ line, ms }) { const at = log.length; sendLine(line); await sleep(ms || 600); return { ok: true, lines: log.slice(at + 1) }; },
};
const es = new EventSource("/ctl/events");
es.onmessage = async (e) => {
  const c = JSON.parse(e.data);
  let result;
  try { result = handlers[c.cmd] ? await handlers[c.cmd](c) : { ok: false, error: "unknown cmd " + c.cmd }; }
  catch (err) { result = { ok: false, error: String(err && err.message || err) }; }
  fetch("/ctl/reply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: c.id, result }) });
};

// ---- go ----------------------------------------------------------------------------------
const T0 = performance.now();
const mark = (what) => console.log(`[emu] ${what} at ${Math.round(performance.now() - T0)} ms`);
setView(localStorage.getItem("emu.view") || "3d");
if (!sab) appendLog("no SharedArrayBuffer: keys reach the device only while it is idle (busy loops will not see them)", "err");
const booting = reboot(main).then(() => mark("booted"));
try {
  device3d = await createDevice3D($("#stage"), screen, { onKey: setKey, onGrab: () => $("#right").focus({ preventScroll: true }) });
  device3d.updateScreen();
  mark("3d ready");
} catch (e) {
  appendLog("3D view unavailable (" + (e.message || e) + "), using flat view", "err");
  setView("flat");
}
await booting;
