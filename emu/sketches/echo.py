# stdin echo test: proves the emulator's serial input works from a Timer tick, including reads
# that find nothing (EOF) and then find data again.
import sys, select
from machine import Timer
_poll = select.poll(); _poll.register(sys.stdin, select.POLLIN)
_buf = ""
_t = None
def _pump(_=None):
    global _buf
    for _ in range(4096):
        if not _poll.poll(0): break
        ch = sys.stdin.read(1)
        if not ch: break
        if ch == "\n":
            print("echo:", _buf); _buf = ""
        else:
            _buf += ch
def start():
    global _t
    _t = Timer(period=30, mode=Timer.PERIODIC, callback=_pump)
    print("echo ready")
def stop():
    _t.deinit()
start()
