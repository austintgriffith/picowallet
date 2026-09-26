# Waveshare Pico-LCD-1.3: 240x240 ST7789 over SPI1, plus joystick and A/B/X/Y keys.
# Pins from waveshare.com/wiki/Pico-LCD-1.3.
from machine import Pin, SPI, PWM
import framebuf
import splash as _s     # pins and panel setup; boot.py already used it to put the logo up
from splash import DC, CS, SCK, MOSI, RST, BL
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
_on_show = None     # loader.py: called at the app's first show(), i.e. its first screen


class LCD(framebuf.FrameBuffer):
    def __init__(self):
        self.width = self.height = 240
        self.cs = Pin(CS, Pin.OUT, value=1)
        self.rst = Pin(RST, Pin.OUT, value=1)
        self.dc = Pin(DC, Pin.OUT, value=1)
        self.spi = SPI(1, _s.SPI_HZ, polarity=0, phase=0, sck=Pin(SCK), mosi=Pin(MOSI), miso=None)
        self.bl = PWM(Pin(BL))
        self.bl.freq(1000)
        self.buffer = _BUF
        super().__init__(self.buffer, self.width, self.height, framebuf.RGB565)
        if not _s.up:       # after the boot logo the panel is already up; resetting it would blank it
            self.backlight(0)
            t = _s.setup(self.spi, self.dc, self.cs, self.rst)
            self.fill(BLACK)
            self.show()                  # into panel RAM while it still sleeps: part of the wait
            _s.wake(self.spi, self.dc, self.cs, t)
            _s.up = True
        self.backlight(100)

    def backlight(self, pct):
        self.bl.duty_u16(int(65535 * max(0, min(100, pct)) / 100))

    def _cmd(self, cmd, data=None):
        self.dc(0); self.cs(0); self.spi.write(bytes([cmd])); self.cs(1)
        if data:
            self.dc(1); self.cs(0); self.spi.write(bytes(data)); self.cs(1)

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
