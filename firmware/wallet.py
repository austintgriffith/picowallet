# picowallet: the loop. Talks to the app, shows what is being asked, signs only on a button press.
#
# One 50 ms Timer (a scheduled, soft callback) so main.py can return to the REPL and the WiFi
# console keeps working. Every tick polls keys and redraws; every 20th tick talks to the app.
# Why one timer: the rp2 scheduler queue holds 8 callbacks. A second fast timer fills it while an
# HTTP call blocks, and then the console's socket-accept callback gets dropped for good.
# Signing + relaying can take seconds, so approve() stops the timer and restarts it after.
import time, json, machine, network, gc
import requests
import lcd as L
import net
import eip712
import signer as S
try:
    import secrets
except ImportError:
    secrets = None      # fresh board: the home screen says "no secrets.py" instead of connecting

APP = secrets.APP_URL if secrets else None
NAME = getattr(secrets, "DEVICE_NAME", "picowallet")
# The account is the chip's key. Without a chip there is no account, so the wallet stops on a
# NO CHIP screen. The emulator sets ALLOW_SOFT_KEY in its generated secrets.py to test the flow.
SOFT_OK = bool(getattr(secrets, "ALLOW_SOFT_KEY", False)) if secrets else False

d = None
keys = None
sig = None          # the signer backend
state = "boot"      # boot | home | confirm | working | done | error | nochip
page = 0            # confirm: 0 = summary, 1 = details
req = None          # request on screen
info = {}           # last /api/state
msg = ""            # status line / result text
msg_until = 0
seen = set()        # request ids already handled
last_announce = 0        # 0 = never; the first tick announces right away
last_fetch = 0
STATE_EVERY_MS = 12000   # about one block; the balance shows up fast after a deposit
paired = False
qx = qy = ""
dirty = True
_busy = False
log = []


def say(s, secs=4):
    global msg, msg_until, dirty
    msg = s
    msg_until = time.ticks_add(time.ticks_ms(), secs * 1000)
    dirty = True
    _log(s)


def _log(s):
    log.append(s)
    if len(log) > 30:
        log.pop(0)


# ----------------------------------------------------------------------------- screens
def short(a):
    return a[:6] + ".." + a[-4:] if len(a) > 14 else a


def eth_amount(wei):
    n = int(wei)
    whole, frac = n // 1000000000000000000, n % 1000000000000000000
    if not frac:
        return str(whole)
    return "%d.%s" % (whole, ("%018d" % frac).rstrip("0")[:6])


_qr = None          # (address, n, rows) from qr.bin, built by tools/qr
_last_bal = None


def load_qr():
    global _qr
    try:
        b = open("qr.bin", "rb").read()
        addr, n = b[:42].decode(), b[42]
        w = (n + 7) // 8
        rows = [int.from_bytes(b[43 + i * w:43 + (i + 1) * w], "little") for i in range(n)]
        _qr = (addr, n, rows)
    except Exception as e:
        _qr = None
        _log("no qr.bin: %r" % e)


def draw_qr(y0, size):
    """QR of the vault address, centered, black on white. size = px per module."""
    addr, n, rows = _qr
    pad = 8
    box = n * size + 2 * pad
    x0 = (240 - box) // 2
    d.fill_rect(x0, y0, box, box, L.WHITE)
    for r in range(n):
        bits = rows[r]
        for c in range(n):
            if bits >> c & 1:
                d.fill_rect(x0 + pad + c * size, y0 + pad + r * size, size, size, L.BLACK)
    return box


def draw_home():
    d.fill(L.BLACK)
    account = info.get("account", {})
    acct = account.get("address", "")
    ens_name = account.get("ensName")
    bal = account.get("balanceFormatted")
    chain = info.get("chain", {})
    # top-left: which chain. Test money and real money must never look alike.
    if chain:
        d.text("mainnet" if chain.get("id") == 1 else (chain.get("name", "?").lower()[:8]), 4, 4, L.GREEN if chain.get("id") == 1 else L.YELLOW)
    # top-right: pairing dot
    d.fill_rect(226, 4, 8, 8, L.GREEN if paired else L.RED)
    # top-centre: which key. The chip is the point; a software key must never pass unnoticed.
    if sig and sig.name != "atecc608":
        d.center_text("NO CHIP", 4, L.RED)
    # balance, big
    if bal is None:
        if secrets is None:
            d.center_text("no secrets.py", 30, L.RED, 2)
        elif not network.WLAN(network.STA_IF).isconnected():
            d.center_text("no wifi", 30, L.RED, 2)
        else:
            d.center_text("connecting...", 30, L.GREY, 2)
    else:
        whole, _, frac = bal.partition(".")
        sbal = "$" + whole + "." + (frac + "00")[:2]
        d.center_text(sbal, 24, L.WHITE, 4 if len(sbal) <= 7 else 3)
        d.center_text(info.get("token", {}).get("symbol", ""), 62, L.GREY)
    # QR of the vault, small
    if _qr and acct and _qr[0].lower() == acct.lower():
        box = draw_qr(80, 4)   # 29 * 4 + 16 = 132 px
        if ens_name:
            d.center_text(ens_name[:20], 80 + box + 4, L.YELLOW, 2 if len(ens_name) <= 18 else 1)
        else:
            d.center_text(acct[:21], 80 + box + 4, L.GREY)
            d.center_text(acct[21:], 80 + box + 14, L.GREY)
    else:
        d.center_text(ens_name or (short(acct) if acct else ""), 130, L.YELLOW if ens_name else L.GREY)
        d.center_text("run tools/qr", 150, L.RED)
    # status bar: a flash message beats a warning beats nothing
    warn = None
    try:
        if float(info.get("relayer", {}).get("balanceFormatted", "1")) < 0.0005:
            warn = "relay gas low"
    except ValueError:
        pass
    age = time.ticks_diff(time.ticks_ms(), last_fetch) // 1000 if last_fetch else 0
    if age > 45:
        warn = "no app for %ds" % age
    if not paired:
        warn = "not paired" if qx else "no key"
    if sig and sig.name != "atecc608":
        warn = "no chip: software key"
    if not network.WLAN(network.STA_IF).isconnected():
        warn = "no wifi: check secrets.py"
    if secrets is None:
        warn = "copy secrets.py to the board"
    if time.ticks_diff(msg_until, time.ticks_ms()) > 0:
        d.fill_rect(0, 224, 240, 16, L.DARK)
        d.center_text(msg[:30], 228, L.YELLOW)
    elif warn:
        d.fill_rect(0, 224, 240, 16, L.DARK)
        d.center_text(warn, 228, L.RED)
    d.show()


def tri_right(x, y, h, c):
    """Solid triangle pointing right, tip at (x+h//2, y), height h."""
    for i in range(h // 2):
        d.vline(x + i, y - (h // 2 - i), h - 2 * i, c)


def bar(y, h, label, color, scale):
    """Full-width bar with a label and an arrow at the right edge pointing at the physical button."""
    d.fill_rect(0, y, 240, h, color)
    d.center_text(label, y + (h - 8 * scale) // 2, L.WHITE, scale)
    tri_right(222, y + h // 2, 16, L.WHITE)


# The A/B/X/Y column sits along the right edge of the screen: A near the top, Y at the bottom.
# SIGN lives in a green bar in line with A, REJECT in a red bar in line with Y.
SIGN_BAR = (0, 60)
REJECT_BAR = (190, 50)


def draw_confirm():
    d.fill(L.BLACK)
    if page == 0:
        bar(SIGN_BAR[0], SIGN_BAR[1], "SIGN", L.GREEN, 3)
        if req.get("kind") == "setName":
            d.center_text("SET ENS NAME", 76, L.WHITE, 2)
            d.center_text(req["name"][:18], 112, L.YELLOW, 2)
            d.center_text("for " + short(req["account"]), 146, L.GREY)
        elif req.get("kind") == "cancelRecovery":
            d.center_text("CANCEL RECOVERY", 76, L.YELLOW, 2)
            d.center_text("KEEP CURRENT KEY", 116, L.WHITE, 2)
            d.center_text(short(req["account"]), 150, L.GREY)
        elif req.get("kind") == "execute":
            selector = req["data"][:10] if len(req["data"]) >= 10 else "0x00000000"
            title = "TOKEN TRANSFER" if selector == "0xa9059cbb" else ("TOKEN APPROVAL" if selector == "0x095ea7b3" else "GENERAL CALL")
            d.center_text(title, 72, L.YELLOW, 2)
            d.center_text(short(req["target"]), 108, L.WHITE, 2)
            d.center_text(eth_amount(req["value"]) + " ETH", 138, L.GREY, 2)
            d.center_text(selector, 166, L.GREY)
        else:
            amt = "$" + req["amountFormatted"]
            d.center_text(amt, 68, L.WHITE, 4 if len(amt) <= 7 else 3)
            d.center_text(req["tokenSymbol"], 104, L.GREY)
            d.center_text("to", 122, L.GREY)
            name = req.get("toName") or short(req["to"])
            d.center_text(name[:14], 138, L.YELLOW, 2)
            d.center_text(short(req["to"]), 162, L.GREY)
        bar(REJECT_BAR[0], REJECT_BAR[1], "REJECT", L.RED, 3)
    else:
        bar(0, 22, "SIGN", L.GREEN, 1)
        y = 28
        if req.get("kind") == "setName":
            lines = (
                "name " + req["name"],
                "nonce %s  chain %s" % (req["nonce"], req["chainId"]),
                "deadline " + str(req["deadline"]),
                "vault " + short(req["account"]),
                "digest (checked on device)",
                req["digest"][2:34], req["digest"][34:],
            )
        elif req.get("kind") == "cancelRecovery":
            lines = (
                "CANCEL RECOVERY",
                "keep current hardware key",
                "nonce %s  chain %s" % (req["nonce"], req["chainId"]),
                "deadline " + str(req["deadline"]),
                "vault " + short(req["account"]),
                "digest (checked on device)",
                req["digest"][2:34], req["digest"][34:],
            )
        elif req.get("kind") == "execute":
            raw = bytes.fromhex(req["data"][2:])
            data_hash = "".join("%02x" % b for b in eip712.data_hash(raw))
            selector = req["data"][:10] if len(req["data"]) >= 10 else "0x00000000"
            lines = (
                "target " + req["target"][:20], "       " + req["target"][20:],
                "value " + req["value"] + " wei",
                "selector " + selector,
                "calldata %d bytes" % len(raw),
                "data hash (device)", data_hash[:32], data_hash[32:],
                "nonce %s  chain %s" % (req["nonce"], req["chainId"]),
                "deadline " + str(req["deadline"]),
                "vault " + short(req["account"]),
                "digest (checked on device)",
                req["digest"][2:34], req["digest"][34:],
            )
        else:
            lines = (
                "to " + req["to"][:22], "   " + req["to"][22:],
                "amount " + req["amount"],
                "nonce %s  chain %s" % (req["nonce"], req["chainId"]),
                "deadline " + str(req["deadline"]),
                "vault " + short(req["account"]),
                "token " + req["token"][:22], "      " + req["token"][22:],
                "digest (checked on device)",
                req["digest"][2:34], req["digest"][34:],
            )
        for line in lines:
            d.text(line[:30], 4, y, L.GREEN if line.startswith("digest") else L.WHITE)
            y += 14
        bar(218, 22, "REJECT", L.RED, 1)
    d.show()


def draw_msg(title, color):
    d.fill(L.BLACK)
    d.fill_rect(0, 0, 240, 26, color)
    d.center_text(title, 5, L.WHITE, 2)
    y = 60
    for i in range(0, len(msg), 28):
        d.text(msg[i:i + 28], 6, y, L.WHITE)
        y += 14
    d.center_text("A = ok", 210, L.GREY)
    d.show()


def draw_nochip():
    d.fill(L.BLACK)
    d.fill_rect(0, 0, 240, 26, L.RED)
    d.center_text("NO CHIP", 5, L.WHITE, 2)
    y = 50
    import atecc
    for line in ("no ATECC608 answered", "on I2C (GP%d SDA, GP%d SCL)" % (atecc.SDA, atecc.SCL), "", "the account is the",
                 "chip's key, so there", "is no account here", "", "wire the chip, then", "press A to look again"):
        d.center_text(line, y, L.WHITE if line else L.BLACK)
        y += 16
    d.show()


def draw():
    if state == "nochip":
        draw_nochip()
    elif state in ("boot", "home"):
        draw_home()
    elif state == "confirm":
        draw_confirm()
    elif state == "working":
        draw_msg("SIGNING", L.BLUE)
    elif state == "done":
        draw_msg("SENT", L.GREEN)
    elif state == "error":
        draw_msg("ERROR", L.RED)


# ----------------------------------------------------------------------------- ui tick
_n = 0


def tick(t):
    global dirty, page, state, _busy, _n
    if _busy:
        return
    _busy = True
    try:
        _n += 1
        net.poll_accept()
        if _n % 20 == 0:
            timer.deinit()      # no timer events pile up while HTTP blocks (mainnet: 0.5-3 s)
            try:
                net_work()
            finally:
                start_timer()
        for k in keys.pressed():
            if state == "nochip":
                if k == "A":
                    probe_chip(); dirty = True
            elif state == "confirm":
                if k == "A":
                    approve(True)
                elif k == "Y":
                    approve(False)
                elif k == "down":
                    page = 1; dirty = True
                elif k == "up":
                    page = 0; dirty = True
            elif state in ("done", "error") and k == "A":
                state = "home"; dirty = True
        if state == "home" and (time.ticks_diff(msg_until, time.ticks_ms()) > 0 or _n % 100 == 0):
            dirty = True  # keep the status line fresh
        if dirty:
            draw()
            dirty = False
    except Exception as e:
        _log("ui: %r" % e)
    finally:
        _busy = False


# ----------------------------------------------------------------------------- app protocol
def hex32(n):
    return "0x%064x" % n


def announce():
    global paired, qx, qy, last_announce
    if not qx:
        x, y = sig.pubkey()
        qx, qy = hex32(x), hex32(y)
    body = {"name": NAME, "backend": sig.name, "chip": sig.status(), "qx": qx, "qy": qy}
    r = requests.post(APP + "/api/device", json=body, timeout=5)
    try:
        paired = bool(r.json().get("paired"))
    finally:
        r.close()
    last_announce = time.ticks_ms()


def fetch_state():
    global info, dirty, _last_bal
    r = requests.get(APP + "/api/state", timeout=8)
    try:
        info = r.json()
    finally:
        r.close()
    global last_fetch
    last_fetch = time.ticks_ms()
    bal = info.get("account", {}).get("balanceFormatted")
    if bal is not None and _last_bal is not None and bal != _last_bal:
        try:
            delta = float(bal) - float(_last_bal)
            say(("+$%.2f" if delta >= 0 else "-$%.2f") % abs(delta), 8)
        except ValueError:
            pass
    if bal is not None:
        _last_bal = bal
    dirty = True


def run_commands():
    r = requests.get(APP + "/api/commands?status=pending", timeout=5)
    try:
        cmds = r.json().get("commands", [])
    finally:
        r.close()
    for c in cmds:
        cid, ctype = c["id"], c["type"]
        _log("command " + ctype)
        try:
            if ctype == "status":
                res = sig.status()
            elif ctype == "genkey":
                x, y = sig.genkey()
                res = {"qx": hex32(x), "qy": hex32(y)}
                global qx, qy
                qx, qy = res["qx"], res["qy"]
            elif ctype == "lock-config":
                res = sig.lock_config()
            else:
                raise Exception("unknown command " + ctype)
            requests.post(APP + "/api/commands/%s/result" % cid, json={"ok": True, "result": res}, timeout=5).close()
        except Exception as e:
            requests.post(APP + "/api/commands/%s/result" % cid, json={"ok": False, "error": str(e)}, timeout=5).close()
        announce()


def check_digest(r):
    """Rebuild the EIP-712 digest from the fields the screen shows. Refuse if it differs."""
    expected_chain = getattr(secrets, "EXPECTED_CHAIN_ID", None)
    expected_vault = getattr(secrets, "EXPECTED_VAULT", None)
    expected_token = getattr(secrets, "EXPECTED_TOKEN", None)
    if expected_chain is not None and int(r["chainId"]) != int(expected_chain):
        return False
    if expected_vault and r["account"].lower() != expected_vault.lower():
        return False
    if r.get("kind") == "transfer" and expected_token and r["token"].lower() != expected_token.lower():
        return False
    if r.get("kind") == "setName":
        mine = eip712.set_name_digest(int(r["chainId"]), r["account"], r["name"], int(r["nonce"]), int(r["deadline"]))
    elif r.get("kind") == "cancelRecovery":
        mine = eip712.cancel_recovery_digest(int(r["chainId"]), r["account"], int(r["nonce"]), int(r["deadline"]))
    elif r.get("kind") == "execute":
        mine = eip712.execute_digest(int(r["chainId"]), r["account"], r["target"], int(r["value"]), bytes.fromhex(r["data"][2:]), int(r["nonce"]), int(r["deadline"]))
    else:
        mine = eip712.transfer_digest(int(r["chainId"]), r["account"], r["token"], r["to"], int(r["amount"]), int(r["nonce"]), int(r["deadline"]))
    return "0x" + "".join("%02x" % b for b in mine) == r["digest"].lower()


def poll_requests():
    global req, state, page, dirty
    r = requests.get(APP + "/api/requests?status=pending", timeout=5)
    try:
        pending = r.json().get("requests", [])
    finally:
        r.close()
    for p in pending:
        if p["id"] in seen:
            continue
        seen.add(p["id"])
        if not check_digest(p):
            say("digest mismatch! refused " + p["id"], 10)
            _log("REFUSED %s: app digest does not match the fields" % p["id"])
            return
        req, page, state, dirty = p, 0, "confirm", True
        if p.get("kind") == "setName":
            _log("request %s: set ENS name %s" % (p["id"], p["name"]))
        elif p.get("kind") == "cancelRecovery":
            _log("request %s: cancel recovery" % p["id"])
        elif p.get("kind") == "execute":
            _log("request %s: execute %s on %s" % (p["id"], p["data"][:10], p["target"]))
        else:
            _log("request %s: %s %s to %s" % (p["id"], p["amountFormatted"], p["tokenSymbol"], p.get("toName") or p["to"]))
        return


def approve(yes):
    global state, dirty, msg
    if not yes:
        _log("rejected " + req["id"])
        say("rejected", 3)
        state = "home"; dirty = True
        draw()
        try:
            requests.post(APP + "/api/requests/%s/reject" % req["id"], json={"by": NAME}, timeout=8).close()
        except Exception as e:
            _log("reject post failed: %r" % e)
        return
    state, msg, dirty = "working", "signing on " + sig.name, True
    draw()
    timer.deinit()  # long blocking work ahead; keep the scheduler queue empty
    try:
        digest = bytes.fromhex(req["digest"][2:])
        t0 = time.ticks_ms()
        r_, s_ = sig.sign(digest)
        _log("signed in %d ms" % time.ticks_diff(time.ticks_ms(), t0))
        msg = "relaying..."; draw()
        body = {"r": hex32(r_), "s": hex32(s_), "qx": qx, "qy": qy}
        resp = requests.post(APP + "/api/requests/%s/signature" % req["id"], json=body, timeout=120)
        try:
            out = resp.json()
        finally:
            resp.close()
        if out.get("status") == "confirmed":
            if req.get("kind") == "setName":
                msg = "ENS %s  tx %s" % (req["name"], short(out.get("txHash", "")))
            elif req.get("kind") == "cancelRecovery":
                msg = "recovery cancelled  tx %s" % short(out.get("txHash", ""))
            elif req.get("kind") == "execute":
                msg = "executed %s  tx %s" % (req["data"][:10], short(out.get("txHash", "")))
            else:
                msg = "$%s to %s  tx %s" % (req["amountFormatted"], req.get("toName") or short(req["to"]), short(out.get("txHash", "")))
            state = "done"
        else:
            msg = "%s: %s" % (out.get("status"), out.get("error", ""))[:100]
            state = "error"
    except Exception as e:
        msg, state = "sign/post failed: %r" % e, "error"
    _log(msg)
    dirty = True
    start_timer()


def net_work():
    global state, dirty, last_announce, last_fetch
    if state in ("confirm", "working", "nochip") or secrets is None:
        return
    try:
        if not network.WLAN(network.STA_IF).isconnected():
            return
        now = time.ticks_ms()
        every = 30000 if paired else 5000
        if last_announce == 0 or time.ticks_diff(now, last_announce) > every:
            announce()
            _log("announced, paired=%s" % paired)
        if last_fetch == 0 or time.ticks_diff(now, last_fetch) > STATE_EVERY_MS:
            fetch_state()
            if state == "boot":
                state = "home"; dirty = True
        run_commands()
        if paired:
            poll_requests()
    except Exception as e:
        _log("net: %r" % e)
        say("net: %r" % e, 5)
    gc.collect()


# ----------------------------------------------------------------------------- entry
timer = None


def start_timer():
    global timer
    timer = machine.Timer(period=50, mode=machine.Timer.PERIODIC, callback=tick)


def probe_chip():
    global sig, state
    sig = S.load()
    if sig.name != "atecc608" and not SOFT_OK:
        state = "nochip"
    elif state == "nochip":
        state = "boot"


def start():
    global d, keys, sig, dirty
    d = L.LCD()
    keys = L.Keys()
    load_qr()
    draw()
    probe_chip()
    dirty = True
    draw()
    if secrets and not network.WLAN(network.STA_IF).isconnected():
        try:
            net.connect()   # boot.py did this on the wallet Pico; a board that got wallet.py by hand did not
        except Exception as e:
            print("wifi:", e)   # a board without a WiFi chip still runs the wallet; home screen says "no wifi"
    start_timer()


def decide(yes=True):
    """Dev hook from the console: same as pressing A (True) or B (False)."""
    if state == "confirm":
        approve(yes)


def stop():
    timer.deinit()
