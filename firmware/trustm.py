# Infineon OPTIGA Trust M (Adafruit 4351 breakout) on the wallet's I2C bus, GP4 SDA / GP5 SCL.
# Physical layer only, straight from the datasheet (SLS32AIA, rev 3.70, chapter A):
#   - 7-bit address 0x30
#   - the chip NACKs its address while asleep or busy; retry every 1 ms, give up after 200 tries
#     (Infineon's ifx_i2c_physical_layer.c: PL_POLLING_MAX_CNT 200, PL_POLLING_INVERVAL_US 1000)
#   - GUARD_TIME 50 us between one transaction's STOP and the next START; we wait 100 us
#   - soft reset: write register 0x88 with two zero bytes, then tSTARTUP 15..20 ms
# Registers: 0x80 DATA, 0x82 I2C_STATE (4 bytes: flags, rfu, length hi, length lo).
# I2C_STATE byte 0: 0x80 BUSY, 0x40 RESP_RDY, 0x08 SOFT_RESET supported.
from machine import Pin, I2C
import time

ADDR = 0x30
GUARD_US = 100
TRIES = 200

i2c = None


def bus(sda=4, scl=5, freq=400000):
    global i2c
    i2c = I2C(0 if sda % 4 == 0 else 1, sda=Pin(sda), scl=Pin(scl), freq=freq)
    return i2c


def _write(data):
    for _ in range(TRIES):
        try:
            i2c.writeto(ADDR, data)
            time.sleep_us(GUARD_US)
            return
        except OSError:
            time.sleep_ms(1)
    raise OSError("trustm: write not acked")


def _read(n):
    for _ in range(TRIES):
        try:
            r = i2c.readfrom(ADDR, n)
            time.sleep_us(GUARD_US)
            return r
        except OSError:
            time.sleep_ms(1)
    raise OSError("trustm: read not acked")


def reg(addr, n):
    _write(bytes([addr]))
    return _read(n)


def state():
    return reg(0x82, 4)


def soft_reset():
    _write(b"\x88\x00\x00")
    time.sleep_ms(25)


def wait_response(timeout_ms=1000):
    """Poll I2C_STATE until RESP_RDY; return the response length."""
    t = time.ticks_ms()
    while True:
        s = state()
        if s[0] & 0x40:
            return (s[2] << 8) | s[3]
        if time.ticks_diff(time.ticks_ms(), t) > timeout_ms:
            raise OSError("trustm: no response, state %s" % s.hex())
        time.sleep_ms(5)


def read_data():
    n = wait_response()
    return reg(0x80, n)


def read_frame():
    """Next data frame. The chip may first hand back its zero-length ack of our last write
    (FCTR 0x8x, LEN 0, FCS); skip those."""
    while True:
        f = read_data()
        if len(f) > 5 or f[1:3] != b"\x00\x00":
            return f


# Datasheet A.2: the exact frames (data-link sequence numbers and FCS included), valid as the
# first two exchanges after a reset.
OPEN_APP = bytes.fromhex("8003001500700000" "10D2760000044765" "6E41757468417070" "6C041A")
OPEN_APP_ACK = bytes.fromhex("8080000" "00CEC")
GET_UID = bytes.fromhex("8004000B00010000" "06E0C200000064F0" "9F")
GET_UID_ACK = bytes.fromhex("8081000" "05630")


def coprocessor_uid():
    """Reset, OpenApplication, GetDataObject(0xE0C2). Returns the 27-byte UID field."""
    soft_reset()
    s = state()
    if s != b"\x08\x80\x00\x00":
        raise OSError("trustm: unexpected state after reset %s" % s.hex())
    _write(OPEN_APP)
    resp = read_frame()          # 00 00 05 00 00 00 00 00 14 87: OpenApplication response
    _write(OPEN_APP_ACK)
    _write(GET_UID)
    resp = read_frame()          # 05 00 20 00 | 00 00 00 1B | CD + 27 bytes | fcs
    _write(GET_UID_ACK)
    if len(resp) != 37 or resp[4:8] != b"\x00\x00\x00\x1b":
        raise OSError("trustm: bad UID response %s" % resp.hex())
    return resp[8:35]


# --- IFX I2C data-link + APDU layer (datasheet frames decoded; FCS is CRC-16 poly 0x8408, init 0, big-endian)
def _crc(data):
    c = 0
    for b in data:
        c ^= b
        for _ in range(8):
            c = (c >> 1) ^ 0x8408 if c & 1 else c >> 1
    return c


class Session:
    """One OpenApplication session after a soft reset. Frame numbers run 0..3."""

    def __init__(self):
        soft_reset()
        self.frnr = 0
        self.acknr = 3
        r = self.command(0x70, 0x00, bytes.fromhex("D2760000044765" "6E41757468417070" "6C"))

    def _send(self, apdu):
        body = bytes([(self.frnr << 2) | self.acknr]) + len(apdu + b"\x00").to_bytes(2, "big") + b"\x00" + apdu
        _write(b"\x80" + body + _crc(body).to_bytes(2, "big"))
        self.frnr = (self.frnr + 1) & 3

    def _recv(self):
        f = read_frame()
        if _crc(f[:-2]) != int.from_bytes(f[-2:], "big"):
            raise OSError("trustm: bad fcs %s" % f.hex())
        self.acknr = (f[0] >> 2) & 3
        ack = bytes([0x80 | self.acknr, 0, 0])
        _write(b"\x80" + ack + _crc(ack).to_bytes(2, "big"))
        return f[4:-2]                      # drop FCTR, LEN, PCTR and FCS

    def command(self, cmd, param, data):
        self._send(bytes([cmd, param]) + len(data).to_bytes(2, "big") + data)
        r = self._recv()
        if r[0] != 0:
            raise OSError("trustm: cmd %02x failed, status %02x, %s" % (cmd, r[0], r[4:].hex()))
        return r[4:4 + int.from_bytes(r[2:4], "big")]

    def get(self, oid, offset=None, length=None):
        d = oid.to_bytes(2, "big")
        if length is not None:
            d += offset.to_bytes(2, "big") + length.to_bytes(2, "big")
        return self.command(0x01, 0x00, d)

    def metadata(self, oid):
        return self.command(0x01, 0x01, oid.to_bytes(2, "big"))

    def sign(self, oid, digest):
        """CalcSign 0x31, ECDSA over a 32-byte digest with the key at oid. Returns (r, s)."""
        d = b"\x01" + len(digest).to_bytes(2, "big") + digest + b"\x03\x00\x02" + oid.to_bytes(2, "big")
        r = self.command(0x31, 0x11, d)
        if r[0] == 0x30:                    # some builds wrap r,s in a SEQUENCE
            r = r[2:]
        out = []
        while r:
            n = r[1]
            out.append(int.from_bytes(r[2:2 + n], "big"))
            r = r[2 + n:]
        return out[0], out[1]

    def random(self, n):
        return self.command(0x0C, 0x00, n.to_bytes(2, "big"))

    def get_all(self, oid, step=200):
        out = b""
        while True:
            part = self.get(oid, len(out), step)
            out += part
            if len(part) < step:
                return out


if __name__ == "__main__":
    bus()
    print("state", state().hex())
    uid = coprocessor_uid()
    print("coprocessor UID", uid.hex())
    print("fw build", uid[25:27].hex())
