"""Host checks for display commands; these do not simulate a physical panel."""
import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


class Pin:
    OUT, IN, PULL_UP = 1, 0, 2

    def __init__(self, *args, value=0):
        self.state = value

    def __call__(self, value):
        self.state = value


class SPI:
    def __init__(self, bus, frequency, **kwargs):
        self.frequency = frequency
        self.writes = []

    def write(self, data):
        self.writes.append(bytes(data))


class PWM:
    def __init__(self, pin):
        self.duties = []

    def freq(self, value):
        pass

    def duty_u16(self, value):
        self.duties.append(value)


class FrameBuffer:
    def __init__(self, buffer, width, height, fmt):
        assert len(buffer) == width * height * 2

    def fill(self, color):
        self.buffer[:] = bytes(len(self.buffer))


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class DisplayProfilesTest(unittest.TestCase):
    def check_profile(self, width, height, frequency, final_duty):
        modules = {
            "machine": types.SimpleNamespace(Pin=Pin, SPI=SPI, PWM=PWM),
            "framebuf": types.SimpleNamespace(FrameBuffer=FrameBuffer, RGB565=1),
            "time": types.SimpleNamespace(sleep_ms=lambda ms: None),
        }
        with patch.dict(sys.modules, modules):
            lcd = load(ROOT / "firmware/lcd.py", "lcd_under_test")
            display = lcd.LCD()
        self.assertEqual((display.width, display.height), (width, height))
        self.assertEqual(display.spi.frequency, frequency)
        self.assertEqual(display.bl.duties[0], 0)
        self.assertEqual(display.bl.duties[-1], final_duty)
        writes = display.spi.writes
        self.assertEqual(writes[writes.index(b"\x2a") + 1], bytes([0, 0, (width-1) >> 8, (width-1) & 255]))
        self.assertEqual(writes[writes.index(b"\x2b") + 1], bytes([0, 0, (height-1) >> 8, (height-1) & 255]))
        self.assertEqual(len(writes[-1]), width * height * 2)
        display.backlight(-5)
        display.backlight(105)
        self.assertEqual(display.bl.duties[-2:], [0, 65535])
        return lcd

    def test_existing_waveshare_default(self):
        self.check_profile(240, 240, 62_500_000, 65535)


if __name__ == "__main__":
    unittest.main()
