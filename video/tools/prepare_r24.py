#!/usr/bin/env python3
"""Рилс 24 «Закулисье твоего холодильника» (11.11): видео и фото Кати с производства.

Видео 4K 60 к/с (z1-z7), замедления без повторов кадров. Звук не переносится: музыку Катя добавит сама.
Не берём: фото с курткой-логотипом ГАММА-М (p_pallets_wide), фото с этикеткой поставщика на рулоне (p_roll),
фото вёдер с крупными логотипами поставщика (p_ink), фото машины с листами на стене (p_machine).
Фото готовых рулонов (p_pallets) обрезано: без монитора, бумаг на стене и листа на паллете.

Использование (из папки video/):
  python3 tools/prepare_r24.py work/r24/src public/r24
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image

W, H, FPS = 1080, 1920, 30

# имя: (файл, начало, конец, скорость, приближение, центр x, центр y)
CLIPS = {
    'mat': ('z1.mov', 2.00, 3.70, 0.85, 1.0, 0.5, 0.5),    # склад: рулоны материала на паллетах
    'ink': ('z2.mov', 5.40, 7.10, 0.85, 1.0, 0.5, 0.5),    # краска в вёдрах
    'print': ('z4.mov', 8.55, 9.55, 0.6, 1.0, 0.5, 0.5),   # печатная машина, вал с краской, замедлено
    'cut': ('z3.mov', 5.00, 6.45, 1.0, 1.0, 0.5, 0.5),     # отход после вырубки уходит на намотку (подтвердить у Кати)
    'wind': ('z8.mov', 0.40, 1.75, 0.8, 1.0, 0.5, 0.5),    # намотка: ленты этикеток сматываются в рулоны (правильный ролик от Кати 11.11; z7 был не тот)
    'walk_a': ('z5.mov', 6.00, 9.70, 2.4, 1.0, 0.5, 0.5),  # Катя идёт по цеху к камере, ускорено
    'walk_b': ('z5.mov', 9.80, 10.55, 0.6, 1.0, 0.5, 0.5),  # каблуки проходят у камеры, замедлено
    'fin': ('z6.mov', 2.10, 3.60, 0.8, 1.25, 1.0, 0.3),   # селфи, подмигивание около 3,1 с (стоп-кадр: кадр 37, fin_freeze.jpg);
    # с 2,1 с: без рулона клиента в руке; приближено вправо: бирка поставщика материала слева за кадром (проверка 11.11)
    'tease1': ('z4.mov', 9.20, 9.60, 1.0, 1.3, 0.5, 0.5),
    'tease2': ('z2.mov', 8.00, 8.40, 1.0, 1.3, 0.5, 0.5),
    'tease3': ('z3.mov', 2.00, 2.40, 1.0, 1.3, 0.5, 0.5),
    'tease4': ('z7.mov', 12.20, 12.60, 1.0, 1.3, 0.5, 0.5),
}


def clip(src, dst, name, spec):
    f, a, b, speed, z, ox, oy = spec
    vf = f'crop=iw/{z}:ih/{z}:(iw-iw/{z})*{ox}:(ih-ih/{z})*{oy},' if z != 1.0 else ''
    vf += f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}'
    if speed != 1.0:
        vf += f',setpts=PTS/{speed}'
    vf += f',fps={FPS},format=yuv420p'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a}', '-to', f'{b}', '-i', str(src / f), '-an', '-vf', vf,
                    '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-map_metadata', '-1', str(dst / f'{name}.mp4')], check=True)
    print(name)


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for name, spec in CLIPS.items():
        clip(src, dst, name, spec)
    # стоп-кадр подмигивания для финала
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(dst / 'fin.mp4'), '-vf', "select='eq(n\\,37)'", '-frames:v', '1',
                    '-q:v', '2', str(dst / 'fin_freeze.jpg')], check=True)
    # готовые рулоны: обрезка 9:16 по передней паллете (без монитора, листа на паллете, бумаг на стене)
    im = Image.open(src / 'p_pallets.jpg').convert('RGB')
    x0, w = 30, 940  # правее x 970 край листа-задания (проверка 11.11)
    y1 = im.height
    y0 = y1 - round(w * 16 / 9)
    im.crop((x0, y0, x0 + w, y1)).resize((W, H), Image.LANCZOS).save(dst / 'done.jpg', quality=93)
    print('done.jpg', im.size)


if __name__ == '__main__':
    main()
