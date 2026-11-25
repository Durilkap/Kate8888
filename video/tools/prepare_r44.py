#!/usr/bin/env python3
"""Рилс 44 (челлендж, день 8, формат «Threads» на своих комментариях): карточки комментариев под «Мужчины, выбирайте».

Скрины Кати 25.11 (work/r44/shots, в git не попадают). Ник и аватарка каждого автора закрыты (пикселизация и размытие,
решение Кати 17.11), упоминание ника в ответе Кати тоже. Пишет public/r44/c<N>.png со скруглёнными углами.
Использование (из video/): python3 tools/prepare_r44.py
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SH = 'work/r44/shots'
# (файл, вырез (x0, y0, x1, y1), закрыть [(x0, y0, x1, y1)] в координатах выреза, замены текста [(x0,y0,x1,y1,текст)])
CARDS = [
    ('083e9fc5-image.jpg', (0, 22, 1320, 152), [(30, 0, 148, 122), (150, 18, 420, 66)], []),          # «Не знал, что молекулы пахнут»
    ('f21e51ab-image.jpg', (0, 8, 1320, 330), [(30, 0, 148, 108), (150, 6, 370, 50), (250, 262, 520, 312)], []),  # «Это все названия порошков...» + ответ Кати
    ('083e9fc5-image.jpg', (0, 232, 1320, 395), [(30, 0, 148, 110), (150, 12, 365, 60)], []),       # «Нет уж, мне бывшей хватило...»
    ('f21e51ab-image.jpg', (0, 405, 1320, 568), [(30, 0, 148, 110), (150, 10, 670, 56)], []),       # «Да нам пофиг, от кого чем пахнет...»
    ('17028560-image.jpg', (0, 10, 1320, 228), [(30, 0, 148, 112), (150, 4, 405, 58)], [(154, 117, 272, 160, 'х*рню')]),  # «Влюбляемся, но выключаем...»
    ('29ed8686-image.jpg', (0, 10, 1320, 152), [(30, 0, 148, 112), (150, 0, 290, 60)], []),         # «Инфаркт и смерть...» (запас)
]


def cover(im, box):
    x0, y0, x1, y1 = box
    reg = im.crop(box)
    w, h = reg.size
    reg = reg.resize((max(1, w // 16), max(1, h // 16)), Image.BILINEAR).resize((w, h), Image.NEAREST)
    reg = reg.filter(ImageFilter.GaussianBlur(8))
    im.paste(reg, (x0, y0))


def main():
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 40)
    for i, (f, crop, covers, repl) in enumerate(CARDS, 1):
        im = Image.open(f'{SH}/{f}').convert('RGB').crop(crop)
        for b in covers:
            cover(im, b)
        d = ImageDraw.Draw(im)
        for x0, y0, x1, y1, t in repl:
            d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255))
            d.text((x0 + 4, y0 + 28), t, fill=(20, 20, 20), font=font, anchor='ls')  # на базовой линии строки
        m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=34, fill=255)
        out = Image.new('RGBA', im.size)
        out.paste(im, (0, 0), m)
        out.save(f'public/r44/c{i}.png')
    print('карточек', len(CARDS))


if __name__ == '__main__':
    main()
