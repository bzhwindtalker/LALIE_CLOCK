#!/usr/bin/env python3
"""Sprite generator for LALIE_CLOCK.

Draws the pixel rabbit + props procedurally (clean outlines, consistent art)
and emits components/PixelRabbitSprites.ts.

Run:  python3 tools/gen_sprites.py
"""

W, H = 32, 32

PALETTE = {
    '.': 'transparent',
    '#': '#1a1523',   # outline / eyes
    'W': '#fdfaff',   # fur white
    'S': '#ded7ea',   # fur shade
    'P': '#ff9ecd',   # pink (ears, nose, cheeks)
    'R': '#ef4444',   # red
    'E': '#991b1b',   # dark red
    'G': '#22c55e',   # green
    'B': '#3b82f6',   # blue
    'N': '#1e3a8a',   # dark blue
    'C': '#06b6d4',   # cyan
    'O': '#f97316',   # orange (carrot)
    'Y': '#facc15',   # yellow
    'M': '#a0672f',   # brown (wood)
    'Z': '#93c5fd',   # light blue (sleep Zzz)
}


class Canvas:
    def __init__(self):
        self.g = [['.'] * W for _ in range(H)]

    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H:
            self.g[y][x] = c

    def rect(self, x, y, w, h, c):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.px(xx, yy, c)

    def ellipse(self, cx, cy, rx, ry, c, n: float = 2):
        for yy in range(H):
            for xx in range(W):
                dx = abs(xx - cx) / max(rx, 0.1)
                dy = abs(yy - cy) / max(ry, 0.1)
                if dx ** n + dy ** n <= 1.0:
                    self.px(xx, yy, c)

    def line(self, x0, y0, x1, y1, c):
        x0, y0, x1, y1 = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
        dx, dy = abs(x1 - x0), abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        while True:
            self.px(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x0 += sx
            if e2 < dx:
                err += dx
                y0 += sy

    def outline(self):
        """Turn '.' cells adjacent to any filled cell into '#' (1px clean border)."""
        filled = [[self.g[y][x] != '.' for x in range(W)] for y in range(H)]
        for y in range(H):
            for x in range(W):
                if filled[y][x]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and filled[ny][nx]:
                        self.g[y][x] = '#'
                        break

    def rows(self):
        return [''.join(r) for r in self.g]


# ---------------------------------------------------------------- rabbit

def draw_rabbit(c, cx=15, feet_y=30, ears='up', eyes='open', dy=0, squash=0,
                arms='down', scarf=False, arm_left='down', arm_right='down'):
    """Front-facing chibi rabbit. feet_y = baseline of feet, dy = hop offset."""
    b = feet_y + dy
    head_y = b - 15
    body_y = b - 7
    body_ry = 5 - squash
    head_ry = 6

    # body + head first (ears are drawn over the head so they join cleanly)
    c.ellipse(cx, body_y, 7, body_ry, 'W', n=2.5)
    c.ellipse(cx, body_y + body_ry - 1, 4, 1.2, 'S')     # subtle belly crescent
    c.ellipse(cx, head_y, 7, head_ry, 'W', n=3.5)        # superellipse = flat-ish top

    ear_top = head_y - 10
    if ears == 'up':
        c.rect(cx - 6, ear_top + 1, 3, 1, 'W')
        c.rect(cx + 3, ear_top + 1, 3, 1, 'W')
        c.rect(cx - 6, ear_top + 2, 3, 11, 'W')
        c.rect(cx + 3, ear_top + 2, 3, 11, 'W')
        c.rect(cx - 5, ear_top + 3, 1, 6, 'P')
        c.rect(cx + 4, ear_top + 3, 1, 6, 'P')
    elif ears == 'tilt':
        # symmetric outward tilt (asymmetric reads as a glitch)
        c.rect(cx - 7, ear_top + 1, 3, 3, 'W')
        c.rect(cx - 6, ear_top + 4, 3, 9, 'W')
        c.rect(cx + 5, ear_top + 1, 3, 3, 'W')
        c.rect(cx + 3, ear_top + 4, 3, 9, 'W')
        c.rect(cx - 6, ear_top + 3, 1, 5, 'P')
        c.rect(cx + 4, ear_top + 3, 1, 5, 'P')
    elif ears == 'down':
        c.rect(cx - 10, head_y - 2, 3, 8, 'W')
        c.rect(cx + 8, head_y - 2, 3, 8, 'W')
        c.rect(cx - 9, head_y - 1, 1, 5, 'P')
        c.rect(cx + 9, head_y - 1, 1, 5, 'P')

    # feet
    c.ellipse(cx - 4, b - 1, 3, 1.6, 'W')
    c.ellipse(cx + 4, b - 1, 3, 1.6, 'W')
    c.px(cx - 4, b - 1, 'P')                             # foot pads
    c.px(cx + 4, b - 1, 'P')

    # arms
    if arm_left == 'up':
        c.ellipse(cx - 8, body_y - 3, 1.6, 3, 'W')
    else:
        c.ellipse(cx - 8, body_y + 1, 1.6, 3, 'W')
    if arm_right == 'up':
        c.ellipse(cx + 8, body_y - 3, 1.6, 3, 'W')
    else:
        c.ellipse(cx + 8, body_y + 1, 1.6, 3, 'W')

    # face
    ey = head_y - 1
    if eyes == 'open':
        c.rect(cx - 4, ey - 1, 2, 3, '#')
        c.rect(cx + 2, ey - 1, 2, 3, '#')
        c.px(cx - 4, ey - 1, 'W')   # glints
        c.px(cx + 2, ey - 1, 'W')
    elif eyes == 'closed':
        c.rect(cx - 4, ey, 2, 1, '#')
        c.rect(cx + 2, ey, 2, 1, '#')
    elif eyes == 'happy':
        c.px(cx - 4, ey, '#'); c.px(cx - 2, ey, '#'); c.px(cx - 3, ey - 1, '#')
        c.px(cx + 2, ey, '#'); c.px(cx + 4, ey, '#'); c.px(cx + 3, ey - 1, '#')

    c.rect(cx - 1, head_y + 1, 2, 1, 'P')                # nose
    c.px(cx - 1, head_y + 2, '#'); c.px(cx, head_y + 2, '#')  # mouth
    c.px(cx - 6, head_y + 1, 'P')                        # cheeks
    c.px(cx + 5, head_y + 1, 'P')

    if scarf:
        c.rect(cx - 5, head_y + 5, 10, 2, 'R')
        c.rect(cx + 3, head_y + 7, 2, 3, 'R')
        c.px(cx + 3, head_y + 10, 'E')


def draw_z(c, x, y, glyph, col='Z'):
    for dy, row in enumerate(glyph):
        for dx, ch in enumerate(row):
            if ch == '#':
                c.px(x + dx, y + dy, col)


Z3 = ['###', '##.', '###']
Z5 = ['#####', '...##', '..##.', '.##..', '#####']


def heart(c, x, y, c_code='R'):
    """5x5 pixel heart with top-left at (x, y)."""
    pat = ['.RR.R',
           'RRRRR',
           'RRRRR',
           '.RRR.',
           '..R..']
    for dy, row in enumerate(pat):
        for dx, ch in enumerate(row):
            if ch != '.':
                c.px(x + dx, y + dy, c_code)


def draw_umbrella(c, cx, top_y):
    c.rect(cx - 7, top_y + 2, 15, 2, 'R')
    c.rect(cx - 5, top_y + 1, 11, 1, 'R')
    c.rect(cx - 3, top_y, 7, 1, 'R')
    for i, x in enumerate(range(cx - 7, cx + 8, 3)):
        c.px(x, top_y + 4, 'R' if i % 2 == 0 else 'E')   # scallop
    c.rect(cx - 1, top_y, 1, 1, 'E')
    c.line(cx, top_y + 4, cx, top_y + 14, 'M')
    c.rect(cx, top_y + 14, 2, 1, 'M')                    # handle


def draw_book(c, cx, y, open_page=True):
    c.rect(cx - 7, y - 1, 14, 7, '#')                    # border frame
    c.rect(cx - 6, y, 12, 5, 'N')                        # cover
    c.rect(cx - 5, y + 1, 10, 3, 'W')                    # pages
    c.rect(cx - 1, y + 1, 1, 3, 'S')                     # spine
    if open_page:
        c.px(cx - 3, y + 2, 'S'); c.px(cx + 2, y + 2, 'S')
        c.px(cx - 3, y + 3, 'S'); c.px(cx + 3, y + 3, 'S')
    else:
        c.px(cx + 1, y + 2, 'S'); c.px(cx + 1, y + 3, 'S')


def draw_car(c, cx):
    """Car occupying the bottom rows (24-31). Draw AFTER the rabbit."""
    c.rect(cx - 9, 22, 5, 3, 'R')                        # rear cabin
    c.rect(cx - 8, 23, 3, 2, 'C')                        # window
    c.rect(cx - 10, 25, 20, 4, 'R')                      # body
    c.rect(cx - 10, 27, 20, 1, 'E')                      # stripe
    c.rect(cx + 6, 24, 4, 1, 'R')                        # hood step
    for wx in (cx - 6, cx + 6):
        c.ellipse(wx, 29, 2, 2, '#')
        c.px(wx, 29, 'S')


def draw_snowman(c, cx, base_y):
    c.ellipse(cx, base_y - 3, 3.5, 3, 'W')
    c.ellipse(cx, base_y - 8, 2.6, 2.6, 'W')
    c.ellipse(cx, base_y - 12, 2, 2, 'W')
    c.px(cx - 1, base_y - 13, '#'); c.px(cx + 1, base_y - 13, '#')  # eyes
    c.rect(cx, base_y - 12, 2, 1, 'O')                   # carrot
    c.px(cx, base_y - 10, '#'); c.px(cx, base_y - 7, '#')  # buttons
    c.line(cx + 3, base_y - 10, cx + 6, base_y - 12, 'M')  # stick arm
    c.line(cx + 3, base_y - 9, cx + 6, base_y - 8, 'M')


def draw_kite(c, x, y, sway=0):
    """Diamond kite with top corner at (x, y)."""
    s = sway
    dia = ['..G..', '.GGG.', 'GGCGG', '.GGG.', '..G..']
    for dy, row in enumerate(dia):
        for dx, ch in enumerate(row):
            if ch != '.':
                c.px(x + dx + s, y + dy, ch if ch != 'G' else 'G')
    c.px(x + 2 + s, y + 1, 'C'); c.px(x + 2 + s, y + 3, 'C')
    # tail with bows
    c.px(x + 2 + s, y + 5, 'Y')
    c.px(x + 3 + s, y + 6, 'R')
    c.px(x + 2 + s, y + 7, 'Y')
    c.px(x + 1 + s, y + 8, 'R')
    return (x + 2 + s, y + 8)


# ---------------------------------------------------------------- poses

def pose_idle(blink=False, tilt=False):
    c = Canvas()
    draw_rabbit(c, ears='tilt' if tilt else 'up', eyes='closed' if blink else 'open')
    c.outline()
    return c.rows()


def pose_hop(phase):
    c = Canvas()
    if phase == 0:      # crouch
        draw_rabbit(c, dy=1, squash=1, ears='tilt')
    elif phase == 1:    # launch
        draw_rabbit(c, dy=-2, ears='up', arm_left='up', arm_right='up')
    elif phase == 2:    # air
        draw_rabbit(c, dy=-3, ears='tilt', eyes='happy')
    else:               # land
        draw_rabbit(c, dy=0, squash=1, ears='up')
    c.outline()
    return c.rows()


def pose_sleep(breath=False, z_count=2):
    """Dodot: rabbit curled up in a ball with pixel Zzz floating up-right."""
    c = Canvas()
    # body ball
    c.ellipse(13, 23, 9.5, 6.5 - (0.5 if breath else 0), 'W', n=2.4)
    c.ellipse(13, 28, 6, 1.5, 'S')                       # belly shade
    # tail puff
    c.ellipse(4, 25, 2.2, 2.2, 'W')
    # ears draped over the body (drawn before the head so they connect)
    c.ellipse(14, 17, 7, 2.4, 'W', n=2.5)
    c.ellipse(14, 17.3, 3.5, 0.9, 'P', n=2.5)
    c.ellipse(17, 20.5, 5.5, 1.8, 'W', n=2.5)
    c.ellipse(17, 20.7, 2.8, 0.8, 'P', n=2.5)
    # head resting on the ground at the right
    hy = 24 - (1 if breath else 0)
    c.ellipse(22, hy, 6, 5, 'W', n=3)
    # face: closed eye with lash, nose at the muzzle tip
    c.rect(20, hy - 1, 3, 1, '#')
    c.px(19, hy - 2, '#')
    c.rect(26, hy, 1, 2, 'P')
    c.px(19, hy + 1, 'P')                                # cheek
    # tucked front feet
    c.ellipse(18, 28, 2.5, 1.5, 'W')
    c.px(18, 28, 'P')
    c.outline()
    # Zzz stack drawn AFTER the outline pass: clean letters, no halo strays
    spots = [(21, 10, Z3), (25, 5, Z5), (28, 0, Z3)]
    for (zx, zy, glyph) in spots[:max(1, min(z_count, 3))]:
        draw_z(c, zx, zy, glyph)
    return c.rows()


def pose_umbrella(phase):
    c = Canvas()
    draw_rabbit(c, cx=12, ears='up', eyes='open', arm_right='up')
    draw_umbrella(c, 20, 1 + (1 if phase else 0))       # pole lands at the raised paw
    c.outline()
    return c.rows()


def pose_story(page_open=True):
    c = Canvas()
    draw_rabbit(c, ears='tilt', eyes='closed', arm_left='down', arm_right='down')
    draw_book(c, 15, 21, open_page=page_open)
    c.outline()
    return c.rows()


def pose_car(phase):
    c = Canvas()
    draw_rabbit(c, feet_y=26, dy=-(phase % 2), ears='up', eyes='happy' if phase % 2 else 'open')
    draw_car(c, 15)
    c.outline()
    return c.rows()


def pose_snow(phase):
    c = Canvas()
    draw_rabbit(c, ears='down', eyes='open' if phase % 2 == 0 else 'happy',
                dy=-(phase % 2), scarf=True,
                arm_left='up' if phase % 2 == 0 else 'down',
                arm_right='down' if phase % 2 == 0 else 'up')
    c.outline()
    return c.rows()


def pose_snowman(phase):
    c = Canvas()
    draw_rabbit(c, cx=8, ears='up', eyes='happy' if phase else 'open',
                scarf=True, arm_right='up')
    draw_snowman(c, 24, 30)
    c.outline()
    return c.rows()


def pose_kite(phase):
    c = Canvas()
    tail_end = draw_kite(c, 22, 2, sway=(phase % 2))
    draw_rabbit(c, cx=11, ears='tilt', eyes='happy' if phase % 2 else 'open',
                dy=-(phase % 2), arm_right='up')
    c.line(tail_end[0], tail_end[1] + 1, 19, 20, 'S')    # string to paw
    c.outline()
    return c.rows()


def pose_love(phase):
    c = Canvas()
    draw_rabbit(c, ears='up', eyes='happy')
    hs = [(6, 3), (22, 1), (15, -2), (8, -1)][phase % 4]
    heart(c, hs[0], max(0, hs[1]))
    if phase % 2:
        heart(c, 24, 6 - (phase % 4), 'P')
    c.outline()
    return c.rows()


SPRITES = {
    'IDLE': [pose_idle(False, False), pose_idle(False, True),
             pose_idle(True, False), pose_idle(False, True)],
    'HOP': [pose_hop(0), pose_hop(1), pose_hop(2), pose_hop(3)],
    'SLEEP': [pose_sleep(False, 1), pose_sleep(True, 2), pose_sleep(False, 3), pose_sleep(True, 2)],
    'UMBRELLA': [pose_umbrella(0), pose_umbrella(1), pose_umbrella(0), pose_umbrella(1)],
    'STORY': [pose_story(True), pose_story(True), pose_story(False), pose_story(True)],
    'CAR': [pose_car(0), pose_car(1), pose_car(2), pose_car(3)],
    'SNOW': [pose_snow(0), pose_snow(1), pose_snow(2), pose_snow(3)],
    'SNOWMAN': [pose_snowman(0), pose_snowman(0), pose_snowman(1), pose_snowman(0)],
    'KITE': [pose_kite(0), pose_kite(1), pose_kite(2), pose_kite(3)],
    'LOVE': [pose_love(0), pose_love(1), pose_love(2), pose_love(3)],
}


def emit_ts():
    lines = []
    lines.append('// AUTO-GENERATED by tools/gen_sprites.py — edit the generator, not this file.')
    lines.append('')
    lines.append('export type PixelGrid = string[];')
    lines.append('')
    lines.append('export const PALETTE: Record<string, string> = {')
    for k, v in PALETTE.items():
        label = {'.': 'transparent', '#': 'outline / eyes', 'W': 'fur white', 'S': 'fur shade',
                 'P': 'pink', 'R': 'red', 'E': 'dark red', 'G': 'green', 'B': 'blue',
                 'N': 'dark blue', 'C': 'cyan', 'O': 'orange', 'Y': 'yellow', 'M': 'brown'}.get(k, '')
        lines.append(f"  '{k}': '{v}',".ljust(24) + f' // {label}')
    lines.append('};')
    lines.append('')
    lines.append('export const SPRITES: Record<string, PixelGrid[]> = {')
    for name, frames in SPRITES.items():
        lines.append(f'  {name}: [')
        for frame in frames:
        # every frame: one array of row strings
            lines.append('    [')
            for row in frame:
                lines.append(f'      "{row}",')
            lines.append('    ],')
        lines.append('  ],')
    lines.append('};')
    lines.append('')
    return '\n'.join(lines)


if __name__ == '__main__':
    import os
    out = os.path.join(os.path.dirname(__file__), '..', 'components', 'PixelRabbitSprites.ts')
    with open(out, 'w') as f:
        f.write(emit_ts())
    print(f'wrote {os.path.normpath(out)}')
    # ASCII self-review dump
    import sys
    if '--ascii' in sys.argv:
        for name, frames in SPRITES.items():
            print(f'--- {name} frame0 ---')
            for row in frames[0]:
                print(row.replace('.', ' '))
