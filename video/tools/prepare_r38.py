#!/usr/bin/env python3
"""Рилс 38 (челлендж, день 3, вопрос): нарезка танца Кати для VoprosReel.

Катя 19.11 прислала 5 видео танца (iPhone 4K HDR, 60 и 30 к/с): два в белом платье, три в красном топе.
Выбран образ в красном: Катя близко к камере, улыбается, взмах волос, взгляд через плечо.
Исходники лежат в work/r38/src (в git не попадают). Использование (из папки video/): python3 tools/prepare_r38.py
"""
import subprocess

SRC = 'work/r38/src'
# (файл, начало, конец, имя, скорость, кроп из 2160x3840 или None)
CLIPS = [
    ('IMG_3037.MOV', 0.0, 1.75, 'k1', 1.0, None),    # крупно, лицом к камере, улыбка, танец
    ('IMG_3037.MOV', 9.9, 11.9, 'k2', 1.0, None),   # крупно, руки вверх, улыбка
    ('IMG_3037.MOV', 12.2, 13.2, 'k3', 0.7, None),  # разворот со взмахом волос, замедление
    # взгляд через плечо с улыбкой, финал; справа стоят посторонние девушки с телефоном: кроп левой части кадра
    ('IMG_3038.MOV', 19.55, 20.95, 'k4', 0.8, (1566, 2784, 0, 317)),
]


def main():
    for f, a, b, n, sp, crop in CLIPS:
        cr = 'crop=%d:%d:%d:%d,' % crop if crop else ''
        vf = f'setpts=PTS/{sp},{cr}scale=1080:1920:flags=lanczos,fps=30,format=yuv420p'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', f'{SRC}/{f}', '-an',
                        '-vf', vf, '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-map_metadata', '-1',
                        f'public/r38/{n}.mp4'], check=True)
    print('кусков', len(CLIPS))


if __name__ == '__main__':
    main()
