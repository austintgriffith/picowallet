// What the emulated flash holds: firmware/*.py and *.bin (never secrets.py), then emu/sketches/*
// on top. Used by the server (for the browser) and by headless.mjs.
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FIRMWARE = join(ROOT, "firmware");
export const SKETCHES = join(ROOT, "emu", "sketches");
export const SHIMS_DIR = join(ROOT, "emu", "core", "shims");
const SKIP = new Set(["secrets.py", "secrets.example.py"]);

export function readShims() {
  const out = {};
  for (const f of readdirSync(SHIMS_DIR)) if (f.endsWith(".py")) out[f.slice(0, -3)] = readFileSync(join(SHIMS_DIR, f), "utf8");
  return out;
}

// [{ name, src: 'firmware'|'sketches', size, mtime }]
export function listWorkspace() {
  const files = new Map();
  for (const [dir, src] of [[FIRMWARE, "firmware"], [SKETCHES, "sketches"]]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (SKIP.has(f) || f.startsWith(".") || !(f.endsWith(".py") || f.endsWith(".bin") || f.endsWith(".pv") || f.endsWith(".txt") || f.endsWith(".json"))) continue;
      const st = statSync(join(dir, f));
      if (!st.isFile()) continue;
      files.set(f, { name: f, src, size: st.size, mtime: st.mtimeMs });
    }
  }
  return [...files.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function readWorkspaceFile(name) {
  const entry = listWorkspace().find((f) => f.name === name);
  if (!entry) return null;
  const buf = readFileSync(join(entry.src === "firmware" ? FIRMWARE : SKETCHES, name));
  return { ...entry, data: buf };
}

// { name: string|Uint8Array }
export function readWorkspace() {
  const out = {};
  for (const f of listWorkspace()) {
    const { data } = readWorkspaceFile(f.name);
    out[f.name] = f.name.endsWith(".py") ? data.toString("utf8") : new Uint8Array(data);
  }
  return out;
}

// What `run NAME` does after `import NAME`. Sketches and most firmware start themselves at import
// (a `start()` call at the bottom); a few firmware modules only define functions, so the emulator
// calls their entry point. Library modules (lcd, keccak, ...) have nothing to show and are not
// offered in the run menu.
export const ENTRY = { demo: "demo.run()", wallet: "wallet.start()", usbwallet: "usbwallet.start()" };
export function entryFor(name) { return ENTRY[name] || ""; }
export function isRunnable(name, text) {
  if (name === "main" || ENTRY[name]) return true;
  return /^(start|run|main)\(\)\s*$/m.test(text || "");
}

export function writeWorkspaceFile(name, content, src) {
  name = basename(name);
  if (!/^[\w.-]+$/.test(name) || SKIP.has(name)) throw new Error("bad file name");
  const existing = listWorkspace().find((f) => f.name === name);
  const dir = (src || (existing && existing.src) || "sketches") === "firmware" ? FIRMWARE : SKETCHES;
  writeFileSync(join(dir, name), content);
  return { name, src: dir === FIRMWARE ? "firmware" : "sketches" };
}
