#!/usr/bin/env python3
"""Рилс 14: плавные замедленные копии видеокусков (0,6 скорости, кадры смешиваются, без рывков).

Под голос кадры стали длиннее, чем куски видео. Монтаж (src/WeddingReel.tsx) берёт замедленную копию
и проигрывает её чуть быстрее, сколько нужно (скорость 1-1,67), поэтому движение остаётся плавным.

Использование (из папки video/):
  python3 tools/slow_wedding_clips.py
Пишет public/wed/m1_slow.mp4 ... m8_slow.mp4, v1_slow.mp4, v2_slow.mp4 (в git не попадают).
"""
import subprocess
from pathlib import Path

SLOW = 0.6
WED = Path(__file__).resolve().parent.parent / 'public' / 'wed'
CLIPS = [f'm{i}' for i in range(1, 9)] + ['v1', 'v2']

for name in CLIPS:
    src, dst = WED / f'{name}.mp4', WED / f'{name}_slow.mp4'
    vf = f'setpts=PTS/{SLOW},framerate=fps=30:interp_start=0:interp_end=255:scene=100,format=yuv420p'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-vf', vf, '-an', '-c:v', 'libx264', '-crf', '14',
                    '-preset', 'slow', '-map_metadata', '-1', str(dst)], check=True)
    print(dst.name)
