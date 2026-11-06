#!/usr/bin/env python3
"""Рилс 19 «Что девушка делает в типографии?» (серия про этикетки, формат рилса 18): куски видео Кати.

Видео с производства (06.11): замедленная съёмка 240 к/с (v2, v3) замедляется без рывков, остальное 60 к/с.
Размытия нет (решение Кати 05.11 для серии). Звук не переносится: Катя добавит музыку.

Использование (из папки video/):
  python3 tools/prepare_r19.py work/r19/src public/r19
Пишет public/r19/*.mp4: 1080x1920, 30 к/с, без звука и метаданных.
"""
import subprocess
import sys
from pathlib import Path

W, H, FPS = 1080, 1920, 30

# имя: (файл, начало, конец (с исходника), скорость)
CLIPS = {
    'heels': ('v7.mov', 5.20, 6.80, 1.0),     # каблуки идут к камере по полу цеха (хук)
    'walk': ('v3.mov', 4.60, 5.40, 0.40),     # идёт к камере по цеху, замедленно (240 к/с)
    'line': ('v4.mov', 0.30, 2.40, 1.0),      # идёт вдоль печатной линии
    'rolls': ('v6.mov', 0.20, 1.90, 1.0),     # рука на рулонах
    'phone': ('v1.mp4', 1.00, 2.90, 1.0),     # разговор по телефону
    'desk': ('v10.mov', 2.00, 3.90, 1.0),     # за компьютером
    'crouch': ('v7.mov', 9.00, 10.70, 1.0),   # присела, каблук крупно
    'smile': ('v3.mov', 6.10, 6.90, 0.38),    # оглядывается и улыбается, замедленно
    'wink': ('v9.mov', 2.30, 4.95, 0.66),     # подмигивание (около 3,8 с), чуть замедленно
}


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for name, (f, a, b, speed) in CLIPS.items():
        vf = f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}'
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


if __name__ == '__main__':
    main()
