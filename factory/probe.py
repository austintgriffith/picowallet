# Factory test, board side. The page (factory/index.html) pastes this into the raw REPL, then calls
# info(), chip(), screen() and keys() one at a time. Everything prints one line per result:
# "@<tag> <json>". Self-contained, so it works on a board with only MicroPython on it.
import sys, os, gc, time, json, machine, framebuf
from machine import Pin, I2C, SPI

SDA, SCL = 4, 5
KEYS = {"up": 2, "down": 18, "left": 16, "right": 20, "press": 3, "A": 15, "B": 17, "X": 19, "Y": 21}


def out(tag, obj):
    print("@" + tag, json.dumps(obj))


# --- board -----------------------------------------------------------------
def info():
    m = sys.implementation._machine
    gc.collect()
    ram = gc.mem_free() + gc.mem_alloc()
    fs = os.statvfs("/")
    d = {
        "machine": m,
        "micropython": os.uname().release,
        "cpu": "RP2350" if "RP2350" in m else "RP2040" if "RP2040" in m else "?",
        "uid": machine.unique_id().hex(),
        "mhz": machine.freq() // 1_000_000,
        "heap": ram,
        "fs": fs[0] * fs[2],
        "files": sorted(os.listdir()),
        "wifi": None,
    }
    try:
        import network
        w = network.WLAN(network.STA_IF)
        w.active(True)
        d["wifi"] = ":".join("%02x" % b for b in w.config("mac"))
        w.active(False)
    except Exception as e:
        d["wifiError"] = str(e) or type(e).__name__
    out("info", d)


# --- secure chip -----------------------------------------------------------
def _crc_atecc(data):
    crc = 0
    for b in data:
        for s in range(8):
            db, cb = (b >> s) & 1, (crc >> 15) & 1
            crc = (crc << 1) & 0xFFFF
            if db != cb:
                crc ^= 0x8005
    return bytes([crc & 0xFF, crc >> 8])


def _atecc(i2c):
    """ATECC608 at 0x60: wake, read config blocks 0 and 2. None if nothing wakes."""
    def wake():
        for _ in range(3):
            try:
                i2c.writeto(0, b"\x00")
            except OSError:
                pass
            time.sleep_ms(3)
            for _ in range(3):
                try:
                    if i2c.readfrom(0x60, 4) == b"\x04\x11\x33\x43":
                        return True
                except OSError:
                    time.sleep_ms(2)
            try:
                i2c.writeto(0x60, b"\x01")
            except OSError:
                pass
            time.sleep_ms(10)
        return False

    def read(block):
        body = bytes([7, 0x02, 0x80, (block << 3) & 0xFF, 0])
        i2c.writeto(0x60, b"\x03" + body + _crc_atecc(body))
        time.sleep_ms(3)
        for _ in range(100):
            try:
                r = i2c.readfrom(0x60, 35)
                break
            except OSError:
                time.sleep_ms(3)
        else:
            raise OSError("ATECC read timeout")
        if r[0] != 35 or _crc_atecc(r[:33]) != r[33:35]:
            raise OSError("ATECC bad reply " + r[:8].hex())
        return r[1:33]

    if not wake():
        return None
    try:
        c0, c2 = read(0), read(2)
    finally:
        try:
            i2c.writeto(0x60, b"\x01")
        except OSError:
            pass
    return {
        "type": "ATECC608",
        "serial": (c0[0:4] + c0[8:13]).hex(),
        "revision": c0[4:8].hex(),
        "configLocked": c2[87 - 64] == 0,
        "dataLocked": c2[86 - 64] == 0,
    }


def _tm_retry(fn):
    for _ in range(200):
        try:
            r = fn()
            time.sleep_us(100)
            return r
        except OSError:
            time.sleep_ms(1)
    raise OSError("Trust M not acked")


def _trustm(i2c):
    """OPTIGA Trust M at 0x30 (NACKs while asleep; retry). Reads I2C_STATE and the coprocessor UID."""
    w = lambda d: _tm_retry(lambda: i2c.writeto(0x30, d))
    rd = lambda n: _tm_retry(lambda: i2c.readfrom(0x30, n))
    reg = lambda a, n: (w(bytes([a])), rd(n))[1]
    try:
        reg(0x82, 4)
    except OSError:
        return None
    d = {"type": "OPTIGA Trust M"}
    try:
        w(b"\x88\x00\x00")                      # soft reset
        time.sleep_ms(25)
        d["state"] = reg(0x82, 4).hex()

        def frame():
            while True:
                t = time.ticks_ms()
                while True:
                    s = reg(0x82, 4)
                    if s[0] & 0x40:
                        break
                    if time.ticks_diff(time.ticks_ms(), t) > 1000:
                        raise OSError("Trust M no response")
                    time.sleep_ms(5)
                f = reg(0x80, (s[2] << 8) | s[3])
                if len(f) > 5 or f[1:3] != b"\x00\x00":
                    return f
        # Datasheet A.2 frames: OpenApplication, then GetDataObject(0xE0C2), each acked.
        w(bytes.fromhex("800300150070000010D2760000044765" "6E41757468417070" "6C041A"))
        frame()
        w(bytes.fromhex("808000000CEC"))
        w(bytes.fromhex("8004000B0001000006E0C200000064F09F"))
        r = frame()
        w(bytes.fromhex("808100005630"))
        if len(r) == 37 and r[4:8] == b"\x00\x00\x00\x1b":
            d["uid"] = r[8:35].hex()
            d["build"] = r[33:35].hex()
    except OSError as e:
        d["uidError"] = str(e)
    return d


def chip():
    # Line check first: the breakout's pull-ups hold SDA and SCL high even against our pull-downs.
    lines = {}
    for name, p in (("sda", SDA), ("scl", SCL)):
        lines[name] = Pin(p, Pin.IN, Pin.PULL_DOWN).value()
        Pin(p, Pin.IN)
    i2c = I2C(0, sda=Pin(SDA), scl=Pin(SCL), freq=100_000)
    found = []
    for probe in (_atecc, _trustm):
        try:
            r = probe(i2c)
        except Exception as e:
            r = {"type": probe.__name__, "error": str(e)}
        if r:
            found.append(r)
    out("chip", {"lines": lines, "found": found, "scan": [hex(a) for a in i2c.scan()]})


# --- screen ----------------------------------------------------------------
DC, CS, SCK, MOSI, RST, BL = 8, 9, 10, 11, 12, 13
_SETUP = (
    (0x36, b"\x70"), (0x3A, b"\x05"), (0xB2, b"\x0c\x0c\x00\x33\x33"), (0xB7, b"\x35"),
    (0xBB, b"\x19"), (0xC0, b"\x2c"), (0xC2, b"\x01"), (0xC3, b"\x12"), (0xC4, b"\x20"),
    (0xC6, b"\x0f"), (0xD0, b"\xa4\xa1"),
    (0xE0, b"\xd0\x04\x0d\x11\x13\x2b\x3f\x54\x4c\x18\x0d\x0b\x1f\x23"),
    (0xE1, b"\xd0\x04\x0c\x11\x13\x2c\x3f\x44\x51\x2f\x1f\x1f\x20\x23"),
    (0x21, b""),
)
_lcd = None


def col(r, g, b):
    c = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
    return ((c & 0xFF) << 8) | (c >> 8)


class _LCD:
    def __init__(self):
        self.cs, self.dc, self.rst = Pin(CS, Pin.OUT, value=1), Pin(DC, Pin.OUT, value=1), Pin(RST, Pin.OUT, value=1)
        self.spi = SPI(1, 31_250_000, polarity=0, phase=0, sck=Pin(SCK), mosi=Pin(MOSI), miso=None)
        Pin(BL, Pin.OUT, value=1)
        self.rst(0); time.sleep_us(20); self.rst(1); time.sleep_ms(120)
        for c, d in _SETUP:
            self.cmd(c, d)
        self.cmd(0x11); time.sleep_ms(120); self.cmd(0x29)

    def cmd(self, c, d=b""):
        self.dc(0); self.cs(0); self.spi.write(bytes([c])); self.cs(1)
        if d:
            self.dc(1); self.cs(0); self.spi.write(d); self.cs(1)

    def blit(self, x, y, w, h, buf):
        x1, y1 = x + w - 1, y + h - 1
        self.cmd(0x2A, bytes([0, x, 0, x1])); self.cmd(0x2B, bytes([0, y, 0, y1])); self.cmd(0x2C)
        self.dc(1); self.cs(0); self.spi.write(buf); self.cs(1)

    def rect(self, x, y, w, h, c, label=None, fg=0xFFFF):
        buf = bytearray(w * h * 2)
        fb = framebuf.FrameBuffer(buf, w, h, framebuf.RGB565)
        fb.fill(c)
        if label:
            fb.text(label, (w - 8 * len(label)) // 2, (h - 8) // 2, fg)
        self.blit(x, y, w, h, buf)

    def fill(self, c):
        for y in range(0, 240, 24):
            self.rect(0, y, 240, 24, c)


def screen(name=None):
    """No name: set the panel up and paint it white. A colour name: fill with that colour."""
    global _lcd
    if _lcd is None:
        _lcd = _LCD()
    c = {"red": col(255, 0, 0), "green": col(0, 255, 0), "blue": col(0, 0, 255),
         "white": 0xFFFF, "black": 0}.get(name or "white", 0xFFFF)
    _lcd.fill(c)
    out("screen", {"ok": True, "color": name or "white"})


# --- keys ------------------------------------------------------------------
# Tiles roughly where the keys sit: joystick on the left, A/B/X/Y down the right edge.
_TILES = {
    "up": (60, 40), "left": (10, 95), "press": (60, 95), "right": (110, 95), "down": (60, 150),
    "A": (180, 10), "B": (180, 70), "X": (180, 130), "Y": (180, 190),
}


def keys(timeout_s=120):
    """Report every key edge until all nine went down and up once, or timeout / Ctrl-C."""
    pins = {k: Pin(p, Pin.IN, Pin.PULL_UP) for k, p in KEYS.items()}
    time.sleep_ms(5)
    stuck = [k for k, p in pins.items() if p.value() == 0]
    out("stuck", stuck)
    lcd = _lcd
    grey, green, amber = col(70, 70, 70), col(0, 170, 60), col(255, 170, 0)
    if lcd:
        lcd.fill(0)
        for k, (x, y) in _TILES.items():
            lcd.rect(x, y, 50 if k not in "ABXY" else 54, 45 if k not in "ABXY" else 40,
                     col(200, 0, 0) if k in stuck else grey, k)
    last = {k: p.value() for k, p in pins.items()}
    done = set()
    t0 = time.ticks_ms()
    while len(done) < len(KEYS) and time.ticks_diff(time.ticks_ms(), t0) < timeout_s * 1000:
        for k, p in pins.items():
            v = p.value()
            if v != last[k]:
                time.sleep_ms(8)                      # debounce: read again
                if p.value() != v:
                    continue
                last[k] = v
                if v == 1 and k not in stuck:
                    done.add(k)
                out("key", {"key": k, "down": v == 0})
                if lcd:
                    x, y = _TILES[k]
                    lcd.rect(x, y, 50 if k not in "ABXY" else 54, 45 if k not in "ABXY" else 40,
                             amber if v == 0 else green if k in done else grey, k, 0 if v == 0 else 0xFFFF)
        time.sleep_ms(2)
    out("keysDone", sorted(done))
