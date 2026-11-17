#!/usr/bin/env python3
"""Рилс 36 (челлендж, день 1): карточки комментариев из скринов Кати и куски видео.

Карточки: вырез комментария из скрина, ник и аватарка закрыты (пикселизация и размытие, решение Кати 17.11),
сердечко справа обрезано, скруглённые углы. Скрины и карточки в git не попадают (work/ и *.png в .gitignore).
Выбраны комментарии без мата, без «бабули», без намёков на секс и без упоминания других людей.
Использование (из папки video/): python3 tools/prepare_r36.py
"""
import subprocess
from PIL import Image, ImageDraw, ImageFilter

SH = 'work/r36/shots'
# (файл, вырез (x0, y0, x1, y1), закрыть [(x0, y0, x1, y1)] в координатах выреза)
CARDS = [
    ('s03.jpg', (0, 0, 1150, 140), [(18, 6, 152, 136), (150, 10, 570, 68)]),      # «Женщина, у вас зеркало дома есть?»
    ('s01.jpg', (0, 210, 1150, 345), [(18, 0, 152, 130), (150, 10, 570, 66)]),    # «Вот так выглядит запах молекулы»
    ('s04.jpg', (0, 0, 1150, 135), [(18, 4, 152, 132), (150, 10, 530, 66)]),      # «И какая цена? 😂»
    ('s09.jpg', (0, 0, 1150, 215), [(18, 0, 152, 112), (150, 0, 580, 52)]),       # «...на серебристый ландыш!!»
    ('s05.jpg', (0, 0, 1150, 112), [(18, 0, 152, 112), (150, 0, 640, 46)]),       # «Ты себя то видела? Страшилище болотное»
    ('s07.jpg', (0, 40, 1150, 172), [(18, 8, 152, 128), (150, 12, 650, 68)]),     # «Не портите себя больше»
]
# куски видео: (файл, начало, конец, имя, скорость)
CLIPS = [
    ('d1.mov', 4.6, 6.4, 'a', 1.0),    # телефон экраном вниз мигает вспышкой, Катя не реагирует
    ('d2.mov', 3.9, 5.9, 'b', 1.0),    # смотрит в телефон и кладёт его экраном вниз
    ('d3.mov', 2.0, 4.0, 'c', 1.0),    # спокойно пьёт
    ('d3.mov', 9.25, 10.05, 'd', 0.8), # спокойный взгляд в камеру; до шага к камере (с 10,1 с Катя идёт выключать)
]


def cover(im, box):
    x0, y0, x1, y1 = box
    reg = im.crop(box)
    w, h = reg.size
    reg = reg.resize((max(1, w // 18), max(1, h // 18)), Image.BILINEAR).resize((w, h), Image.NEAREST)
    reg = reg.filter(ImageFilter.GaussianBlur(10))
    im.paste(reg, (x0, y0))


def main():
    for i, (f, crop, covers) in enumerate(CARDS, 1):
        im = Image.open(f'{SH}/{f}').convert('RGB').crop(crop)
        for b in covers:
            cover(im, b)
        m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=34, fill=255)
        out = Image.new('RGBA', im.size)
        out.paste(im, (0, 0), m)
        out.save(f'public/r36/c{i}.png')
    for f, a, b, n, sp in CLIPS:
        vf = f'setpts=PTS/{sp},scale=1080:1920:flags=lanczos,fps=30,format=yuv420p'
        if f != 'd3.mov':  # исходники 464x848: мягкая резкость после увеличения
            vf = f'setpts=PTS/{sp},scale=1080:1920:flags=lanczos,unsharp=5:5:0.6,fps=30,format=yuv420p'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', f'work/r36/src/{f}', '-an',
                        '-vf', vf, '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-map_metadata', '-1',
                        f'public/r36/{n}.mp4'], check=True)
    print('карточек', len(CARDS), 'кусков', len(CLIPS))


if __name__ == '__main__':
    main()
