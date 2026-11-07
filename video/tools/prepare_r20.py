#!/usr/bin/env python3
"""Рилс 20 «Мой нерабочий день: сырники» (формат серии): куски видео Кати дома (07.11).

Видео 60 к/с: v1 выход на кухню и потягивание, v2 вода, коллаген, аэрогриль, тарелка (образ: комбинезон). v3 (другой образ) не взят.
Размытия нет (решение Кати 05.11 для серии). Звук не переносится: Катя добавит музыку.

Использование (из папки video/):
  python3 tools/prepare_r20.py work/r20/src public/r20
Пишет public/r20/*.mp4: 1080x1920, 30 к/с, без звука и метаданных.
"""
import subprocess
import sys
from pathlib import Path

W, H, FPS = 1080, 1920, 30

# имя: (файл, начало, конец (с исходника), скорость[, обрезка ffmpeg до масштаба])
CLIPS = {
    'stretch': ('v1.mov', 8.20, 10.00, 1.0),   # потягивается на кухне
    'water': ('v2.mov', 2.80, 4.80, 1.0),      # пьёт воду
    'collagen': ('v2.mov', 12.60, 15.00, 1.0), # изучает этикетку на банке коллагена (марка не видна)
    'airfryer': ('v2.mov', 37.30, 39.80, 1.0), # достаёт сырники из аэрогриля
    'plating': ('v2.mov', 58.40, 60.20, 1.0),  # у стола с тарелкой
    'plate': ('v2.mov', 60.20, 62.00, 1.0),    # идёт с тарелкой к камере
    'plateclose': ('v2.mov', 62.00, 63.20, 0.6),  # тарелка у камеры, замедленно
    'wink': ('v2.mov', 63.20, 65.20, 0.6),     # подмигивание (63,4-64,5 с), замедленно
    # вариант в брюках-зебре (видео 3, выбор Кати 07.11)
    'z_pour': ('v3.mov', 3.20, 5.00, 1.0),     # наливает воду из чайника (марка чайника не видна)
    'z_drink': ('v3.mov', 11.00, 13.00, 1.0),  # пьёт воду
    'z_collagen': ('v3.mov', 20.40, 22.80, 1.0),  # изучает этикетку на банке коллагена
    'z_eat1': ('v3.mov', 37.60, 39.60, 1.0),   # ест сырники
    'z_eat2': ('v3.mov', 39.60, 41.40, 1.0),   # ест сырники
    'z_wink': ('v3.mov', 42.00, 44.10, 0.6),   # подходит с тарелкой и подмигивает (около 43,2 с), замедленно
}


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for name, spec in CLIPS.items():
        f, a, b, speed = spec[:4]
        pre = spec[4] + ',' if len(spec) > 4 else ''
        vf = pre + f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}'
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
