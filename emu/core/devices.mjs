// Every Pico-like thing on USB, for the page's device picker and `tools/emu devices`.
//   listDevices() -> [{ kind: "serial", port, label, board? } | { kind: "bootsel", path, label, board }]
// serial: /dev/cu.usbmodem* (mac) or /dev/ttyACM* (linux), a board running MicroPython. The first
// time a port is seen its USB info says whether it runs MicroPython (cached); the board itself is
// never interrupted.
// bootsel: a board plugged in with BOOTSEL held mounts as a drive (RPI-RP2 for RP2040, RP2350 for
// Pico 2) with INFO_UF2.TXT; it has no serial port and runs nothing until a .uf2 is copied on.
//   flash(path, { version }) downloads the MicroPython .uf2 for that board and copies it over.
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export const MPREMOTE = [join(homedir(), ".local/bin/mpremote"), "mpremote"].find((p) => !p.includes("/") || existsSync(p));
export const lock = { busy: false };                 // set while ship/identify holds a port
const known = new Map();                              // port -> { label, board } or "pending"
const UF2_DIR = join(homedir(), ".cache", "picowallet-uf2");
export const DEFAULT_MP_VERSION = process.env.MP_VERSION || "1.26.1";   // what the wallet Pico and the emulator run
// bootloader Board-ID -> MicroPython build, [without WiFi, with WiFi]; the drive cannot tell a W apart
const BOARD_UF2 = { "RP2350": ["RPI_PICO2", "RPI_PICO2_W"], "RPI-RP2": ["RPI_PICO", "RPI_PICO_W"] };
// pyserial lives in the mpremote install; used for port info, the 1200-baud bootloader touch, banners
const PY = [join(homedir(), ".local/share/uv/tools/mpremote/bin/python"), dirname(MPREMOTE) + "/python", "python3"].find((p) => !p.includes("/") || existsSync(p));
const USBINFO = join(dirname(fileURLToPath(import.meta.url)), "usbinfo.py");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function serialPorts() {
  return readdirSync("/dev").filter((n) => /^cu\.(usbmodem|usbserial|wchusbserial|SLAB_USBtoUART)|^ttyACM|^ttyUSB/.test(n)).sort().map((n) => join("/dev", n));
}

export function bootselDrives() {
  const roots = ["/Volumes", join("/media", process.env.USER || ""), "/run/media/" + (process.env.USER || "")];
  const out = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const v of readdirSync(root)) {
      const info = join(root, v, "INFO_UF2.TXT");
      try { if (!statSync(info).isFile()) continue; } catch { continue; }
      const t = readFileSync(info, "utf8");
      const board = (t.match(/Board-ID:\s*(\S+)/) || [])[1] || "?";
      const model = (t.match(/Model:\s*(.+)/) || [])[1] || "";
      out.push({ kind: "bootsel", path: join(root, v), board, model: model.trim(), uf2: BOARD_UF2[board] ? BOARD_UF2[board][0] : null,
        label: `${model.trim() || board} in bootloader (${v}) - needs MicroPython` });
    }
  }
  return out;
}

let hadDrive = false;
export function listDevices() {
  const out = [], ports = serialPorts(), drives = bootselDrives();
  // a port name comes back the same after a replug or reflash, so re-ask the board: forget ports that
  // are gone, and forget everything once when a bootloader drive appears (a board is being reflashed
  // and may come back under a name we still have)
  const newDrive = drives.length > 0 && !hadDrive;
  hadDrive = drives.length > 0;
  for (const port of [...known.keys()]) if (newDrive || !ports.includes(port)) known.delete(port);
  for (const port of ports) {
    const k = known.get(port);
    if (!k) { known.set(port, "pending"); identify(port); }
    const short = port.replace(/^\/dev\/(cu\.)?/, "");
    if (!k || k === "pending") { out.push({ kind: "serial", port, board: null, mp: null, label: `${short} (identifying…)` }); continue; }
    out.push({ kind: "serial", port, board: k.board, mp: k.mp, product: k.product, banner: k.banner,
      label: k.mp ? `${k.board} · ${short}` : `${k.product || "board"}${k.manufacturer ? " (" + k.manufacturer + ")" : ""} · ${short} - not MicroPython${k.banner ? ", prints \"" + k.banner.split("\n")[0].slice(0, 24) + "\"" : ""}` });
  }
  return out.concat(drives);
}

export function forget(port) { known.delete(port); }

function run(cmd, args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", done = false;
    const finish = (code, killed) => { if (done) return; done = true; resolve({ code, killed, out }); };
    child.stdout.on("data", (d) => (out += d)); child.stderr.on("data", (d) => (out += d));
    child.on("error", (e) => { out += String(e); finish(1, false); });
    child.on("exit", (c) => finish(c, false));
    setTimeout(() => { if (!done) { child.kill("SIGKILL"); finish(null, true); } }, timeoutMs);
  });
}

async function portInfo(port) {
  try { return JSON.parse((await run(PY, [USBINFO, "list"], 5000)).out).find((p) => p.port === port) || {}; } catch { return {}; }
}

async function identify(port) {
  for (let i = 0; i < 20 && lock.busy; i++) await sleep(500);
  if (lock.busy) { known.delete(port); return; }
  lock.busy = true;
  try {
    // MicroPython says so in its USB descriptor. Only ask the USB info: talking to the board (mpremote)
    // would Ctrl-C whatever it is running, like a wallet halfway through booting.
    const info = await portInfo(port);
    const mp = info.manufacturer === "MicroPython";
    const banner = mp ? "" : (await run(PY, [USBINFO, "banner", port], 4000)).out.trim();
    if (!serialPorts().includes(port)) known.delete(port);
    else known.set(port, { mp, board: mp ? "MicroPython board" : null, product: info.product, manufacturer: info.manufacturer, banner });
  } finally { lock.busy = false; }
}

// Ask a running board to drop into its UF2 bootloader: machine.bootloader() on MicroPython,
// the 1200-baud touch for Arduino-style firmware. Returns the bootloader drive when it appears.
async function enterBootloader(port) {
  const k = known.get(port);
  if (k && k !== "pending" && k.mp) await run(MPREMOTE, ["connect", port, "resume", "exec", "import machine; machine.bootloader()"], 6000);
  else await run(PY, [USBINFO, "touch", port], 5000);
  for (let i = 0; i < 40; i++) { const d = bootselDrives()[0]; if (d) return d; await sleep(500); }
  return null;
}

// Newest stable MicroPython .uf2 for a board id from micropython.org (cached in ~/.cache).
export async function fetchUf2(uf2Board, version) {
  mkdirSync(UF2_DIR, { recursive: true });
  const want = version && version !== "latest" ? version : null;
  const cached = readdirSync(UF2_DIR).filter((f) => f.startsWith(uf2Board + "-") && f.endsWith(".uf2") && (!want || f.includes(`-v${want}.uf2`))).sort().at(-1);
  if (cached) return join(UF2_DIR, cached);
  const page = await (await fetch(`https://micropython.org/download/${uf2Board}/`)).text();
  const all = [...page.matchAll(new RegExp(`/resources/firmware/${uf2Board}-\\d{8}-v(\\d+\\.\\d+\\.\\d+)\\.uf2`, "g"))];
  if (!all.length) throw new Error("no stable .uf2 found on micropython.org for " + uf2Board);
  const hit = (want && all.find((m) => m[1] === want)) || all[0];
  const url = "https://micropython.org" + hit[0];
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  if (buf.length < 100000) throw new Error("download looks wrong: " + url);
  const file = join(UF2_DIR, hit[0].split("/").pop());
  writeFileSync(file, buf);
  return file;
}

// flash({ path } | { port }, { wifi, version }): a bootloader drive, or a running board (any firmware
// with a USB serial port) that is first sent to its bootloader. Copies the .uf2, waits for the board
// to come back as a serial port.
export async function flash(target, opts = {}) {
  for (let i = 0; i < 20 && lock.busy; i++) await sleep(500);
  lock.busy = true;
  try {
    let d = target.path ? bootselDrives().find((b) => b.path === target.path) : null;
    if (!d && target.port) {
      if (!serialPorts().includes(target.port)) return { ok: false, error: "no board at " + target.port };
      d = await enterBootloader(target.port);
      if (!d) return { ok: false, error: "the board did not enter its bootloader; unplug it, hold BOOTSEL, plug it back in" };
      known.delete(target.port);
    }
    if (!d) return { ok: false, error: "nothing to flash: no bootloader drive and no port given" };
    const builds = BOARD_UF2[d.board];
    if (!builds) return { ok: false, error: `no MicroPython build known for board ${d.board}` };
    const build = builds[opts.wifi ? 1 : 0];
    const file = await fetchUf2(build, opts.version || DEFAULT_MP_VERSION);
    copyFileSync(file, join(d.path, "firmware.uf2"));   // the board reboots and unmounts as soon as it lands
    let port = null;
    for (let i = 0; i < 40 && !port; i++) { await sleep(500); if (!existsSync(d.path)) port = serialPorts().find((p) => !known.has(p) || p === target.port) || null; }
    return { ok: true, file: file.split("/").pop(), board: build, port, note: port ? `board is back as ${port}` : "board reboots; it shows up as a serial port in a few seconds" };
  } finally { lock.busy = false; }
}
