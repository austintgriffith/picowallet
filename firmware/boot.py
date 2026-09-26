# Runs before main.py. The boot logo goes up first, before anything slow loads.
try:
    import lcd
    lcd.splash()
except Exception as e:
    print("splash:", e)
# The passwordless development console is disabled by default in secrets.py.
# Boards without WiFi (plain Pico build, no network module) skip it.
try:
    import net
except ImportError:
    net = None
if net:
    wlan = net.start()
