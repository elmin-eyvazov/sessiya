#!/usr/bin/env python3
"""Генерирует иконки сайта (icons/*.png, icons/favicon.svg) и превью для соцсетей og.png."""
from PIL import Image, ImageDraw, ImageFont
import os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BLUE, WHITE, INK = (47, 91, 234), (255, 255, 255), (22, 24, 29)
F = '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
FR = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'

def icon(size, pad=0.0):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    r = int(size * (0.22 if pad == 0 else 0)); p = int(size * pad)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BLUE)
    f = ImageFont.truetype(F, int(size * 0.5))
    d.text((size / 2, size / 2 + size * 0.02), 'S+', font=f, fill=WHITE, anchor='mm')
    return im

for s, n in ((192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'apple-touch-icon.png')):
    icon(s, 0 if n != 'apple-touch-icon.png' else 0.01).convert('RGBA').save(f'{root}/icons/{n}')
# maskable: full bleed
icon(512, 0.01).save(f'{root}/icons/maskable-512.png')
open(f'{root}/icons/favicon.svg', 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2f5bea"/><text x="32" y="44" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="32" fill="#fff" text-anchor="middle">S+</text></svg>')

W, H = 1200, 630
im = Image.new('RGB', (W, H), (244, 245, 247)); d = ImageDraw.Draw(im)
d.rounded_rectangle([60, 60, W - 60, H - 60], radius=36, fill=WHITE, outline=(227, 230, 235), width=2)
im.paste(icon(120), (110, 110), icon(120))
d.text((260, 170), 'Sessiya', font=ImageFont.truetype(F, 72), fill=INK, anchor='lm')
d.text((260 + ImageFont.truetype(F, 72).getlength('Sessiya'), 170), '+', font=ImageFont.truetype(F, 72), fill=BLUE, anchor='lm')
d.text((110, 300), 'Tələbə üçün hər şey — bir yerdə', font=ImageFont.truetype(F, 52), fill=INK, anchor='lm')
fr = ImageFont.truetype(FR, 34)
y = 390
for t in ('📝  Testlər və imtahana hazırlıq', '🤖  Süni intellektlə test yaratma · Duel', '🧮  Bal kalkulyatoru · İmtahan təqvimi'):
    d.text((110, y), t.replace('📝  ', '•  ').replace('🤖  ', '•  ').replace('🧮  ', '•  '), font=fr, fill=(75, 85, 99), anchor='lm'); y += 56
im.save(f'{root}/og.png', optimize=True)
print('icons + og.png done')
