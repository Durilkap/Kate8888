#!/usr/bin/env python3
"""Рилс про сына (15 лет): куски видео, фото и скрины переписки для композиции SynReel.

Видео Кати (08.11): дверь открывается, сын с букетом (60 к/с); шары «15», сын берёт Катю на руки
и кружит (120 к/с, замедляется без рывков). Звук не переносится: музыку Катя добавит сама.
Скрины: обрезаются до сообщений, без имён и фамилий (скрины с фамилией Кати, именем сына
и про папу в ролик не берём, решение помощника 08.11, показано Кате).

Использование (из папки video/):
  python3 tools/prepare_r21.py work/r21/src public/r21
Пишет public/r21/*.mp4 и *.jpg (1080x1920, без метаданных) и src/syn_chat.json (границы сообщений).
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

W, H, FPS = 1080, 1920, 30

# имя: (файл, начало, конец, скорость, приближение, смещение по x, по y)
CLIPS = {
    'door_open': ('door.mov', 3.00, 4.10, 1.0, 1.0, 0.5, 0.5),    # дверь открывается, за ней сын
    'door_son': ('door.mov', 4.90, 7.70, 1.0, 1.3, 0.0, 0.0),     # сын в дверях улыбается; приближено влево-вверх: номер квартиры на стене справа за кадром
    'door_roses': ('door.mov', 13.30, 14.30, 1.0, 1.0, 0.5, 0.5),  # букет крупно
    'door_smile': ('door.mov', 14.60, 15.55, 1.0, 1.0, 0.5, 0.5),  # сын смеётся над букетом
    'spin': ('spin15.mov', 9.30, 15.00, 0.62, 1.25, 0.40, 0.55),   # обнимает, берёт на руки и кружит (120 к/с)
}

# скрин: какие сообщения убрать (индексы найденных сообщений), например обрезанное «Мам» снизу
CHATS = {
    'chat_ruga': [],
    'chat_grust': [],
    'chat_prosti': [4],
    'chat_mamochka': [],
}

PHOTOS = ['photo_flowers', 'photo_selfie']


def bubbles(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    white = (r > 245) & (g > 245) & (b > 245)
    lgreen = (r > 210) & (r < 240) & (g > 245) & (b > 175) & (b < 215)
    on = (white | lgreen).mean(axis=1) > 0.12
    segs, start = [], None
    for y, v in enumerate(on):
        if v and start is None:
            start = y
        if not v and start is not None:
            segs.append([start, y])
            start = None
    if start is not None:
        segs.append([start, len(on)])
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < 6:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [s for s in merged if s[1] - s[0] > 30]


def clip(src, dst, name, spec):
    f, a, b, speed, zoom, ox, oy = spec
    vf = ''
    if zoom != 1.0:
        vf += f'crop=iw/{zoom}:ih/{zoom}:(iw-iw/{zoom})*{ox}:(ih-ih/{zoom})*{oy},'
    vf += f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}'
    if speed != 1.0:
        vf += f',setpts=PTS/{speed}'
    vf += f',fps={FPS},format=yuv420p'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a}', '-to', f'{b}', '-i', str(src / f), '-an', '-vf', vf,
                    '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-map_metadata', '-1', str(dst / f'{name}.mp4')],
                   check=True)
    n = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
                        'stream=nb_read_frames', '-of', 'csv=p=0', str(dst / f'{name}.mp4')],
                       capture_output=True, text=True).stdout.strip()
    print(name, n, 'кадров')


def cover(im):
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for name, spec in CLIPS.items():
        clip(src, dst, name, spec)

    # фон для переписки: букет из видео, сильно размыт и притемнён
    tmp = dst / '_bg.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '32.9', '-i', str(src / 'door.mov'), '-frames:v', '1', str(tmp)], check=True)
    bg = cover(Image.open(tmp).convert('RGB')).filter(ImageFilter.GaussianBlur(45))
    ImageEnhance.Brightness(bg).enhance(0.55).save(dst / 'chat_bg.jpg', quality=92)
    tmp.unlink()

    for p in PHOTOS:
        im = Image.open(src / f'{p}.jpg').convert('RGB')  # без EXIF: сохраняем только пиксели
        cover(im).save(dst / f'{p}.jpg', quality=92)

    data = {}
    for name, drop in CHATS.items():
        im = Image.open(src / f'{name}.jpg').convert('RGB')
        segs = [s for i, s in enumerate(bubbles(im)) if i not in drop]
        top, bottom = max(0, segs[0][0] - 20), min(im.height, segs[-1][1] + 20)
        im.crop((0, top, im.width, bottom)).save(dst / f'{name}.jpg', quality=95)
        data[name] = {'w': im.width, 'h': bottom - top, 'bubbles': [[s[0] - top, s[1] - top] for s in segs]}
        print(name, data[name])
    out = Path(__file__).resolve().parent.parent / 'src' / 'syn_chat.json'
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
