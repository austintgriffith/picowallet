# ups: battery screen for the Waveshare Pico-UPS-B hat. Its INA219 sits on I2C1 (GP6 SDA, GP7 SCL)
# at 0x43 and measures the battery: voltage, and current (+ = charging, - = running on battery).
# USB power is read from VBUS: GP24 on a Pico, WL_GPIO2 on a Pico W / Pico 2 W.
# Emulator: tools/emu run ups (no hat there, so it says so). X stops it.
from machine import I2C, Pin, Timer
from lcd import LCD, Keys, color, BLACK, WHITE, GREEN, RED, YELLOW, GREY, DARK

ADDR = 0x43
lcd = LCD()
keys = Keys()
i2c = I2C(1, sda=Pin(6), scl=Pin(7), freq=100000)
timer = None
try:
    vbus = Pin("WL_GPIO2", Pin.IN)
except (ValueError, TypeError):
    vbus = Pin(24, Pin.IN)


def setup():
    """Same settings as Waveshare's demo: 32 V range, 0.1 mA per current bit (0.01 ohm shunt)."""
    if ADDR not in i2c.scan():
        return False
    i2c.writeto_mem(ADDR, 5, b"\x10\x00")     # calibration 4096
    i2c.writeto_mem(ADDR, 0, b"\x3e\xef")     # 32 V, 320 mV shunt, 12-bit, continuous
    return True


def reg(r):
    b = i2c.readfrom_mem(ADDR, r, 2)
    v = (b[0] << 8) | b[1]
    return v - 65536 if v > 32767 else v


def read():
    volts = (reg(2) >> 3) * 0.004
    ma = reg(4) * 0.1
    pct = max(0, min(100, int((volts - 3.0) / 1.2 * 100)))    # 3.0 V empty, 4.2 V full
    return volts, ma, pct


def draw(hat):
    lcd.fill(BLACK)
    lcd.fill_rect(0, 0, 240, 20, DARK)
    lcd.text("battery", 4, 6, YELLOW)
    usb = vbus.value() == 1
    lcd.text("USB" if usb else "BAT", 212, 6, GREEN if usb else GREY)
    if not hat:
        lcd.center_text("no UPS hat found", 110, RED, 1)
    else:
        volts, ma, pct = read()
        c = GREEN if pct > 50 else YELLOW if pct > 20 else RED
        lcd.center_text("%d%%" % pct, 40, c, 5)
        lcd.rect(20, 100, 200, 30, WHITE)
        lcd.fill_rect(22, 102, 196 * pct // 100, 26, c)
        lcd.center_text("%.2f V   %+d mA" % (volts, ma), 150, WHITE)
        if ma > 2:
            state = "charging"
        elif ma < -2:
            state = "on battery"
        else:
            state = "full" if usb else "idle"
        lcd.center_text(state, 176, c, 2)
    lcd.center_text("X quits", 228, GREY)
    lcd.show()


def tick(_):
    for k in keys.pressed():
        if k == "X":
            stop()
            return
    draw(hat)


hat = setup()


def start():
    global timer
    draw(hat)
    timer = Timer(period=1000, mode=Timer.PERIODIC, callback=tick)
    print("ups running; X stops it")


def stop():
    if timer:
        timer.deinit()
    lcd.fill(BLACK)
    lcd.center_text("stopped", 112, RED, 2)
    lcd.show()


start()
