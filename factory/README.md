# Factory test

Run `tools/factory`, open http://localhost:4343 in Chrome or Edge, plug in a finished wallet, press
Connect (first board only; after that it starts by itself on plug-in).

It checks, in order:
1. Board: Pico 2 W / Pico W / RP2040 clone, board ID, WiFi, RAM, whether the wallet firmware is on it.
2. Secure chip on GP4/GP5: ATECC608 (serial, lock state) or OPTIGA Trust M (UID). If none answers it
   says which wires to check.
3. Screen: red, green, blue; you confirm each on the page.
4. Buttons: press all nine; each turns green on the page and on the wallet.

Needs only MicroPython on the board: `probe.py` is pasted into the raw REPL, nothing is written
to flash. At the end the board soft-resets and the wallet starts again. Results stay in this
browser's list; "Download CSV" exports them.
