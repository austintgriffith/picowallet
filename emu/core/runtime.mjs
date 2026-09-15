// The emulated Pico: MicroPython (WebAssembly) plus the JS half of the machine/network/requests
// shims. Runs the same way in a browser Worker (web/worker.js) and in node (headless.mjs).
//
// createDevice(opts) -> { mp, run(name), exec(code), writeFile(name, data), listFiles(), dispose() }
//   opts.loadMicroPython  the loader from micropython.mjs
//   opts.url              where the .wasm lives (browser only)
//   opts.keys             Int32Array, one slot per KEY_ORDER entry, 1 = held. Shared with the UI.
//   opts.files            { name: string | Uint8Array } written to the root of the flash
//   opts.appUrl           what secrets.APP_URL should be (the wallet app)
//   opts.http(method, url, body, headersJson, timeoutMs) -> { status, text, headers }  (sync)
//   opts.onFrame(rgb565BigEndian Uint8Array 240*240*2)   after every full lcd.show()
//   opts.onStdout(line)   one line of Python output, no newline
//   opts.onPwm(pin, frac) backlight and any other PWM
//   opts.onPin(pin, v)    output pin writes (LED)
//   opts.onReset()        machine.reset() was called: the host should rebuild the device
//   opts.heapsize         MicroPython heap in bytes (default ~ a Pico 2 W)

export const KEY_ORDER = ["A", "B", "X", "Y", "up", "down", "left", "right", "press"];
// GPIO -> key, from firmware/lcd.py
export const KEY_PINS = { 15: "A", 17: "B", 19: "X", 21: "Y", 2: "up", 18: "down", 16: "left", 20: "right", 3: "press" };
export const W = 240, H = 240, FRAME_BYTES = W * H * 2;
export const DEFAULT_HEAP = 448 * 1024;

const SHIMS = ["machine", "network", "requests", "socket", "rp2"];

export async function createDevice(opts) {
  const keys = opts.keys;
  const stdout = opts.onStdout || (() => {});
  // Serial input, the Pico's USB stdin. opts.stdin (a byte getter, null when empty) lets a host
  // feed bytes from another thread; without it writeStdin() queues bytes here.
  const inq = [];
  const stdin = opts.stdin || (() => (inq.length ? inq.shift() : null));
  function writeStdin(text) { for (const b of new TextEncoder().encode(text)) inq.push(b); }
  const frame = new Uint8Array(FRAME_BYTES);
  const pinOut = new Map();
  const timers = new Map();
  let timerSeq = 0;
  let disposed = false;
  let M = null; // emscripten module, for getValue

  // ---- display: ST7789 command stream on SPI1, DC on GP8 ---------------------------------
  const lcd = { cmd: 0, xs: 0, xe: W - 1, ys: 0, ye: H - 1, cur: 0, args: [] };
  let frames = 0;
  // SPI costs real time on the Pico: 115200 bytes per frame. rp2 clocks the peripherals at 48 MHz
  // unless machine.freq(cpu, peri) raises it, which caps SPI at 24 MHz (38 ms a frame).
  const clock = { periHz: 48e6, spiBaud: { 0: 1e6, 1: 1e6 } };
  const now = () => (globalThis.performance ? performance.now() : Date.now());
  function spiCost(id, n) {
    const hz = Math.min(clock.spiBaud[id] || 1e6, clock.periHz / 2);
    const ms = (n * 8) / hz * 1000;
    if (ms < 0.05) return;
    const t0 = now();
    while (now() - t0 < ms) { /* the bus is busy, like on the board */ }
  }

  function readBytes(addr, n) {
    const out = new Uint8Array(n);
    let i = 0;
    if ((addr & 3) === 0) {
      for (; i + 4 <= n; i += 4) {
        const v = M.getValue(addr + i, "i32");
        out[i] = v & 255; out[i + 1] = (v >> 8) & 255; out[i + 2] = (v >> 16) & 255; out[i + 3] = (v >>> 24) & 255;
      }
    }
    for (; i < n; i++) out[i] = M.getValue(addr + i, "i8") & 255;
    return out;
  }

  function spiWrite(id, addr, n) {
    spiCost(id, n);
    const dc = pinOut.get(8);
    if (dc === 0) {
      lcd.cmd = M.getValue(addr, "i8") & 255;
      lcd.args = [];
      if (lcd.cmd === 0x2c) lcd.cur = 0;
      return;
    }
    if (lcd.cmd === 0x2a || lcd.cmd === 0x2b) {
      const b = readBytes(addr, n);
      for (const x of b) lcd.args.push(x);
      if (lcd.args.length >= 4) {
        const s = (lcd.args[0] << 8) | lcd.args[1], e = (lcd.args[2] << 8) | lcd.args[3];
        if (lcd.cmd === 0x2a) { lcd.xs = s; lcd.xe = e; } else { lcd.ys = s; lcd.ye = e; }
      }
      return;
    }
    if (lcd.cmd !== 0x2c) return;
    const full = lcd.xs === 0 && lcd.ys === 0 && lcd.xe === W - 1 && lcd.ye === H - 1;
    if (full && lcd.cur === 0 && n === FRAME_BYTES) {
      frame.set(readBytes(addr, n));
      lcd.cur = n;
    } else {
      const b = readBytes(addr, n);
      const ww = lcd.xe - lcd.xs + 1;
      for (let i = 0; i + 1 < b.length; i += 2) {
        const p = lcd.cur >> 1;
        const x = lcd.xs + (p % ww), y = lcd.ys + Math.floor(p / ww);
        if (x < W && y < H) { const o = (y * W + x) * 2; frame[o] = b[i]; frame[o + 1] = b[i + 1]; }
        lcd.cur += 2;
      }
    }
    frames++;
    if (opts.onFrame) opts.onFrame(frame);
  }

  // ---- the _emu bridge module ------------------------------------------------------------
  const irqs = new Map();
  let irqPoll = null;
  const bridge = {
    pin_read(id) {
      const k = KEY_PINS[id];
      if (k !== undefined) return keys[KEY_ORDER.indexOf(k)] ? 0 : 1;
      const v = pinOut.get(id);
      return v === undefined ? 1 : v;
    },
    pin_write(id, v) {
      pinOut.set(id, v);
      if (opts.onPin) opts.onPin(id, v);
    },
    pin_irq(id, handler, trigger, pin) {
      if (handler == null) { irqs.delete(id); return; }
      irqs.set(id, { handler, trigger, pin, last: bridge.pin_read(id) });
      if (!irqPoll) irqPoll = setInterval(pollIrqs, 5);
    },
    spi_write: spiWrite,
    spi_init(id, baud) { clock.spiBaud[id] = baud; },
    set_freq(cpu, peri) { if (peri) clock.periHz = peri; return 150e6; },
    pwm(id, frac) { if (opts.onPwm) opts.onPwm(id, frac); },
    adc_read(id) { return id === 29 ? 42000 : (id === 4 ? 27000 : 0); },
    timer_start(cb, ms, periodic, timerObj) {
      const id = ++timerSeq;
      const fire = () => {
        if (disposed) return;
        if (!periodic) timers.delete(id);
        try { cb(timerObj); } catch (e) { stdout(pyError(e)); }
      };
      const h = periodic ? setInterval(fire, ms) : setTimeout(fire, ms);
      timers.set(id, { h, periodic });
      return id;
    },
    timer_stop(id) {
      const t = timers.get(id);
      if (!t) return;
      (t.periodic ? clearInterval : clearTimeout)(t.h);
      timers.delete(id);
    },
    http(method, url, body, headersJson, timeoutMs) {
      if (!opts.http) return JSON.stringify({ status: -1, text: "no network in this host" });
      try {
        const r = opts.http(method, url, body, JSON.parse(headersJson || "{}"), timeoutMs);
        return JSON.stringify({ status: r.status, text: r.text, headers: r.headers || {} });
      } catch (e) {
        return JSON.stringify({ status: -1, text: String(e && e.message || e) });
      }
    },
    random(n) {
      const b = new Uint8Array(n);
      if (globalThis.crypto && crypto.getRandomValues) crypto.getRandomValues(b);
      else for (let i = 0; i < n; i++) b[i] = (Math.random() * 256) | 0;
      return Array.from(b);
    },
    reset() { if (opts.onReset) setTimeout(() => opts.onReset(), 0); },
    frames() { return frames; },
  };

  function pollIrqs() {
    for (const [id, s] of irqs) {
      const v = bridge.pin_read(id);
      if (v === s.last) continue;
      const rising = v === 1;
      s.last = v;
      if ((rising && (s.trigger & 1)) || (!rising && (s.trigger & 2))) {
        try { s.handler(s.pin); } catch (e) { stdout(pyError(e)); }
      }
    }
  }

  // ---- boot ------------------------------------------------------------------------------
  const mark = opts.mark || (() => {});
  mark("loading micropython");
  const mp = await opts.loadMicroPython({
    url: opts.url,
    heapsize: opts.heapsize || DEFAULT_HEAP,
    stdout: (line) => stdout(line),
    stdin,
    linebuffer: true,
  });
  M = mp._module;
  mark("micropython loaded");
  mp.registerJsModule("_emu", bridge);
  const FS = mp.FS;
  try { FS.mkdir("/lib"); } catch (e) {}
  for (const name of SHIMS) FS.writeFile(`/lib/${name}.py`, opts.shims[name]);
  FS.writeFile("/lib/_bootstrap.py", opts.shims._bootstrap);
  for (const [name, data] of Object.entries(opts.files || {})) writeFile(name, data);
  writeFile("secrets.py", secretsPy(opts.appUrl || "http://localhost:3001"));
  mark("flash written");
  mp.runPython("import _bootstrap");
  mark("bootstrapped");

  // .py files get one source tweak: the compiler refuses @micropython.viper/@micropython.native
  // when there is no native emitter, so they become the identity decorator from _bootstrap.
  function writeFile(name, data) {
    if (typeof data === "string" && name.endsWith(".py")) {
      data = data.replace(/^(\s*)@micropython\.(viper|native)\b/gm, "$1@__emu_plain__");
    }
    FS.writeFile("/" + name, typeof data === "string" ? data : new Uint8Array(data));
  }

  function listFiles() {
    return FS.readdir("/").filter((n) => !["." , "..", "tmp", "home", "dev", "proc", "lib"].includes(n));
  }

  function pyError(e) {
    const s = String(e && e.message || e);
    return s.replace(/^PythonError:\s*/, "").trimEnd();
  }

  // Run a module fresh, the way `import name` at the Pico REPL does after a reset. `entry` is an
  // optional line to run after the import (e.g. "demo.run()") for modules that do not start
  // themselves; the same snippet is what `tools/emu ship` sends to the board.
  function run(name, entry) {
    mp.runPython(runCode(name, entry));
  }

  // One REPL line: expressions echo their value like the prompt does.
  function exec(code) {
    const wrapped = `import sys\ntry:\n    exec(compile(${JSON.stringify(code)}, "<stdin>", "single"))\nexcept Exception as _e:\n    sys.print_exception(_e)\n`;
    mp.runPython(wrapped);
  }

  function dispose() {
    disposed = true;
    for (const t of timers.values()) (t.periodic ? clearInterval : clearTimeout)(t.h);
    timers.clear();
    if (irqPoll) clearInterval(irqPoll);
  }

  return { mp, run, exec, writeFile, writeStdin, listFiles, dispose, frame, get frames() { return frames; } };
}

// Python for "import NAME fresh, then ENTRY", with the traceback printed instead of raised.
// `first` lists modules to import before the target: ship passes ["lcd"] when the module draws,
// so the 115 KB framebuffer is allocated before the big module is compiled (RP2040 heap, see lcd.py).
export function runCode(name, entry, first = []) {
  name = name.replace(/\.py$/, "").replace(/^.*\//, "");
  if (!/^[A-Za-z_]\w*$/.test(name)) throw new Error("not a module name: " + name);
  const body = first.map((m) => `    import ${m}\n`).join("") + `    import ${name}\n` + (entry ? `    ${entry}\n` : "");
  const n = JSON.stringify(name);
  // On a board that was not reset, stop the old copy (sketches offer stop()) so its timer does not
  // keep drawing. `import name` at module level, so the name is bound in __main__ for REPL lines.
  const stopOld = `_o = sys.modules.pop(${n}, None)\nif _o and callable(getattr(_o, "stop", None)):\n    try:\n        _o.stop()\n    except Exception:\n        pass\n`;
  return `import sys\n${stopOld}try:\n${body}except Exception as _e:\n    sys.print_exception(_e)\n`;
}

function secretsPy(appUrl) {
  return `# generated by the emulator; the real secrets.py never leaves the Pico
WIFI_SSID = "emulator"
WIFI_PASS = ""
HOSTNAME = "picowallet-emu"
APP_URL = ${JSON.stringify(appUrl)}
DEVICE_NAME = "picowallet-emu"
ENABLE_NETWORK_CONSOLE = False
EXPECTED_CHAIN_ID = None
EXPECTED_VAULT = None
EXPECTED_TOKEN = None
ALLOW_LOCK = False
ALLOW_GENKEY = False
ALLOW_SOFT_KEY = True   # no chip in the emulator: run the wallet on a software key anyway
`;
}

// RGB565 big-endian frame -> RGBA, for canvases and PNGs.
export function frameToRGBA(frame, out) {
  out = out || new Uint8ClampedArray(W * H * 4);
  for (let i = 0, o = 0; i < FRAME_BYTES; i += 2, o += 4) {
    const c = (frame[i] << 8) | frame[i + 1];
    out[o] = (c >> 8) & 0xf8; out[o + 1] = (c >> 3) & 0xfc; out[o + 2] = (c << 3) & 0xf8; out[o + 3] = 255;
  }
  return out;
}
