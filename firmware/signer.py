# The thing that holds the key. Two backends with one shape:
#   pubkey() -> (x, y)      sign(digest) -> (r, s) low-s      status() -> dict      name
# SoftSigner: P-256 key in a file on the Pico's flash. Only until the ATECC608 is wired.
# ChipSigner: the ATECC608 over I2C. The key never leaves the chip.
import os
import p256

KEY_FILE = "key.bin"


class SoftSigner:
    name = "pico-soft"

    def __init__(self):
        if KEY_FILE in os.listdir():
            self.d = int.from_bytes(open(KEY_FILE, "rb").read(), "big")
        else:
            self.d = p256.rand_scalar()
            open(KEY_FILE, "wb").write(self.d.to_bytes(32, "big"))
        self._pub = p256.pubkey(self.d)

    def pubkey(self):
        return self._pub

    def sign(self, digest):
        return p256.sign(self.d, digest)

    def genkey(self):
        self.d = p256.rand_scalar()
        open(KEY_FILE, "wb").write(self.d.to_bytes(32, "big"))
        self._pub = p256.pubkey(self.d)
        return self._pub

    def lock_config(self):
        return "software key: nothing to lock"

    def status(self):
        return {"configLocked": True, "dataLocked": False, "slot": 0, "hasKey": True, "note": "software key on the Pico (no chip yet)"}


class ChipSigner:
    name = "atecc608"

    def __init__(self):
        from atecc import ATECC608
        self.chip = ATECC608()
        self._pub = None

    def pubkey(self):
        if self._pub is None:
            self._pub = self.chip.pubkey()
        return self._pub

    def sign(self, digest):
        r, s = self.chip.sign(digest)
        if s > p256.N // 2:
            s = p256.N - s
        return r, s

    def genkey(self):
        """Only when secrets.ALLOW_GENKEY is True: this REPLACES the chip's key. A vault paired to
        the old key can never be spent again."""
        import secrets
        if not getattr(secrets, "ALLOW_GENKEY", False):
            raise Exception("genkey refused: set ALLOW_GENKEY = True in secrets.py on the Pico first")
        self._pub = self.chip.genkey_new()
        return self._pub

    def lock_config(self):
        """Only when secrets.ALLOW_LOCK is True. Writes the reference config, then locks it. Permanent."""
        import secrets
        if not getattr(secrets, "ALLOW_LOCK", False):
            raise Exception("lock refused: set ALLOW_LOCK = True in secrets.py on the Pico first")
        try:
            self.chip.write_config()
        except Exception as e:
            raise Exception("write config: %s" % e)
        try:
            self.chip.lock_config()
        except Exception as e:
            raise Exception("lock: %s" % e)
        return "config zone locked"

    def status(self):
        return self.chip.status()


def load():
    """ChipSigner if an ATECC answers on the bus, else the software key."""
    try:
        s = ChipSigner()
        s.chip.wake()
        s.chip.sleep()
        return s
    except Exception as e:
        print("no chip (%s), using software key" % e)
        return SoftSigner()
