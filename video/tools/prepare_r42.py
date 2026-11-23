#!/usr/bin/env python3
"""Рилс 42 «Красивая попа» (день 6): кадры зала без размытия фона (Катя 23.11: «Не размывай ничего»).

В рилсе 13 фон за Катей был размыт (tools/video_portrait_blur.py). Здесь те же отрезки из исходников
(work/r13/dl, в git не попадают) без размытия; начало найдено сравнением кадров с размытыми клипами.
Пишет public/sport/raw_<имя>.mp4, 1080x1920 30 к/с без звука. Использование (из video/): python3 tools/prepare_r42.py
"""
import subprocess

# цвет (куратор 23.11: «много синевы, кадр холодный, лицо с синевой»): теплее, убрать бирюзу из фона и синеву с кожи,
# белые чуть кремовые; плашки с текстом в Remotion остаются белыми
WARM = ('colortemperature=temperature=4700:mix=0.85,'
        'colorbalance=rs=0.04:gs=-0.02:bs=-0.07:rm=0.05:gm=-0.03:bm=-0.06:rh=0.02:gh=-0.01:bh=-0.03,'
        'selectivecolor=cyans=-0.35 0.12 0.15 0:blues=-0.2 0.05 0.2 0:greens=-0.1 0.1 0 0:whites=0 0 0.04 0:neutrals=-0.03 0.02 0.04 0,'
        'eq=saturation=1.08:gamma=1.08')

CLIPS = [  # (исходник, начало, длительность, имя как в рилсе 13)
    ('work/r13/dl/v1.mp4', 7.0, 1.4, 'c1'),   # отведение ноги в кроссовере
    ('work/r13/dl/v2.mov', 3.0, 1.9, 'c4'),   # махи у зеркала
    ('work/r13/dl/v1.mp4', 1.0, 1.1, 'c6'),   # махи ногой с мячом
    ('work/r13/dl/v2.mov', 8.0, 3.1, 'c7'),   # махи на четвереньках
    ('work/r13/dl/v2.mov', 15.0, 1.5, 'c9'),  # мах крупно
]


def main():
    for src, ss, t, n in CLIPS:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-t', str(t), '-i', src, '-an',
                        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,' + WARM + ',format=yuv420p',
                        '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-map_metadata', '-1',
                        f'public/sport/raw_{n}.mp4'], check=True)
    # фото в жёлтой футболке тем же цветом
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'public/sport/sq2.jpg', '-vf', WARM, '-q:v', '2',
                    'public/sport/sq2_warm.jpg'], check=True)
    print('кусков', len(CLIPS), '+ фото')


if __name__ == '__main__':
    main()
