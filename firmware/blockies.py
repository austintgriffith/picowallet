# Blockies identicons (github.com/ethereum/blockies), ported so the wallet screen and the website
# draw the same picture for the same seed. The website shows the blockie of the transaction digest;
# the wallet computes the digest itself and draws its own. Same picture = same transaction.
#
# The JS uses 32-bit int ops mixed with plain Numbers, and its rand() returns [0, 2), not [0, 1).
# Every quirk is kept. Integer math where the JS result is floored so 32-bit floats on the Pico
# cannot change a pixel; colours may differ from the browser by 1/255, which nobody can see.


def _i32(x):
    x &= 0xFFFFFFFF
    return x - 0x100000000 if x & 0x80000000 else x


class _Rand:
    def __init__(self, seed):
        rs = [0, 0, 0, 0]
        for i, ch in enumerate(seed):
            k = i % 4
            rs[k] = _i32(_i32(rs[k]) << 5) - rs[k] + ord(ch)
        self.rs = rs

    def u(self):
        """The JS rand() numerator: an unsigned 32-bit value; the JS divides it by 2**31."""
        rs = self.rs
        r0 = _i32(rs[0])
        t = r0 ^ _i32(r0 << 11)
        rs[0], rs[1], rs[2] = rs[1], rs[2], rs[3]
        r3 = _i32(rs[3])
        rs[3] = r3 ^ (r3 >> 19) ^ t ^ (t >> 8)
        return rs[3] & 0xFFFFFFFF


def _color(rnd):
    """(h, s, l) as the JS builds them: h an int that can exceed 359, s and l percentages that can
    exceed 100 (CSS wraps the hue and clamps the rest; see hsl_to_rgb)."""
    h = (rnd.u() * 360) >> 31
    s = rnd.u() * 60 / 2147483648 + 40
    l = (rnd.u() + rnd.u() + rnd.u() + rnd.u()) * 25 / 2147483648
    return h, s, l


def _data(rnd, size):
    dw = (size + 1) // 2
    mw = size - dw
    out = []
    for _ in range(size):
        row = [(rnd.u() * 23) // (10 << 31) for _ in range(dw)]   # floor(rand()*2.3), exactly
        out.extend(row)
        out.extend(row[:mw][::-1])
    return out


def build(seed, size=8):
    """The reference's buildOpts + createImageData: (data, color, bgcolor, spotcolor).
    data is size*size cells, row-major: 0 background, 1 colour, anything else spot colour."""
    rnd = _Rand(seed)
    color, bg, spot = _color(rnd), _color(rnd), _color(rnd)
    return _data(rnd, size), color, bg, spot


def hsl_to_rgb(hsl):
    """CSS hsl(): hue wraps, saturation and lightness clamp to 0..100. Returns 0..255 ints."""
    h, s, l = hsl
    h = h % 360
    s = min(max(s, 0), 100) / 100
    l = min(max(l, 0), 100) / 100
    c = (1 - abs(2 * l - 1)) * s
    hp = h / 60
    x = c * (1 - abs(hp % 2 - 1))
    if hp < 1: r, g, b = c, x, 0
    elif hp < 2: r, g, b = x, c, 0
    elif hp < 3: r, g, b = 0, c, x
    elif hp < 4: r, g, b = 0, x, c
    elif hp < 5: r, g, b = x, 0, c
    else: r, g, b = c, 0, x
    m = l - c / 2
    return int(round((r + m) * 255)), int(round((g + m) * 255)), int(round((b + m) * 255))


def draw(fb, seed, x, y, scale, size=8, color=None):
    """Draw the blockie for `seed` on a framebuf at (x, y), each cell `scale` px. `color` is the
    lcd.color(r, g, b) function; the picture is size*scale px square, background filled."""
    from lcd import color as _c
    color = color or _c
    data, fg, bg, spot = build(seed, size)
    pal = (color(*hsl_to_rgb(bg)), color(*hsl_to_rgb(fg)), color(*hsl_to_rgb(spot)))
    fb.fill_rect(x, y, size * scale, size * scale, pal[0])
    i = 0
    for row in range(size):
        for col in range(size):
            v = data[i]; i += 1
            if v:
                fb.fill_rect(x + col * scale, y + row * scale, scale, scale, pal[1 if v == 1 else 2])
