# Boot logo, the first thing boot.py runs: wakes the ST7789 and puts logo.bin (tools/logo) on it,
# backlight last so the first thing seen is the logo. Kept small and apart from lcd.py so little code
# has to be prepared before the logo shows; lcd.py uses the pins and panel setup from here, and
# leaves the panel alone once it is up. Draws straight to the panel: no framebuffer needed.
from machine import Pin, SPI
import os, struct, time

DC, CS, SCK, MOSI, RST, BL = 8, 9, 10, 11, 12, 13
SPI_HZ = 62_500_000
up = False       # the panel is set up and showing something; lcd.LCD() keeps it
bg = None        # the logo's background colour, as the 2 bytes the panel takes

_SETUP = (
    (0x36, b"\x70"),               # memory access: landscape, matches Waveshare demo
    (0x3A, b"\x05"),               # 16-bit color
    (0xB2, b"\x0c\x0c\x00\x33\x33"),
    (0xB7, b"\x35"),
    (0xBB, b"\x19"),
    (0xC0, b"\x2c"),
    (0xC2, b"\x01"),
    (0xC3, b"\x12"),
    (0xC4, b"\x20"),
    (0xC6, b"\x0f"),
    (0xD0, b"\xa4\xa1"),
    (0xE0, b"\xd0\x04\x0d\x11\x13\x2b\x3f\x54\x4c\x18\x0d\x0b\x1f\x23"),
    (0xE1, b"\xd0\x04\x0c\x11\x13\x2c\x3f\x44\x51\x2f\x1f\x1f\x20\x23"),
    (0x21, b""),                   # inversion on
)


def cmd(spi, dc, cs, c, data=b""):
    dc(0); cs(0); spi.write(bytes([c])); cs(1)
    if data:
        dc(1); cs(0); spi.write(data); cs(1)


def window(spi, dc, cs, x, y, w, h):
    """Open x..x+w, y..y+h of panel RAM; stream pixels after this, then cs(1)."""
    x1, y1 = x + w - 1, y + h - 1
    cmd(spi, dc, cs, 0x2A, bytes([x >> 8, x & 255, x1 >> 8, x1 & 255]))
    cmd(spi, dc, cs, 0x2B, bytes([y >> 8, y & 255, y1 >> 8, y1 & 255]))
    cmd(spi, dc, cs, 0x2C)
    dc(1); cs(0)


def setup(spi, dc, cs, rst):
    """Reset and configure the panel; it still sleeps, so panel RAM can be filled before wake().
    ST7789 minimums: reset pulse >= 10 us, commands 5 ms after it. Returns the reset time."""
    rst(0); time.sleep_us(20); rst(1)
    t = time.ticks_ms()
    time.sleep_ms(5)
    for c, data in _SETUP:
        cmd(spi, dc, cs, c, data)
    return t


def wake(spi, dc, cs, reset_at):
    """Sleep out no sooner than 120 ms after the reset, display on 5 ms after that."""
    wait = 120 - time.ticks_diff(time.ticks_ms(), reset_at)
    if wait > 0:
        time.sleep_ms(wait)
    cmd(spi, dc, cs, 0x11)         # sleep out
    time.sleep_ms(5)
    cmd(spi, dc, cs, 0x29)         # display on


def show(path="logo.bin"):
    """logo.bin holds the box around the logo and the background colour: the screen gets the colour,
    then the box. No file or a bad one, no logo (the app's LCD() then sets the panel up)."""
    global up, bg
    if up:
        return
    try:
        with open(path, "rb") as f:
            head = f.read(10)
            x, y, w, h, _ = struct.unpack(">5H", head)
            if x + w > 240 or y + h > 240 or os.stat(path)[6] != 10 + w * h * 2:
                return
            box = bytearray(w * h * 2)
            f.readinto(box)
    except (OSError, ValueError):
        return
    bl = Pin(BL, Pin.OUT, value=0)
    cs, dc, rst = Pin(CS, Pin.OUT, value=1), Pin(DC, Pin.OUT, value=1), Pin(RST, Pin.OUT, value=1)
    spi = SPI(1, SPI_HZ, polarity=0, phase=0, sck=Pin(SCK), mosi=Pin(MOSI), miso=None)
    t = setup(spi, dc, cs, rst)
    row = bytearray(480)
    for i in range(0, 480, 2):
        row[i], row[i + 1] = head[8], head[9]
    window(spi, dc, cs, 0, 0, 240, 240)
    for _ in range(240):
        spi.write(row)
    cs(1)
    window(spi, dc, cs, x, y, w, h)
    spi.write(box)
    cs(1)
    wake(spi, dc, cs, t)
    bl(1)
    up, bg = True, bytes(head[8:10])
