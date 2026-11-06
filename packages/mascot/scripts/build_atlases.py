"""Cuts the flat mascot art in ../source into movable parts and packs each pose into one atlas.

Run from the repo root after changing the art or a cut (needs Pillow and numpy):
    python packages/mascot/scripts/build_atlases.py [debug-folder]

Writes the atlases to both apps, and src/layout.generated.ts. Every coordinate below is in the
art's own 640-unit canvas. It fails if the parts, stacked at rest, stop matching the source art,
so a bad cut can't ship.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "packages/mascot/source"
OUTPUTS = [ROOT / "apps/native/assets/images/mascot", ROOT / "apps/frontend/public/mascot/atlas"]
LAYOUT = ROOT / "packages/mascot/src/layout.generated.ts"
DEBUG = Path(sys.argv[1]) if len(sys.argv) > 1 else None

S = 640
SS = 4  # supersampling for soft mask edges
GUTTER = 8  # transparent space around atlas sprites, so scaling never bleeds a neighbour in
INK = (38, 5, 31, 255)
CREAM = (242, 232, 225, 255)
PANEL = (92, 80, 92, 255)
GOLD = (255, 201, 77, 255)
HIGHLIGHT = (244, 236, 230, 255)
WHITE = (255, 255, 255, 255)
BLUSH = (244, 137, 176)
GIFT_DEEP = (128, 22, 84)
GIFT_LIGHT = (236, 96, 168)

# Each pose's padlock as drawn: center x, top of the shackle, bottom of the body. The art isn't
# consistent, so every pose is scaled and moved to the same height, axis and floor (below).
LOCKS = {
    "welcome-wave": (370, 65, 549),
    "excited-cheer": (333, 65, 549),
    "happy-pointing-down": (336, 61, 572),
    "hands-over-eyes": (332, 65, 549),
    "peeking": (335, 65, 549),
    "sad-alone": (333, 65, 554),
    "gift-in-hands": (337, 60, 555),
    "magnifying-glass": (353, 71, 543),
    "explorer-map": (339, 64, 548),
    "sleeping-bell": (323, 79, 516),
    "lightbulb-idea": (301, 99, 554),
    "santa-sack": (324, 80, 556),
    "holding-key": (332, 54, 546),
    "empty-hands-shrug": (333, 70, 548),
}
LOCK_HEIGHT = 484
LOCK_CENTER = 328
FLOOR = 550


# --- masks -----------------------------------------------------------------------------------
def poly(*points):
    img = Image.new("L", (S * SS, S * SS), 0)
    ImageDraw.Draw(img).polygon([(x * SS, y * SS) for x, y in points], fill=255)
    return np.asarray(img.resize((S, S), Image.BOX), dtype=np.float32) / 255


def circle(cx, cy, r):
    y, x = np.mgrid[0:S, 0:S]
    return np.clip(r + 0.5 - np.hypot(x - cx, y - cy), 0, 1).astype(np.float32)


def box(x0, y0, x1, y1):
    return poly((x0, y0), (x1, y0), (x1, y1), (x0, y1))


def spline(points, steps=14):
    """Catmull-Rom through the points: hidden body edges are drawn as smooth curves."""
    pts = [points[0], *points, points[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = (np.array(p, dtype=float) for p in pts[i - 1 : i + 3])
        for t in np.linspace(0, 1, steps, endpoint=False):
            value = 0.5 * (
                2 * p1
                + (p2 - p0) * t
                + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                + (3 * p1 - p0 - 3 * p2 + p3) * t**3
            )
            out.append(tuple(value))
    out.append(tuple(points[-1]))
    return out


def blurred(mask, radius):
    img = Image.fromarray((mask * 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255


def grown(mask, px):
    if px <= 0:
        return mask
    img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(px * 2 + 1))
    return np.asarray(img, dtype=np.float32) / 255


# --- pixels ----------------------------------------------------------------------------------
def nearest_fill(rgba, target):
    """Fills `target` (bool) outward from the opaque pixels around it."""
    rgb = rgba[..., :3].astype(np.float32)
    known = (rgba[..., 3] > 245) & ~target
    alpha = rgba[..., 3].astype(np.float32).copy()
    todo = target.copy()
    for _ in range(S):
        if not todo.any():
            break
        total = np.zeros_like(rgb)
        count = np.zeros(known.shape, dtype=np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            k = np.roll(known, (dy, dx), (0, 1))
            total += np.roll(rgb, (dy, dx), (0, 1)) * k[..., None]
            count += k
        front = todo & (count > 0)
        rgb[front] = total[front] / count[front][..., None]
        alpha[front] = 255
        known = known | front
        todo = todo & ~front
    out = rgba.copy()
    out[..., :3] = np.where(target[..., None], rgb, rgba[..., :3]).astype(np.uint8)
    out[..., 3] = np.where(target, alpha, rgba[..., 3]).astype(np.uint8)
    return out


def key_out(rgba, softness=(8, 34)):
    """
    Lifts drawing off the flat body: alpha comes from how far a pixel is from the body's color,
    and that color is taken back out. Without it a cut part drags a pale patch along with it.
    """
    bg = np.array(CREAM[:3], dtype=np.float32)
    px = rgba[..., :3].astype(np.float32)
    dist = np.abs(px - bg).max(axis=2)
    alpha = np.clip((dist - softness[0]) / (softness[1] - softness[0]), 0, 1)[..., None]
    color = np.where(alpha > 0.01, bg + (px - bg) / np.maximum(alpha, 0.01), bg)
    out = rgba.copy()
    out[..., :3] = np.clip(color, 0, 255).astype(np.uint8)
    out[..., 3] = (out[..., 3] * alpha[..., 0]).astype(np.uint8)
    return out


def paint(rgba, ops, area):
    """
    Redraws what a removed part was hiding, only inside `area`, so it can't touch visible art.
    ("under", points, color) fills behind what's there; ("stroke", points, width, color) draws on top.
    """
    size = (S * SS, S * SS)
    under = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(under)
    for op in ops:
        if op[0] == "under":
            draw.polygon([(x * SS, y * SS) for x, y in op[1]], fill=op[2])
    under.alpha_composite(Image.fromarray(rgba, "RGBA").resize(size, Image.BOX))
    draw = ImageDraw.Draw(under)
    for op in ops:
        if op[0] == "stroke":
            line = [(x * SS, y * SS) for x, y in spline(op[1])]
            width = op[2] * SS
            draw.line(line, fill=op[3], width=width, joint="curve")
            for x, y in (line[0], line[-1]):
                draw.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=op[3])
    painted = np.asarray(under.resize((S, S), Image.BOX))
    return np.where(area[..., None] > 0.02, painted, rgba)


def connected(seed, allowed):
    """The part of `allowed` (bool) reachable from `seed`."""
    reached = np.zeros(allowed.shape, dtype=bool)
    reached[seed[1], seed[0]] = True
    while True:
        next_ = reached.copy()
        for axis, shift in ((0, 1), (0, -1), (1, 1), (1, -1)):
            next_ |= np.roll(reached, shift, axis)
        next_ &= allowed
        if (next_ == reached).all():
            return reached
        reached = next_


def star(size, stroke=6):
    c = size * SS / 2
    points = []
    for i in range(8):
        angle = i * np.pi / 4 - np.pi / 2
        r = (0.47 if i % 2 == 0 else 0.15) * size * SS
        points.append((c + r * np.cos(angle), c + r * np.sin(angle)))
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.line([*points, points[0], points[1]], fill=INK, width=stroke * 2 * SS, joint="curve")
    draw.polygon(points, fill=GOLD)
    return img.resize((size, size), Image.LANCZOS)


def zzz_glyph():
    size = 76
    line = [(16 * SS, 18 * SS), (60 * SS, 18 * SS), (18 * SS, 58 * SS), (60 * SS, 58 * SS)]
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for width, color in ((24, INK), (10, CREAM)):
        draw.line(line, fill=color, width=width * SS, joint="curve")
        for x, y in line:
            r = width * SS / 2
            draw.ellipse((x - r, y - r, x + r, y + r), fill=color)
    return img.resize((size, size), Image.LANCZOS)


def glow(size):
    y, x = np.mgrid[0:size, 0:size]
    d = np.hypot(x - size / 2, y - size / 2) / (size / 2)
    out = np.zeros((size, size, 4), dtype=np.uint8)
    out[..., :3] = (255, 213, 74)
    out[..., 3] = (np.clip(1 - d, 0, 1) ** 1.6 * 0.8 * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def walk(nodes):
    for n in nodes:
        yield n
        yield from walk(n["children"])


# --- poses -----------------------------------------------------------------------------------
class local_layer:
    """A supersampled drawing surface in canvas units."""

    def __init__(self):
        self.img = Image.new("RGBA", (S * SS, S * SS), (0, 0, 0, 0))
        self.draw = ImageDraw.Draw(self.img)

    def ellipse(self, x, y, r, color):
        self.draw.ellipse(((x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS), fill=color)

    def arc(self, x, y, r, start, end, width, color):
        points = [(x + r * np.cos(np.radians(a)), y + r * np.sin(np.radians(a))) for a in np.linspace(start, end, 40)]
        self.curve(points, width, color, smooth=False)

    def curve(self, points, width, color, smooth=True):
        line = [(px * SS, py * SS) for px, py in (spline(points) if smooth else points)]
        self.draw.line(line, fill=color, width=int(width * SS), joint="curve")
        for px, py in (line[0], line[-1]):
            radius = width * SS / 2
            self.draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=color)

    def pixels(self):
        return np.asarray(self.img.resize((S, S), Image.BOX)).copy()


class Pose:
    """Parts are listed bottom to top. `base_here` says where what's left of the art sits."""

    def __init__(self, name):
        self.name = name
        img = Image.open(SOURCE / f"{name}.webp").convert("RGBA")
        if img.size != (S, S):
            img = img.resize((S, S), Image.LANCZOS)
        self.art = np.asarray(img).copy()
        self.order = []
        self.fills = np.zeros((S, S), dtype=bool)
        self.erases = np.zeros((S, S), dtype=np.float32)
        self.base_ops = []
        self.nodes = {}
        self.redrawn = np.zeros((S, S), dtype=np.float32)

    def node(self, id, pivot, parent=None):
        """A moving group with no pixels of its own."""
        n = {"id": id, "pivot": pivot, "children": []}
        self.nodes[id] = n
        (self.nodes[parent]["children"] if parent else self.order).append(n)
        return n

    def part(self, id, mask, pivot, parent=None, hole="fill", extend=None, behind=False, pixels=None, pad=0, keyed=False, swings=False, edge=True):
        """
        Lifts `mask` out of the art.
        hole: "fill" paints the gap from its surroundings, "erase" leaves it transparent, None
        keeps the art there too (for a copy on top that never moves away).
        extend: an area the part grows into, so its cut edge stays hidden when it swings.
        behind: the part goes under the base, so it overlaps the seam instead of meeting it.
        pad: grows the cut, for parts lifted off flat body color, where a margin costs nothing.
        keyed: drops the body color around the drawing, for parts that move over something else.
        swings: moves far enough to need its own dark-theme edge, travelling with it.
        edge: False leaves it out of the dark-theme edge, for bright parts that come and go.
        """
        mask = grown(mask, pad)
        keep = grown(mask, 3) if behind else mask
        rgba = (self.art if pixels is None else pixels).copy()
        if keyed:
            rgba = key_out(rgba)
        rgba[..., 3] = (rgba[..., 3] * keep).astype(np.uint8)
        if extend is not None:
            rgba = nearest_fill(rgba, (extend > 0.5) & (rgba[..., 3] < 245))
        if hole == "fill":
            self.fills |= grown(mask, 2) > 0.02
        elif hole == "erase":
            self.erases = np.maximum(self.erases, mask)
        n = self.node(id, pivot, parent)
        n["rgba"] = rgba
        n["swings"] = swings
        n["no_edge"] = not edge
        if hole == "erase" and pixels is None:
            n["erased"] = mask
        return n

    def add(self, id, image, at, pivot, parent=None):
        """A generated part that isn't in the art: it shows only while its tracks say so."""
        rgba = np.zeros((S, S, 4), dtype=np.uint8)
        rgba[at[1] : at[1] + image.height, at[0] : at[0] + image.width] = np.asarray(image)
        n = self.node(id, pivot, parent)
        n["rgba"] = rgba
        n["extra"] = True
        return n

    def base_here(self):
        self.order.append({"id": "base", "pivot": (S / 2, S / 2), "children": [], "isBase": True})

    def face(self, pivot=(320, 320)):
        return self.node("face", pivot)

    def measure_eye(self, cx, cy, r):
        """The eye's real center and radii, walking out along rays through its dark outer ring."""
        lum = self.art[..., :3].mean(axis=2)

        def outer(angle):
            dx, dy = np.cos(angle), np.sin(angle)
            found = None
            for d in np.arange(r - 16, r + 9, 0.5):
                if lum[int(round(cy + dy * d)), int(round(cx + dx * d))] < 80:
                    found = d
            return found

        for _ in range(3):
            right, left = outer(0.0), outer(np.pi)
            down, up = outer(np.pi / 2), outer(-np.pi / 2)
            if None not in (right, left, down, up):
                cx += (right - left) / 2
                cy += (down - up) / 2
        rays = [outer(a) for a in np.linspace(0, 2 * np.pi, 72, endpoint=False)]
        r = float(np.median([d for d in rays if d is not None])) + 1
        return cx, cy, r

    def eye(self, side, cx, cy, r, measure=True):
        """
        Redraws the eye instead of cutting it out: the art's highlights differ from pose to pose,
        and a hand or lens hides parts of some eyes. It's a squashable disc (the blink) with a
        sliding pupil, a pink cheek underneath and a curved closed lid that shows only mid-blink.
        Pass measure=False when something covers the eye, so the position comes from the call.
        """
        if measure:
            cx, cy, r = self.measure_eye(cx, cy, r)
        ring_in = r * 0.8
        pupil_r = r * 0.64
        px, py = cx + r * 0.05, cy + r * 0.05
        self.fills |= grown(circle(cx, cy, r + 4), 2) > 0.02
        self.redrawn = np.maximum(self.redrawn, circle(cx, cy, r + 6))

        ink = (*INK[:3], 255)
        iris = (124, 112, 130, 255)
        eye = local_layer()
        eye.ellipse(cx, cy, r, ink)
        eye.ellipse(cx, cy, ring_in, iris)
        pupil = local_layer()
        pupil.ellipse(px, py, pupil_r, ink)
        pupil.arc(px, py, r * 0.62, 100, 182, r * 0.11, HIGHLIGHT)
        hx, hy = px - r * 0.21, py - r * 0.36
        pupil.ellipse(hx, hy, r * 0.36, HIGHLIGHT)
        pupil.ellipse(hx - r * 0.13, hy - r * 0.13, r * 0.12, WHITE)
        closed = local_layer()
        closed.curve([(cx - r * 0.66, cy - r * 0.08), (cx, cy + r * 0.3), (cx + r * 0.66, cy - r * 0.08)], 15, ink)

        self.blush(cx + (-1 if side == "L" else 1) * r * 0.62, cy + r * 1.02, r)
        n = self.node(f"eye{side}", (cx, cy), parent="face")
        n["rgba"] = eye.pixels()
        p = self.node(f"pupil{side}", (px, py), parent=f"eye{side}")
        p["rgba"] = pupil.pixels()
        c = self.node(f"closed{side}", (cx, cy), parent="face")
        c["rgba"] = closed.pixels()
        c["extra"] = True

    def blush(self, x, y, r):
        """A soft pink cheek: the one touch of the brand's color on the body itself."""
        yy, xx = np.mgrid[0:S, 0:S]
        d = np.hypot((xx - x) / (r * 0.46), (yy - y) / (r * 0.27))
        rgba = np.zeros((S, S, 4), dtype=np.uint8)
        rgba[..., :3] = BLUSH
        rgba[..., 3] = (np.clip(1.25 - d, 0, 1) ** 1.2 * 0.5 * 255).astype(np.uint8)
        n = self.node(f"blush{len(self.nodes)}", (x, y), parent="face")
        n["rgba"] = rgba
        n["extra"] = True

    def redraw(self, id, area, pivot, draw, parent="face"):
        """Replaces a feature of the drawing with a new one, for a pose that changes its mood."""
        self.fills |= grown(area, 2) > 0.02
        self.redrawn = np.maximum(self.redrawn, area)
        layer = local_layer()
        draw(layer)
        n = self.node(id, pivot, parent)
        n["rgba"] = layer.pixels()

    def feature(self, id, mask, pivot, parent="face"):
        self.part(id, mask, pivot, parent=parent, keyed=True)["feature"] = True

    def finish(self):
        for n in walk(self.order):
            # A feature's box may clip an eye's edge, and the eye is redrawn on top now.
            if n.get("feature"):
                n["rgba"][..., 3] = (n["rgba"][..., 3] * (1 - self.redrawn)).astype(np.uint8)
        base = self.art.copy()
        base[..., 3] = (base[..., 3] * (1 - self.erases)).astype(np.uint8)
        # A cut drawn a little tight leaves slivers of a part's outline floating: they belong to it.
        main = connected((260, 200), base[..., 3] > 8)
        slivers = (base[..., 3] > 0) & ~(grown(main.astype(np.float32), 1) > 0)
        base[slivers, 3] = 0
        for n in walk(self.order):
            if "erased" in n:
                mine = slivers & (grown(n["erased"], 8) > 0)
                n["rgba"][mine] = self.art[mine]
        if self.fills.any():
            # Blurred, because the fill's streaks would show on the flat body when a part moves off.
            filled = nearest_fill(base, self.fills)
            soft = np.asarray(Image.fromarray(filled, "RGBA").filter(ImageFilter.GaussianBlur(7)))
            weight = blurred(self.fills.astype(np.float32), 3)[..., None] * self.fills[..., None]
            base = filled.copy()
            base[..., :3] = (filled[..., :3] * (1 - weight) + soft[..., :3] * weight).astype(np.uint8)
        if self.base_ops:
            base = paint(base, self.base_ops, grown(self.erases, 1))
        return base


def shackle(p, cut_left, cut_right, reach=36):
    """The shackle stands on the body's top edge. Its legs carry on down, for when it lifts."""
    x0, x1 = cut_left[0], cut_right[0]
    n = p.part("shackle", poly((x0, 30), (x1, 30), cut_right, cut_left), ((x0 + x1) / 2, cut_left[1]), hole="erase", behind=True, swings=True)
    rgba = n["rgba"]
    for x in range(S):
        if x0 <= x < x1:
            y = int(cut_left[1] + (cut_right[1] - cut_left[1]) * (x - x0) / (x1 - x0)) - 3
            leg = rgba[y, x, 3] > 200
            rgba[y:, x, 3] = 0
            if leg:
                rgba[y : y + reach, x] = rgba[y - 1, x]
        else:
            rgba[:, x, 3] = 0


def welcome_wave():
    p = Pose("welcome-wave")
    shackle(p, (252, 159), (472, 170))
    p.part("arm", box(40, 262, 169, 430), (172, 395), hole="erase", behind=True, extend=box(165, 280, 200, 425), swings=True)
    p.base_here()
    p.part("ticks", box(78, 186, 150, 262), (130, 262), hole="erase", swings=True)
    p.face()
    p.feature("browL", box(222, 224, 278, 254), (250, 240))
    p.feature("browR", box(398, 229, 450, 266), (424, 248))
    p.feature("mouth", box(296, 346, 358, 397), (327, 362))
    p.eye("L", 257, 312, 56)
    p.eye("R", 405, 317, 56)
    return p


def excited_cheer():
    p = Pose("excited-cheer")
    # The right arm lies over the back panel and under the body, so the panel gets its own layer.
    arm_r = poly((478, 372), (517, 324), (508, 300), (516, 268), (604, 268), (608, 402), (530, 415), (478, 416))
    panel = poly((420, 176), (500, 176), (548, 230), (548, 500), (500, 548), (420, 548), (476, 470), (476, 240))
    p.part("back", panel * (1 - arm_r), (480, 400), hole="erase", behind=True, extend=arm_r * box(440, 330, 535, 420))
    shackle(p, (222, 165), (432, 170))
    p.part("armL", box(30, 256, 131, 420), (134, 372), hole="erase", behind=True, extend=box(128, 270, 160, 416), swings=True)
    p.part("armR", arm_r, (476, 392), hole="erase", behind=True, extend=box(455, 365, 482, 416), swings=True)
    p.base_here()
    p.part("starL", box(88, 160, 154, 238), (121, 199), hole="erase", swings=True)
    p.part("starR", box(540, 200, 604, 272), (568, 238), hole="erase", swings=True)
    p.face()
    p.feature("browL", box(198, 220, 254, 254), (226, 240))
    p.feature("browR", box(378, 225, 434, 260), (406, 244))
    p.feature("mouth", box(255, 364, 344, 434), (300, 380))
    p.eye("L", 228, 316, 58)
    p.eye("R", 383, 321, 58)
    return p


def happy_pointing_down():
    p = Pose("happy-pointing-down")
    p.base_ops = [
        ("under", [(144, 370), (240, 370), (240, 575), (172, 560), (146, 500)], CREAM),
        ("stroke", [(140, 375), (140, 430), (143, 490), (160, 535), (190, 558)], 13, INK),
        ("under", [(440, 370), (488, 370), (488, 500), (470, 555), (420, 575)], CREAM),
        ("under", [(490, 370), (534, 395), (538, 490), (510, 550), (470, 570), (486, 500)], PANEL),
        ("stroke", [(486, 375), (486, 440), (484, 505), (466, 548)], 13, INK),
        ("stroke", [(535, 395), (536, 480), (520, 535), (470, 562)], 13, INK),
    ]
    p.base_here()
    p.face()
    p.feature("browL", box(196, 221, 244, 255), (220, 238))
    p.feature("browR", box(372, 221, 420, 255), (396, 238))
    p.feature("mouth", box(276, 359, 334, 410), (305, 372))
    p.eye("L", 232, 318, 57)
    p.eye("R", 378, 319, 57)
    p.part(
        "handL",
        poly((46, 480), (73, 433), (113, 395), (136, 378), (150, 436), (169, 486), (156, 524), (154, 576), (112, 576), (76, 536), (52, 524)),
        (138, 390),
        hole="erase",
        pad=3,
        swings=True,
    )
    p.part(
        "handR",
        poly((486, 377), (514, 386), (553, 433), (577, 480), (567, 516), (535, 535), (510, 567), (473, 570), (466, 546), (457, 508), (454, 483), (482, 443)),
        (494, 390),
        hole="erase",
        pad=3,
        swings=True,
    )
    return p


HANDS_R = [(310, 314), (337, 273), (368, 255), (424, 265), (452, 300), (449, 324), (496, 350), (519, 397), (496, 438), (448, 458), (408, 452), (375, 420), (358, 380), (322, 354)]


def hands_over_eyes():
    p = Pose("hands-over-eyes")
    p.base_ops = [
        ("under", [(132, 250), (484, 250), (484, 470), (132, 470)], CREAM),
        ("under", [(484, 320), (526, 320), (526, 470), (484, 470)], PANEL),
        ("stroke", [(128, 300), (128, 380), (131, 460)], 13, INK),
        ("stroke", [(486, 320), (486, 390), (484, 465)], 13, INK),
    ]
    left = poly((95, 400), (119, 350), (160, 322), (155, 287), (184, 265), (238, 255), (268, 280), (295, 314), (286, 352), (247, 382), (234, 414), (195, 449), (147, 462), (105, 438))
    right = poly(*HANDS_R)
    p.base_here()
    p.face()
    p.feature("browL", box(196, 230, 247, 260) * (1 - grown(left, 4)), (222, 245))
    p.feature("browR", box(359, 230, 407, 260) * (1 - grown(right, 4)), (383, 245))
    p.feature("mouth", box(271, 361, 330, 407), (300, 372))
    p.part("handL", left, (130, 420), hole="erase", pad=3)
    p.part("handR", right, (490, 420), hole="erase", pad=3)
    return p


def peeking():
    p = Pose("peeking")
    p.base_ops = [
        ("under", [(135, 250), (488, 250), (488, 485), (135, 485)], CREAM),
        ("under", [(488, 320), (528, 320), (528, 470), (488, 470)], PANEL),
        ("stroke", [(131, 340), (131, 410), (136, 480)], 13, INK),
        ("stroke", [(489, 320), (489, 390), (487, 465)], 13, INK),
    ]
    left = poly((92, 412), (102, 376), (136, 352), (182, 330), (228, 338), (266, 378), (260, 412), (224, 452), (147, 478), (105, 458))
    right = poly(*[(x + 3, y) for x, y in HANDS_R])
    p.base_here()
    p.face()
    p.feature("browL", box(196, 232, 249, 265), (222, 248))
    p.feature("browR", box(361, 232, 409, 262) * (1 - grown(right, 4)), (385, 247))
    p.feature("mouth", box(274, 362, 334, 409), (304, 374))
    p.eye("L", 226, 320, 58, measure=False)
    p.part("handL", left, (130, 430), hole="erase", pad=3)
    p.part("handR", right, (493, 420), hole="erase", pad=3)
    return p


def sad_alone():
    p = Pose("sad-alone")
    p.base_here()
    p.face()
    p.feature("browL", box(205, 240, 252, 275), (228, 258))
    p.feature("browR", box(344, 241, 389, 277), (366, 259))
    p.feature("mouth", box(269, 374, 314, 404), (291, 386))
    p.eye("L", 224, 334, 55)
    p.eye("R", 365, 334, 55)
    return p


def gift_in_hands():
    p = Pose("gift-in-hands")
    # Brand-pink instead of the art's brown: this is the first thing a new user sees.
    paper = poly((178, 398), (345, 365), (470, 365), (470, 480), (385, 480), (378, 552), (178, 552))
    lum = p.art[..., :3].mean(axis=2)
    spread = p.art[..., :3].max(axis=2).astype(np.int16) - p.art[..., :3].min(axis=2)
    brown = (paper > 0.5) & (lum > 58) & (lum < 190) & (spread > 8) & (p.art[..., 0] > p.art[..., 2])
    shade = np.clip((lum - 58) / 120, 0, 1)[..., None]
    pink = np.array(GIFT_DEEP, dtype=np.float32) * (1 - shade) + np.array(GIFT_LIGHT, dtype=np.float32) * shade
    p.art[brown, :3] = pink[brown].astype(np.uint8)
    p.base_ops = [
        ("under", [(345, 365), (475, 365), (475, 440), (420, 480), (352, 480)], CREAM),
        ("under", [(320, 400), (352, 412), (352, 480), (320, 480)], (66, 50, 60, 255)),
        ("stroke", [(352, 408), (352, 480)], 11, INK),
    ]
    p.base_here()
    p.face()
    # The art frowns, but an empty list is a beginning: lifted brows and a small smile.
    p.redraw("browL", box(205, 224, 250, 258), (228, 240), lambda d: d.curve([(208, 246), (228, 234), (248, 240)], 11, INK))
    p.redraw("browR", box(361, 224, 405, 258), (383, 240), lambda d: d.curve([(363, 240), (383, 234), (403, 246)], 11, INK))
    p.redraw("mouth", box(281, 351, 327, 382), (304, 364), lambda d: d.curve([(288, 360), (304, 373), (320, 360)], 10, INK))
    p.eye("L", 232, 316, 57)
    p.eye("R", 378, 316, 57)
    p.part(
        "lid",
        poly((321, 402), (345, 374), (384, 380), (410, 370), (430, 394), (465, 408), (468, 431), (425, 440), (409, 458), (386, 476), (356, 444)),
        (352, 412),
        hole="erase",
        keyed=True,
    )
    return p


def magnifying_glass():
    p = Pose("magnifying-glass")
    glass = poly((50, 320), (80, 250), (144, 230), (214, 260), (234, 307), (225, 365), (202, 395), (250, 433), (270, 480), (242, 513), (211, 506), (190, 481), (152, 465), (137, 424), (137, 404), (115, 414), (73, 386))
    p.base_ops = [
        ("under", [(170, 225), (280, 200), (280, 525), (180, 500), (158, 440), (156, 300)], CREAM),
        ("stroke", [(172, 236), (157, 300), (150, 380), (154, 445), (178, 495)], 13, INK),
    ]
    p.base_here()
    p.face()
    p.feature("mouth", box(308, 338, 356, 374), (332, 352))
    p.eye("L", 263, 296, 55, measure=False)
    p.eye("R", 405, 297, 55)
    p.part("glass", glass, (205, 455), hole="erase", pad=5, swings=True)
    return p


def explorer_map():
    p = Pose("explorer-map")
    sheet = poly((92, 435), (92, 405), (122, 382), (104, 318), (186, 355), (237, 335), (301, 365), (384, 362), (461, 332), (466, 392), (474, 392), (474, 478), (450, 516), (384, 542), (358, 529), (314, 538), (259, 513), (214, 532), (143, 497), (136, 452), (113, 458))
    p.base_ops = [
        ("under", [(150, 300), (480, 300), (480, 480), (450, 525), (340, 545), (215, 530), (160, 480)], CREAM),
        ("stroke", [(146, 310), (146, 440), (168, 490), (215, 530), (320, 547), (425, 543), (462, 505)], 13, INK),
    ]
    p.base_here()
    p.face((320, 280))
    p.feature("mouth", box(285, 316, 332, 350), (308, 330))
    p.eye("L", 237, 274, 56)
    p.eye("R", 387, 276, 56)
    p.part("map", sheet, (310, 520), hole="erase", pad=4)
    return p


def sleeping_bell():
    p = Pose("sleeping-bell")
    bell = poly((313, 461), (342, 395), (392, 330), (449, 330), (452, 410), (470, 474), (468, 508), (397, 522), (330, 490))
    hand = poly((434, 381), (442, 356), (476, 350), (514, 369), (534, 422), (514, 482), (480, 492), (464, 474), (467, 448), (448, 410))
    p.base_ops = [
        ("under", [(240, 400), (460, 320), (500, 400), (472, 508), (360, 484)], CREAM),
        ("stroke", [(225, 462), (330, 487), (452, 506)], 13, INK),
    ]
    p.base_here()
    p.face((290, 320))
    p.feature("lidL", box(166, 274, 276, 342), (221, 305))
    p.feature("lidR", box(303, 296, 410, 372), (357, 335))
    p.feature("mouth", box(255, 340, 305, 378), (280, 356))
    p.blush(186, 346, 55)
    p.blush(362, 386, 55)
    p.part("bell", bell * (1 - hand), (420, 352), hole="erase", extend=hand)
    p.part("hand", hand, (490, 420), hole=None)
    z = zzz_glyph()
    for id in ("z1", "z2", "z3"):
        p.add(id, z, (400, 120), (438, 158))
    return p


def lightbulb_idea():
    p = Pose("lightbulb-idea")
    lit = circle(522, 144, 56)
    bulb_mask = np.maximum(lit, poly((488, 186), (556, 186), (552, 252), (490, 252)))
    rays = box(425, 45, 615, 165) * (1 - grown(lit, 3))
    arm = poly((456, 365), (476, 350), (485, 300), (492, 250), (524, 250), (531, 280), (553, 305), (550, 340), (534, 380), (508, 413), (456, 432))
    panel = poly((395, 186), (442, 186), (450, 240), (456, 300), (462, 400), (456, 470), (432, 515), (378, 553), (490, 560), (500, 480), (492, 200))
    p.part("back", panel * (1 - arm), (440, 400), hole="erase", behind=True, extend=arm * box(440, 340, 490, 440))
    p.node("armGroup", (470, 392))
    p.part("arm", arm, (470, 392), parent="armGroup", hole="erase", behind=True, extend=box(445, 360, 468, 432))
    p.base_here()
    p.add("glow", glow(236), (404, 26), (522, 144))
    p.part("rays", rays, (522, 144), hole="erase", edge=False)
    p.part("bulb", bulb_mask, (522, 252), hole="erase", swings=True)
    off = p.art.copy()
    gray = off[..., :3].mean(axis=2, keepdims=True) * 0.93 + 14
    off[..., :3] = np.clip(gray * np.array([1.0, 0.97, 0.93], dtype=np.float32), 0, 255).astype(np.uint8)
    p.part("bulbOff", bulb_mask, (522, 252), parent="bulb", hole=None, pixels=off)["extra"] = True
    p.face()
    p.feature("mouth", box(276, 347, 318, 380), (297, 362))
    p.eye("L", 226, 313, 55)
    p.eye("R", 367, 307, 55)
    return p


def santa_sack():
    p = Pose("santa-sack")
    sack = poly((172, 506), (182, 484), (233, 465), (250, 435), (279, 395), (285, 379), (298, 350), (331, 335), (397, 310), (437, 313), (484, 330), (497, 365), (516, 403), (497, 442), (526, 493), (522, 534), (484, 567), (410, 583), (307, 583), (214, 567), (182, 552))
    hand = poly((118, 396), (242, 408), (262, 455), (248, 494), (176, 504), (118, 496))
    p.base_ops = [
        ("under", [(165, 480), (280, 300), (441, 300), (441, 500), (400, 556), (215, 556)], CREAM),
        ("under", [(441, 300), (482, 300), (484, 450), (450, 545), (400, 556)], PANEL),
        ("stroke", [(441, 300), (442, 420), (436, 500), (400, 548)], 13, INK),
        ("stroke", [(482, 300), (484, 430), (468, 510), (415, 556)], 13, INK),
        ("stroke", [(190, 530), (235, 556), (415, 558)], 13, INK),
    ]
    p.part("pom", circle(513, 234, 36), (494, 212), hole="erase")
    p.base_here()
    p.face((280, 280))
    p.feature("mouth", box(251, 310, 297, 343), (274, 325))
    p.eye("L", 204, 275, 53)
    p.eye("R", 351, 275, 54)
    p.part("sack", sack * (1 - hand), (360, 575), hole="erase", extend=hand * sack, pad=3)
    p.part("hand", hand, (200, 440), hole=None)
    return p


def holding_key():
    p = Pose("holding-key")
    hand_l = poly((89, 410), (128, 406), (163, 420), (183, 448), (177, 480), (141, 500), (100, 490), (89, 450))
    hand_r = poly((406, 463), (420, 431), (461, 422), (514, 440), (532, 461), (514, 496), (461, 510), (420, 500))
    key = poly((134, 416), (152, 380), (198, 358), (252, 361), (286, 408), (279, 423), (422, 393), (449, 408), (452, 450), (420, 500), (366, 510), (358, 474), (286, 465), (279, 495), (239, 526), (192, 535), (152, 510), (134, 476))
    p.base_ops = [
        ("under", [(128, 345), (465, 345), (465, 510), (400, 540), (190, 545), (128, 490)], CREAM),
        ("stroke", [(140, 490), (170, 520), (215, 540), (262, 545)], 13, INK),
    ]
    shackle(p, (216, 150), (428, 150))
    p.base_here()
    p.face()
    p.feature("mouth", box(278, 332, 327, 368), (302, 346))
    p.eye("L", 227, 290, 60)
    p.eye("R", 386, 290, 60)
    hands = np.maximum(hand_l, hand_r)
    p.part("key", key * (1 - hands), (290, 445), hole="erase", extend=hands * key, pad=4)
    p.part("handL", hand_l, (140, 450), hole=None)
    p.part("handR", hand_r, (470, 465), hole=None)
    p.add("sparkA", star(84), (156, 322), (198, 364))
    p.add("sparkB", star(64), (392, 356), (424, 388))
    return p


def empty_hands_shrug():
    p = Pose("empty-hands-shrug")
    left = poly((34, 365), (75, 332), (112, 338), (140, 354), (170, 388), (190, 416), (172, 452), (138, 462), (104, 446), (88, 414), (56, 401))
    right = poly((441, 410), (459, 393), (477, 396), (504, 361), (544, 335), (565, 338), (604, 368), (582, 401), (543, 414), (524, 452), (493, 462), (459, 449))
    p.base_ops = [
        ("under", [(148, 340), (240, 340), (240, 475), (150, 475)], CREAM),
        ("stroke", [(143, 340), (142, 420), (147, 480)], 13, INK),
        ("under", [(400, 340), (472, 340), (468, 475), (400, 475)], CREAM),
        ("under", [(476, 330), (520, 330), (520, 480), (470, 480)], PANEL),
        ("stroke", [(476, 340), (475, 420), (470, 480)], 13, INK),
        ("stroke", [(519, 330), (520, 420), (517, 480)], 13, INK),
    ]
    p.base_here()
    p.face()
    p.feature("mouth", box(283, 334, 335, 372), (309, 350))
    p.eye("L", 234, 290, 57)
    p.eye("R", 389, 292, 57)
    p.part("armL", left, (150, 425), hole="erase", pad=3, swings=True)
    p.part("armR", right, (470, 425), hole="erase", pad=3, swings=True)
    return p


POSES = [
    welcome_wave, excited_cheer, happy_pointing_down, hands_over_eyes, peeking, sad_alone, gift_in_hands,
    magnifying_glass, explorer_map, sleeping_bell, lightbulb_idea, santa_sack, holding_key, empty_hands_shrug,
]


# --- packing ---------------------------------------------------------------------------------
def pack(sprites):
    """Shelf packing, tallest first. Returns the atlas size and each sprite's slot."""
    width = 1024
    x = y = GUTTER
    shelf = 0
    slots = {}
    for key, img in sorted(sprites.items(), key=lambda kv: -kv[1].height):
        if x + img.width + GUTTER > width:
            x = GUTTER
            y += shelf + GUTTER
            shelf = 0
        slots[key] = (x, y)
        x += img.width + GUTTER
        shelf = max(shelf, img.height)
    return (width, y + shelf + GUTTER), slots


def check_rest(pose, stacked):
    """The stack at rest must be the art: the guarantee behind reduced motion and frame 0."""
    a = pose.art.astype(np.float32) / 255
    b = np.asarray(stacked).astype(np.float32) / 255
    diff = np.abs(a[..., :3] * a[..., 3:] - b[..., :3] * b[..., 3:]).max(axis=2)
    diff = diff * (pose.redrawn < 0.02)  # The eyes and anything else redrawn on purpose.
    return float(diff.mean()), int((diff > 0.2).sum()), diff > 0.2


def build(pose):
    base = pose.finish()
    for n in walk(pose.order):
        if n.get("isBase"):
            n["rgba"] = base
    stacked = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    for n in walk(pose.order):
        if "rgba" in n and not n.get("extra"):
            stacked.alpha_composite(Image.fromarray(n["rgba"], "RGBA"))
    # The art's dark outline disappears on a dark screen, so the dark theme adds a soft pale edge.
    # Parts that swing far carry their own, or they'd leave a ghost of themselves behind.
    def edge_of(rgba):
        edge = blurred(grown((rgba[..., 3] > 40).astype(np.float32), 4), 4)
        halo = np.zeros((S, S, 4), dtype=np.uint8)
        halo[..., :3] = (255, 244, 238)
        halo[..., 3] = (edge * 0.72 * 255).astype(np.uint8)
        return halo

    still = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    for n in walk(pose.order):
        if "rgba" in n and not n.get("extra") and not n.get("swings") and not n.get("no_edge"):
            still.alpha_composite(Image.fromarray(n["rgba"], "RGBA"))
    for n in [n for n in pose.order if n.get("swings")]:
        halo = {"id": n["id"] + "Halo", "pivot": n["pivot"], "children": [], "rgba": edge_of(n["rgba"]), "extra": True}
        pose.order.insert(pose.order.index(n), halo)
    pose.order.insert(0, {"id": "halo", "pivot": (S / 2, S / 2), "children": [], "rgba": edge_of(np.asarray(still)), "extra": True})

    sprites, placed = {}, {}
    for n in walk(pose.order):
        if "rgba" not in n:
            continue
        img = Image.fromarray(n["rgba"], "RGBA")
        bbox = img.getchannel("A").point(lambda v: 255 if v > 2 else 0).getbbox()
        if bbox is None:
            raise SystemExit(f"{pose.name}: {n['id']} is empty")
        sprites[n["id"]] = img.crop(bbox)
        placed[n["id"]] = bbox
    size, slots = pack(sprites)
    atlas = Image.new("RGBA", size, (0, 0, 0, 0))
    for key, img in sprites.items():
        atlas.paste(img, slots[key])

    def out(n):
        layer = {"id": n["id"], "pivot": [round(float(v), 1) for v in n["pivot"]]}
        if n["id"] in placed:
            x0, y0, x1, y1 = placed[n["id"]]
            layer["box"] = [x0, y0, x1 - x0, y1 - y0]
            layer["atlas"] = list(slots[n["id"]])
        if n["children"]:
            layer["children"] = [out(c) for c in n["children"]]
        return layer

    center, top, bottom = LOCKS[pose.name]
    scale = LOCK_HEIGHT / (bottom - top)
    fit = [round(scale, 4), round(LOCK_CENTER - center * scale, 1), round(FLOOR - bottom * scale, 1)]
    return atlas, {"atlas": list(size), "fit": fit, "layers": [out(n) for n in pose.order]}, stacked, base


def main():
    layout = {}
    failed = []
    for make in POSES:
        pose = make()
        atlas, entry, stacked, base = build(pose)
        mean, bad, mask = check_rest(pose, stacked)
        count = sum(1 for _ in walk(pose.order))
        print(f"{pose.name:22} atlas {atlas.size} layers {count} rest diff {mean:.4f} bad px {bad}")
        layout[pose.name] = entry
        for folder in OUTPUTS:
            folder.mkdir(parents=True, exist_ok=True)
            atlas.save(folder / f"{pose.name}.webp", quality=90, alpha_quality=100, method=6, exact=True)
        if DEBUG:
            sheet = Image.new("RGBA", (S * 3, S), (120, 200, 160, 255))
            sheet.alpha_composite(Image.fromarray(base, "RGBA"), (0, 0))
            sheet.alpha_composite(stacked, (S, 0))
            sheet.paste(Image.fromarray((mask * 255).astype(np.uint8)).convert("RGBA"), (S * 2, 0))
            sheet.convert("RGB").save(DEBUG / f"base-{pose.name}.png")
        if bad > 350:
            failed.append(f"{pose.name} ({bad} px)")
    body = json.dumps(layout, separators=(",", ":"))
    LAYOUT.write_text(
        "// Generated by scripts/build_atlases.py. Don't edit.\n"
        'import type { MascotPoseLayout } from "./types";\n\n'
        f"export const MASCOT_LAYOUT: Record<string, MascotPoseLayout> = {body};\n"
    )
    if failed:
        raise SystemExit("The stacked parts no longer match the art: " + ", ".join(failed))


main()
