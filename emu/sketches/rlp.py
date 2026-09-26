# Minimal RLP encode/decode, enough for an unsigned EIP-1559 (type 2) transaction.
def _len(n, base):
    if n < 56:
        return bytes([base + n])
    l = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return bytes([base + 55 + len(l)]) + l

def encode(o):
    if isinstance(o, int):
        o = b"" if o == 0 else o.to_bytes((o.bit_length() + 7) // 8, "big")
    if isinstance(o, (bytes, bytearray)):
        if len(o) == 1 and o[0] < 0x80:
            return bytes(o)
        return _len(len(o), 0x80) + bytes(o)
    if isinstance(o, (list, tuple)):
        body = b"".join(encode(x) for x in o)
        return _len(len(body), 0xc0) + body
    raise TypeError("rlp: %r" % (o,))

def _dec(b, i):
    p = b[i]
    if p < 0x80:
        return b[i:i+1], i + 1
    if p < 0xb8:
        n = p - 0x80
        return b[i+1:i+1+n], i + 1 + n
    if p < 0xc0:
        ll = p - 0xb7
        n = int.from_bytes(b[i+1:i+1+ll], "big")
        return b[i+1+ll:i+1+ll+n], i + 1 + ll + n
    if p < 0xf8:
        n = p - 0xc0
        end = i + 1 + n
        return _list(b, i + 1, end), end
    ll = p - 0xf7
    n = int.from_bytes(b[i+1:i+1+ll], "big")
    end = i + 1 + ll + n
    return _list(b, i + 1 + ll, end), end

def _list(b, i, end):
    out = []
    while i < end:
        v, i = _dec(b, i)
        out.append(v)
    return out

def decode(b):
    v, i = _dec(b, 0)
    if i != len(b):
        raise ValueError("rlp: trailing bytes")
    return v

def to_int(b):
    return int.from_bytes(b, "big") if b else 0

def decode_tx(raw):
    """Unsigned tx bytes -> dict(chain_id, to, value, data). Type 2 (EIP-1559) or legacy."""
    if raw[0] == 0x02:
        f = decode(raw[1:])
        return {"type": 2, "chain_id": to_int(f[0]), "nonce": to_int(f[1]), "to": f[5],
                "value": to_int(f[6]), "data": f[7]}
    if raw[0] >= 0xc0:
        f = decode(raw)
        return {"type": 0, "chain_id": to_int(f[6]) if len(f) > 6 else 0, "nonce": to_int(f[0]),
                "to": f[3], "value": to_int(f[4]), "data": f[5]}
    raise ValueError("tx type %d not handled" % raw[0])
