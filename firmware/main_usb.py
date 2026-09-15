# main.py for a USB wallet board (no radio). Copy this file to the board as main.py.
# usbwallet.run() owns the USB serial port and never returns; Ctrl-C from mpremote drops to
# the REPL, so tools/emu ship and mpremote keep working.
import sys
try:
    import lcd          # first: grabs the framebuffer while the heap is fresh (RP2040 boards)
    import usbwallet
    usbwallet.run()
except KeyboardInterrupt:
    pass
except Exception as e:
    with open("error.log", "w") as f:
        sys.print_exception(e, f)
    sys.print_exception(e)
