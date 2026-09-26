# Waveshare Pico-LCD-1.3: 240x240 ST7789 over SPI1, plus joystick and A/B/X/Y keys.
# Pins from waveshare.com/wiki/Pico-LCD-1.3.
from machine import Pin, SPI, PWM
import framebuf, os, struct, time

DC, CS, SCK, MOSI, RST, BL = 8, 9, 10, 11, 12, 13
KEYS = {"A": 15, "B": 17, "X": 19, "Y": 21, "up": 2, "down": 18, "left": 16, "right": 20, "press": 3}


def color(r, g, b):
    """RGB888 -> RGB565, byte-swapped because framebuf is little-endian and the panel wants big-endian."""
    c = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
    return ((c & 0xFF) << 8) | (c >> 8)


BLACK, WHITE = color(0, 0, 0), color(255, 255, 255)
RED, GREEN, BLUE = color(255, 0, 0), color(0, 255, 0), color(0, 0, 255)
YELLOW, GREY, DARK = color(255, 220, 0), color(120, 120, 120), color(30, 30, 30)


# The one 115 KB framebuffer, allocated the moment lcd is imported. On an RP2040 board (264 KB
# RAM) a block that big is only available on a fresh heap: after a 20 KB module like wallet.py
# has been compiled the heap is too fragmented and LCD() dies with MemoryError. So anything that
# runs a big module (main.py, the emulator's send) imports lcd first, and LCD() reuses this.
_BUF = bytearray(240 * 240 * 2)
_panel_up = False   # set once the panel is initialised; later LCD()s keep whatever it shows
_on_show = None     # loader.py: called at the app's first show(), i.e. its first screen


def splash(path="logo.bin"):
    """Boot logo, called first thing from boot.py. logo.bin (tools/logo) holds only the box around the
    logo plus the background colour: the framebuffer gets the colour, the box's rows go in at their
    place, then the frame goes to the panel, backlight last so the first thing seen is the logo. It
    stays up until the app's first show(). No file or a bad one, no logo."""
    if _panel_up:
        return
    try:
        with open(path, "rb") as f:
            x, y, w, h, bg = struct.unpack(">5H", f.read(10))
            if x + w > 240 or y + h > 240 or os.stat(path)[6] != 10 + w * h * 2:
                return
            framebuf.FrameBuffer(_BUF, 240, 240, framebuf.RGB565).fill((bg >> 8) | (bg & 255) << 8)
            mv = memoryview(_BUF)
            for r in range(y, y + h):
                f.readinto(mv[(r * 240 + x) * 2:(r * 240 + x + w) * 2])
    except (OSError, ValueError):
        return
    LCD(logo=True)


class LCD(framebuf.FrameBuffer):
    def __init__(self, logo=False):
        global _panel_up
        self.width = self.height = 240
        self.cs = Pin(CS, Pin.OUT, value=1)
        self.rst = Pin(RST, Pin.OUT, value=1)
        self.dc = Pin(DC, Pin.OUT, value=1)
        self.spi = SPI(1, 62_500_000, polarity=0, phase=0, sck=Pin(SCK), mosi=Pin(MOSI), miso=None)
        self.bl = PWM(Pin(BL))
        self.bl.freq(1000)
        self.buffer = _BUF
        super().__init__(self.buffer, self.width, self.height, framebuf.RGB565)
        if not _panel_up:   # after splash() the panel is already up; resetting it would blank the logo
            self.backlight(0)
            self._init_panel()
            if not logo:
                self.fill(BLACK)
            self.show()                  # into panel RAM while it still sleeps: part of the wait below
            self._wake()
            _panel_up = True
        self.backlight(100)

    def backlight(self, pct):
        self.bl.duty_u16(int(65535 * max(0, min(100, pct)) / 100))

    def _cmd(self, cmd, data=None):
        self.dc(0); self.cs(0); self.spi.write(bytes([cmd])); self.cs(1)
        if data:
            self.dc(1); self.cs(0); self.spi.write(bytes(data)); self.cs(1)

    def _init_panel(self):
        # ST7789 timing minimums: reset pulse >= 10 us, commands 5 ms after it, sleep out no sooner
        # than 120 ms after it (_wake), display on 5 ms after sleep out.
        self.rst(0); time.sleep_us(20); self.rst(1)
        self._reset_at = time.ticks_ms()
        time.sleep_ms(5)
        self._cmd(0x36, [0x70])        # memory access: landscape, matches Waveshare demo
        self._cmd(0x3A, [0x05])        # 16-bit color
        self._cmd(0xB2, [0x0C, 0x0C, 0x00, 0x33, 0x33])
        self._cmd(0xB7, [0x35])
        self._cmd(0xBB, [0x19])
        self._cmd(0xC0, [0x2C])
        self._cmd(0xC2, [0x01])
        self._cmd(0xC3, [0x12])
        self._cmd(0xC4, [0x20])
        self._cmd(0xC6, [0x0F])
        self._cmd(0xD0, [0xA4, 0xA1])
        self._cmd(0xE0, [0xD0, 0x04, 0x0D, 0x11, 0x13, 0x2B, 0x3F, 0x54, 0x4C, 0x18, 0x0D, 0x0B, 0x1F, 0x23])
        self._cmd(0xE1, [0xD0, 0x04, 0x0C, 0x11, 0x13, 0x2C, 0x3F, 0x44, 0x51, 0x2F, 0x1F, 0x1F, 0x20, 0x23])
        self._cmd(0x21)                # inversion on

    def _wake(self):
        wait = 120 - time.ticks_diff(time.ticks_ms(), self._reset_at)
        if wait > 0:
            time.sleep_ms(wait)
        self._cmd(0x11)                # sleep out
        time.sleep_ms(5)
        self._cmd(0x29)                # display on

    def show(self):
        if _on_show:
            _on_show()
        self._cmd(0x2A, [0x00, 0x00, 0x00, 0xEF])
        self._cmd(0x2B, [0x00, 0x00, 0x00, 0xEF])
        self._cmd(0x2C)
        self.dc(1); self.cs(0); self.spi.write(self.buffer); self.cs(1)

    def big_text(self, s, x, y, c, scale=2):
        """framebuf's 8x8 font scaled up. Slow-ish, fine for a few words."""
        w = 8 * len(s)
        tmp = framebuf.FrameBuffer(bytearray(w * 8 // 8), w, 8, framebuf.MONO_HLSB)
        tmp.text(s, 0, 0, 1)
        for yy in range(8):
            for xx in range(w):
                if tmp.pixel(xx, yy):
                    self.fill_rect(x + xx * scale, y + yy * scale, scale, scale, c)

    def center_text(self, s, y, c, scale=1):
        x = (self.width - 8 * len(s) * scale) // 2
        if scale == 1:
            self.text(s, x, y, c)
        else:
            self.big_text(s, x, y, c, scale)


class Keys:
    def __init__(self):
        self.pins = {k: Pin(p, Pin.IN, Pin.PULL_UP) for k, p in KEYS.items()}
        self.last = {k: 1 for k in KEYS}

    def pressed(self):
        """Names of keys that went down since the last call."""
        out = []
        for k, p in self.pins.items():
            v = p.value()
            if v == 0 and self.last[k] == 1:
                out.append(k)
            self.last[k] = v
        return out

    def held(self, k):
        return self.pins[k].value() == 0
