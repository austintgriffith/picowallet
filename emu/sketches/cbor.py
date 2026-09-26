# Minimal CBOR (RFC 8949) encoder/decoder. Runs on CPython and MicroPython.
# Covers what the ERC-7730 wire format needs: uint, negative int, bstr, tstr,
# array, map, null, bool, and tag 2 (unsigned bignum) for ints past 64 bits.
import struct

def _head(major, n):
    if n < 24:
        return bytes([(major << 5) | n])
    if n < 0x100:
        return bytes([(major << 5) | 24, n])
    if n < 0x10000:
        return bytes([(major << 5) | 25]) + struct.pack(">H", n)
    if n < 0x100000000:
        return bytes([(major << 5) | 26]) + struct.pack(">I", n)
    return bytes([(major << 5) | 27]) + struct.pack(">Q", n)

def encode(o):
    if o is None:
        return b"\xf6"
    if o is True:
        return b"\xf5"
    if o is False:
        return b"\xf4"
    if isinstance(o, int):
        if o >= 0:
            if o < (1 << 64):
                return _head(0, o)
            n = o.to_bytes((o.bit_length() + 7) // 8, "big")
            return b"\xc2" + _head(2, len(n)) + n          # tag 2 bignum
        return _head(1, -1 - o)
    if isinstance(o, (bytes, bytearray, memoryview)):
        return _head(2, len(o)) + bytes(o)
    if isinstance(o, str):
        b = o.encode("utf-8")
        return _head(3, len(b)) + b
    if isinstance(o, (list, tuple)):
        return _head(4, len(o)) + b"".join(encode(x) for x in o)
    if isinstance(o, dict):
        out = _head(5, len(o))
        for k in o:
            out += encode(k) + encode(o[k])
        return out
    raise TypeError("cbor: cannot encode %r" % (o,))

class _R:
    def __init__(self, b):
        self.b = b
        self.i = 0
    def take(self, n):
        if self.i + n > len(self.b):
            raise ValueError("cbor: truncated")
        s = self.b[self.i:self.i + n]
        self.i += n
        return s

def _arg(r, info):
    if info < 24:
        return info
    if info == 24:
        return r.take(1)[0]
    if info == 25:
        return struct.unpack(">H", r.take(2))[0]
    if info == 26:
        return struct.unpack(">I", r.take(4))[0]
    if info == 27:
        return struct.unpack(">Q", r.take(8))[0]
    raise ValueError("cbor: indefinite length not supported")

def _item(r):
    ib = r.take(1)[0]
    major, info = ib >> 5, ib & 0x1f
    if major == 0:
        return _arg(r, info)
    if major == 1:
        return -1 - _arg(r, info)
    if major == 2:
        return bytes(r.take(_arg(r, info)))
    if major == 3:
        return bytes(r.take(_arg(r, info))).decode("utf-8")
    if major == 4:
        return [_item(r) for _ in range(_arg(r, info))]
    if major == 5:
        d = {}
        for _ in range(_arg(r, info)):
            k = _item(r)
            d[k] = _item(r)
        return d
    if major == 6:
        tag = _arg(r, info)
        v = _item(r)
        if tag == 2:
            return int.from_bytes(v, "big")
        if tag == 3:
            return -1 - int.from_bytes(v, "big")
        return (tag, v)          # other tags: keep as a pair
    if major == 7:
        if info == 20: return False
        if info == 21: return True
        if info == 22: return None
        raise ValueError("cbor: unsupported simple/float %d" % info)
    raise ValueError("cbor: bad major")

def decode(b):
    r = _R(b)
    v = _item(r)
    if r.i != len(b):
        raise ValueError("cbor: %d trailing bytes" % (len(b) - r.i))
    return v

def diag(o, ind=0):
    """CBOR diagnostic notation, roughly what cbor.me prints."""
    import binascii
    pad = " " * ind
    if o is None: return "null"
    if o is True: return "true"
    if o is False: return "false"
    if isinstance(o, int): return str(o)
    if isinstance(o, (bytes, bytearray)): return "h'" + binascii.hexlify(o).decode() + "'"
    if isinstance(o, str): return '"' + o + '"'
    if isinstance(o, (list, tuple)):
        if all(not isinstance(x, (list, dict)) for x in o):
            return "[" + ", ".join(diag(x) for x in o) + "]"
        return "[\n" + ",\n".join(pad + "  " + diag(x, ind + 2) for x in o) + "\n" + pad + "]"
    if isinstance(o, dict):
        return "{\n" + ",\n".join(pad + "  " + diag(k) + ": " + diag(v, ind + 2) for k, v in o.items()) + "\n" + pad + "}"
    return repr(o)
