# picowallet firmware. boot.py already brought WiFi + console up.
# Start the wallet on timers and return, so the REPL idles and the WiFi console works.
import sys
try:
    import lcd     # first: grabs the framebuffer while the heap is fresh (RP2040 boards need this)
    import wallet
    wallet.start()
except Exception as e:
    with open("error.log", "w") as f:
        sys.print_exception(e, f)
    sys.print_exception(e)
