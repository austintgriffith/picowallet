# Minimal ATECC608 driver over I2C for MicroPython. Just what a wallet needs:
# wake, serial, lock state, public key of slot 0, sign a 32-byte digest.
# Packet format and CRC follow Microchip's cryptoauthlib.
from machine import I2C, SoftI2C, Pin
import time

# Bus pins. secrets.py may set ATECC_SDA / ATECC_SCL; the default is the wallet's GP4/GP5. A pair
# that is a hardware I2C0/I2C1 pair (SDA on 0,4,8,.. / 2,6,10,..; SCL the next pin up) uses the
# peripheral, anything else is bit-banged at 100 kHz, which this chip does not mind.
try:
    import secrets as _s
    SDA, SCL = int(getattr(_s, "ATECC_SDA", 4)), int(getattr(_s, "ATECC_SCL", 5))
except ImportError:
    SDA, SCL = 4, 5


def make_i2c(sda, scl, freq):
    if scl == sda + 1 and sda % 4 in (0, 2):
        return I2C(0 if sda % 4 == 0 else 1, sda=Pin(sda), scl=Pin(scl), freq=freq)
    return SoftI2C(sda=Pin(sda), scl=Pin(scl), freq=freq)

ADDR = 0x60
WAKE_OK = b"\x04\x11\x33\x43"
OP_READ, OP_NONCE, OP_GENKEY, OP_SIGN, OP_RANDOM, OP_INFO, OP_WRITE, OP_LOCK = 0x02, 0x16, 0x40, 0x41, 0x1B, 0x30, 0x12, 0x17

# Microchip's ATECC608 reference config (cryptoauthlib test_calib_config.c), same bytes the Pi
# signer used. Slot 0: P-256 private key, external sign, GenKey allowed. Bytes 0-15 (serial,
# revision) and 84-87 (lock bytes) are read-only and skipped by write_config.
CONFIG = bytes([
    0x01, 0x23, 0x00, 0x00, 0x00, 0x00, 0x60, 0x00, 0x04, 0x05, 0x06, 0x07, 0xEE, 0x00, 0x01, 0x00,
    0xC0, 0x00, 0x00, 0x01, 0x8F, 0x20, 0xC4, 0x44, 0x87, 0x20, 0x87, 0x20, 0x8F, 0x0F, 0xC4, 0x36,
    0x9F, 0x0F, 0x82, 0x20, 0x0F, 0x0F, 0xC4, 0x44, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F,
    0x0F, 0x0F, 0x0F, 0x0F, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    0x33, 0x00, 0x1C, 0x00, 0x13, 0x00, 0x1C, 0x00, 0x3C, 0x00, 0x1A, 0x00, 0x3C, 0x00, 0x30, 0x00,
])


def crc16(data):
    crc = 0
    for b in data:
        for shift in range(8):
            data_bit = (b >> shift) & 1
            crc_bit = (crc >> 15) & 1
            crc = (crc << 1) & 0xFFFF
            if data_bit != crc_bit:
                crc ^= 0x8005
    return bytes([crc & 0xFF, crc >> 8])


class AteccError(Exception):
    pass


class ATECC608:
    def __init__(self, sda=None, scl=None, addr=ADDR, freq=100_000):
        self.i2c = make_i2c(SDA if sda is None else sda, SCL if scl is None else scl, freq)
        self.addr = addr

    # --- transport ---------------------------------------------------------
    def wake(self):
        try:
            self.i2c.writeto(0, b"\x00")  # SDA held low long enough to count as the wake token
        except OSError:
            pass
        time.sleep_ms(2)
        for _ in range(3):
            try:
                if self.i2c.readfrom(self.addr, 4) == WAKE_OK:
                    return
            except OSError:
                time.sleep_ms(2)
        raise AteccError("no wake response")

    def sleep(self):
        try:
            self.i2c.writeto(self.addr, b"\x01")
        except OSError:
            pass

    def idle(self):
        try:
            self.i2c.writeto(self.addr, b"\x02")
        except OSError:
            pass

    def command(self, opcode, p1, p2, data=b"", resp_len=4, wait_ms=5, timeout_ms=300):
        body = bytes([len(data) + 7, opcode, p1, p2 & 0xFF, p2 >> 8]) + data
        pkt = b"\x03" + body + crc16(body)
        self.i2c.writeto(self.addr, pkt)
        time.sleep_ms(wait_ms)
        t0 = time.ticks_ms()
        while True:
            try:
                resp = self.i2c.readfrom(self.addr, resp_len + 3)
                break
            except OSError:
                if time.ticks_diff(time.ticks_ms(), t0) > timeout_ms:
                    raise AteccError("timeout on opcode 0x%02x" % opcode)
                time.sleep_ms(3)
        n = resp[0]
        if n < 4 or n > len(resp):
            raise AteccError("bad length %d" % n)
        if crc16(resp[: n - 2]) != resp[n - 2 : n]:
            raise AteccError("bad crc")
        payload = resp[1 : n - 2]
        if len(payload) == 1 and payload[0] != 0:
            raise AteccError("status 0x%02x on opcode 0x%02x" % (payload[0], opcode))
        return payload

    def run(self, *args, **kw):
        """wake, one command, back to sleep."""
        self.wake()
        try:
            return self.command(*args, **kw)
        finally:
            self.sleep()

    # --- commands ----------------------------------------------------------
    def read_config(self, block):
        """32 bytes of the config zone. block 0..3."""
        return self.run(OP_READ, 0x80, block << 3, resp_len=32, wait_ms=2)

    def serial(self):
        c = self.read_config(0)
        return c[0:4] + c[8:13]

    def lock_state(self):
        c = self.read_config(2)
        return {"configLocked": c[87 - 64] == 0x00, "dataLocked": c[86 - 64] == 0x00}

    def random(self):
        return self.run(OP_RANDOM, 0x00, 0x0000, resp_len=32, wait_ms=25)

    def pubkey(self, slot=0):
        """Public key of the private key in `slot`: (x, y) ints."""
        pub = self.run(OP_GENKEY, 0x00, slot, resp_len=64, wait_ms=120)
        return int.from_bytes(pub[:32], "big"), int.from_bytes(pub[32:], "big")

    def sign(self, digest, slot=0):
        """ECDSA over a 32-byte digest with the key in `slot`. Returns (r, s) ints, s not normalized."""
        if len(digest) != 32:
            raise ValueError("digest must be 32 bytes")
        self.wake()
        try:
            self.command(OP_NONCE, 0x03, 0x0000, digest, resp_len=1, wait_ms=8)  # pass-through -> TempKey
            sig = self.command(OP_SIGN, 0x80, slot, resp_len=64, wait_ms=120)      # external message from TempKey
        finally:
            self.sleep()
        return int.from_bytes(sig[:32], "big"), int.from_bytes(sig[32:], "big")

    # --- provisioning (once per fresh chip) --------------------------------
    def write_config(self, cfg=CONFIG):
        """Write the config zone in 4-byte words, skipping the read-only words (0-3 and 21)."""
        assert len(cfg) == 128
        self.wake()
        try:
            for word in range(32):
                if word < 4 or word == 21:
                    continue
                self.command(OP_WRITE, 0x00, word, cfg[word * 4:word * 4 + 4], resp_len=1, wait_ms=30)
        finally:
            self.sleep()

    def lock_config(self):
        """PERMANENT. Lock the config zone (no CRC check, mode 0x80). Refuses if already locked."""
        if self.lock_state()["configLocked"]:
            raise AteccError("config zone is already locked")
        self.run(OP_LOCK, 0x80, 0x0000, resp_len=1, wait_ms=35)
        if not self.lock_state()["configLocked"]:
            raise AteccError("lock command returned but the zone is still unlocked")

    def genkey_new(self, slot=0):
        """Create a NEW random private key in `slot`, replacing whatever was there. Returns (x, y)."""
        pub = self.run(OP_GENKEY, 0x04, slot, resp_len=64, wait_ms=120)
        return int.from_bytes(pub[:32], "big"), int.from_bytes(pub[32:], "big")

    def status(self):
        s = self.lock_state()
        s["serial"] = "".join("%02x" % b for b in self.serial())
        s["slot"] = 0
        try:
            self.pubkey()
            s["hasKey"] = True
        except AteccError as e:
            s["hasKey"] = False
            s["note"] = str(e)
        return s
