"""Device side: decode a wire-format eth-sign-request and render clear-signing screens.
Pure Python, no deps beyond cbor/rlp (and p256 for signature checks). Runs on MicroPython.

    rows = render(request_bytes, root=(qx, qy))   -> [(depth, label, text), ...]
"""
import binascii
try:
    import hashlib
except ImportError:
    import uhashlib as hashlib
import cbor, rlp
try:
    import p256
except ImportError:
    p256 = None

def hx(b):
    return "0x" + binascii.hexlify(b).decode()

def short(b):
    h = binascii.hexlify(b).decode()
    return "0x" + h[:6] + ".." + h[-4:]

class Bad(Exception):
    pass

# ---------------------------------------------------------------- signatures
def verify_struct(items, root):
    """items = decoded struct incl. trailing signature. Root = (qx, qy) ints or None to skip."""
    if root is None:
        return True
    body = b"".join(cbor.encode(x) for x in items[:-1])
    sig = items[-1]
    if not p256 or len(sig) != 64:
        return False
    r, s = int.from_bytes(sig[:32], "big"), int.from_bytes(sig[32:], "big")
    return p256.verify(root[0], root[1], hashlib.sha256(body).digest(), r, s)

# ---------------------------------------------------------------- path walking
def _rd(data, off):
    if off + 32 > len(data):
        raise Bad("path runs past calldata")
    return int.from_bytes(data[off:off + 32], "big")

def resolve(elems, data):
    """Walk DATA_PATH elements over ABI-encoded args (calldata without selector).
    Returns a list of values (bytes); more than one when an ARRAY element iterates."""
    out = []
    def walk(i, cur, base):
        if i == len(elems):
            raise Bad("path without leaf")
        e = elems[i]
        k = e[0]
        if k == 0:                                   # TUPLE: move n slots
            walk(i + 1, cur + 32 * e[1], base)
        elif k == 2:                                 # REF: read offset, relative to block start
            off = _rd(data, cur)
            walk(i + 1, base + off, base + off)
        elif k == 1:                                 # ARRAY
            n = _rd(data, cur)
            area = cur + 32
            ae = e[1]
            w, a, b = (1, None, None) if ae is None else (ae[0], ae[1], ae[2])
            a = 0 if a is None else (a if a >= 0 else n + a)
            b = n if b is None else (b if b >= 0 else n + b)
            if n > 64:
                raise Bad("array too long")
            for j in range(a, min(b, n)):
                walk(i + 1, area + j * w * 32, area)
        elif k == 3:                                 # LEAF
            lt = e[1]
            if lt == 3:
                v = data[cur:cur + 32]
                if len(v) < 32: raise Bad("static leaf past end")
            elif lt == 4:
                n = _rd(data, cur)
                v = data[cur + 32:cur + 32 + n]
                if len(v) < n: raise Bad("dynamic leaf past end")
            else:
                v = data[cur:]                       # tuple/array leaf: rest of block (toy)
            if i + 1 < len(elems) and elems[i + 1][0] == 4:
                a, b = elems[i + 1][1]
                v = v[a:b] if a is not None else v[:b]
            out.append(v)
        else:
            raise Bad("path element %r" % k)
    walk(0, 0, 0)
    return out

def get(value, ctx):
    """VALUE = [family, size, source] -> list of raw byte values."""
    fam, size, src = value
    if src[0] == 0:
        vals = resolve(src[1], ctx["args"])
    elif src[0] == 1:
        c = src[1]
        vals = [ctx["from"] if c == 0 else ctx["to"] if c == 1 else ctx["value"] if c == 2 else ctx["chain_id"]]
    elif src[0] == 2:
        vals = [src[1]]
    else:
        raise Bad("map-ref not implemented")
    # trim static 32-byte words: address = last 20 bytes, bytesN = first N bytes
    if fam == 5:
        vals = [v[-20:] if len(v) == 32 else v for v in vals]
    elif fam == 7 and size and size < 32:
        vals = [v[:size] if len(v) == 32 else v for v in vals]
    return vals

def as_int(v):
    return int.from_bytes(v, "big")

# ---------------------------------------------------------------- formatting
def fmt_decimal(n, decimals):
    s = str(n)
    if decimals == 0:
        return s
    if len(s) < decimals + 1:
        s = "0" * (decimals + 1 - len(s)) + s
    ip, fp = s[:-decimals], s[-decimals:].rstrip("0")
    return ip + ("." + fp if fp else "")

def token_decimals(req, chain_id, addr):
    for ti in req.get(8, []):
        if ti[1] == chain_id and ti[2] == addr:
            return ti[3]
    return None

def trusted(req, chain_id, addr, sources):
    for tn in req.get(10, []):
        if tn[2] == chain_id and tn[3] == addr and tn[1] in sources:
            return tn[4]
    return None

def find_info(req, chain_id, to, sel):
    for ti in req.get(13, []):
        if ti[1] == chain_id and ti[2] == to and ti[3] == sel:
            return ti
    return None

def render_field(req, field, ctx, rows, depth, root):
    label, param, visible, sep = field
    kind = param[0]
    if kind in (0, 1, 2, 3, 4, 5, 6, 8, 11):
        vals = get(param[1], ctx)
    if kind == 0:                                     # raw
        fam = param[1][0]
        for v in vals:
            if fam == 5: t = hx(v)
            elif fam in (1, 6): t = str(as_int(v))
            elif fam == 8: t = v.decode()
            else: t = hx(v)
            rows.append((depth, label, t))
    elif kind == 1:                                   # amount (native)
        for v in vals:
            rows.append((depth, label, fmt_decimal(as_int(v), 18) + " ETH"))
    elif kind == 2:                                   # token amount
        _, value, token, native, thr, msg = param
        toks = get(token, ctx) if token else [None]
        for i, v in enumerate(vals):
            tok = toks[i] if len(toks) == len(vals) else toks[0]
            n = as_int(v)
            if thr is not None and n >= thr:
                rows.append((depth, label, msg or "Unlimited")); continue
            if tok is None or tok in native:
                rows.append((depth, label, fmt_decimal(n, 18) + " ETH")); continue
            dec = token_decimals(req, ctx["chain_id"], tok)
            if dec is None:
                rows.append((depth, label, str(n) + " units of " + short(tok) + " (unknown token)"))
            else:
                rows.append((depth, label, fmt_decimal(n, dec) + " " + short(tok)))
    elif kind == 8:                                   # trusted name
        _, value, types, sources, senders, vt = param
        for v in vals:
            name = trusted(req, ctx["chain_id"], v, sources)
            rows.append((depth, label, (name + " (" + short(v) + ")") if name else hx(v)))
    elif kind == 4:
        for v in vals:
            rows.append((depth, label, str(as_int(v)) + (" (unix time)" if param[2] == 0 else " (block)")))
    elif kind == 5:
        for v in vals:
            rows.append((depth, label, str(as_int(v)) + " s"))
    elif kind == 6:
        _, value, base, dec, prefix = param
        for v in vals:
            rows.append((depth, label, fmt_decimal(as_int(v), dec or 0) + " " + base))
    elif kind == 9:                                   # nested calldata
        _, value, callee, chain, sel, amount, spender = param
        datas = get(value, ctx)
        callees = get(callee, ctx)
        amounts = get(amount, ctx) if amount else None
        for i, d in enumerate(datas):
            to = callees[i] if len(callees) == len(datas) else callees[0]
            amt = None if amounts is None else (amounts[i] if len(amounts) == len(datas) else amounts[0])
            rows.append((depth, label, "#%d" % (i + 1)))
            sub = {"args": d[4:], "from": ctx["from"], "to": to, "value": amt or b"", "chain_id": ctx["chain_id"]}
            info = find_info(req, ctx["chain_id"], to, d[:4])
            if info is None:
                rows.append((depth + 1, "Unknown call to", hx(to)))
                rows.append((depth + 1, "Selector", hx(d[:4])))
                rows.append((depth + 1, "Calldata", "%d bytes" % len(d)))
            else:
                render_info(req, info, sub, rows, depth + 1, root)
            if amt and as_int(amt):
                rows.append((depth + 1, "Value", fmt_decimal(as_int(amt), 18) + " ETH"))
    elif kind == 12:                                  # group
        for f in param[2]:
            render_field(req, f, ctx, rows, depth, root)
    else:
        rows.append((depth, label, "<param type %d not rendered>" % kind))

def render_info(req, info, ctx, rows, depth, root):
    ok = verify_struct(info, root)
    rows.append((depth, "Review", info[4] + ("" if ok else "  [BAD SIGNATURE]")))
    if not ok:
        rows.append((depth, "Contract", hx(ctx["to"])))
        rows.append((depth, "Calldata", "%d bytes (blind)" % (len(ctx["args"]) + 4)))
        return
    if info[5]: rows.append((depth, "From", info[5]))
    if info[7]: rows.append((depth, "Site", info[7]))
    for f in info[10]:
        render_field(req, f, ctx, rows, depth, root)

def render(b, root=None):
    req = cbor.decode(b)
    tx = rlp.decode_tx(req[2])
    if 4 in req and req[4] != tx["chain_id"]:
        raise Bad("envelope chain-id != tx chain-id")
    data = tx["data"]
    rows = [(0, "Chain", str(tx["chain_id"])), (0, "Nonce", str(tx["nonce"]))]
    ctx = {"args": data[4:], "from": req.get(6, b""), "to": tx["to"],
           "value": tx["value"].to_bytes(32, "big"), "chain_id": tx["chain_id"]}
    # signed side data: check every struct, drop the bad ones
    for key in (8, 10):
        if key in req:
            req[key] = [s for s in req[key] if verify_struct(s, root)]
    info = find_info(req, tx["chain_id"], tx["to"], data[:4]) if len(data) >= 4 else None
    if info is None:
        rows.append((0, "To", hx(tx["to"])))
        rows.append((0, "Value", fmt_decimal(tx["value"], 18) + " ETH"))
        rows.append((0, "Calldata", "%d bytes (blind)" % len(data)))
    else:
        render_info(req, info, ctx, rows, 0, root)
        if tx["value"]:
            rows.append((0, "Value", fmt_decimal(tx["value"], 18) + " ETH"))
    return rows

def show(rows):
    for depth, label, text in rows:
        print("  " * depth + label + ": " + text)

if __name__ == "__main__":
    import sys, json, os
    sys.path.insert(0, os.path.expanduser("~/picowallet/firmware"))
    import p256
    root = None
    try:
        r = json.load(open("out/root.json")); root = (int(r["qx"], 16), int(r["qy"], 16))
    except Exception:
        pass
    for name in sys.argv[1:] or ["out/usds-transfer.cbor", "out/batch.cbor"]:
        print("==", name, "root of trust:", "on" if root else "off")
        show(render(open(name, "rb").read(), root))
