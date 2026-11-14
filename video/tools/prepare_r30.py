#!/usr/bin/env python3
"""Рилс 30 «За окном ноябрь» (14.11): готовое видео Кати с отдыха (720p, 15 с, со своими стикерами и склейками)
и снежное лобовое стекло из рилса 26 (public/r26/slow2.mp4). Звук не переносится: музыку Катя добавит сама.

Использование (из папки video/):
  python3 tools/prepare_r30.py work/r30/src public/r30
"""
import subprocess
import sys
from pathlib import Path

W, H, FPS = 1080, 1920, 30


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    # отдых: без чёрного кадра в начале и повторов в конце, 720p -> 1080 с лёгкой резкостью
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '0.4', '-to', '12.0', '-i', str(src / 'rest.mp4'), '-an',
                    '-vf', f'scale={W}:{H}:flags=lanczos,unsharp=5:5:0.5,fps={FPS},format=yuv420p',
                    '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-map_metadata', '-1', str(dst / 'rest.mp4')], check=True)
    print('rest.mp4')
    # дождь из окна (Катя 14.11, 240 к/с): рука открывает шторы; капли на стекле, фон не в фокусе
    for name, a, b, speed in [('curtain', 1.3, 3.9, 1.0), ('drops', 6.55, 8.05, 0.5)]:
        vf = f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}'
        if speed != 1.0:
            vf += f',setpts=PTS/{speed}'
        vf += f',fps={FPS},format=yuv420p'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a}', '-to', f'{b}', '-i', str(src / 'rain.mov'), '-an', '-vf', vf,
                        '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-map_metadata', '-1', str(dst / f'{name}.mp4')], check=True)
        print(name)
    # стоп-кадр для финала: 11,8 с исходника (кадр 342 rest.mp4), без резкости (проверка 14.11: зерно на коже)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '11.8', '-i', str(src / 'rest.mp4'), '-frames:v', '1',
                    '-vf', f'scale={W}:{H}:flags=lanczos', '-q:v', '2', str(dst / 'rest_last.jpg')], check=True)


if __name__ == '__main__':
    main()
