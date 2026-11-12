#!/usr/bin/env python3
"""Рилс 26 «Спешка» (12.11): видео Кати из машины (снег, дорога, деревня), снято 240 к/с.

Главный приём: плавный переход скорости (speed ramp). Дорога несётся в 5 раз быстрее с настоящим размытием
движения (усредняются соседние кадры 240 к/с), затем время плавно замедляется до 0,2x, снег парит.
Приборная панель с одометром и температурой (s2 после 18,5 с) в кадр не берётся. Звук не переносится.

Использование (из папки video/):
  python3 tools/prepare_r26.py work/r26/src public/r26
"""
import math
import subprocess
import sys
from pathlib import Path

import numpy as np

W, H, FPS, SRC_FPS = 1080, 1920, 30, 240
FRAME = W * H * 3
SHUTTER = 0.8  # доля шага, которую усредняем при ускорении (размытие движения)

# имя: (файл, начало исходника, длительность результата, точки скорости [(время результата, скорость)])
RAMPS = {
    # ускорение 5x, плавное торможение до 0,2x
    'ramp1': ('s1.mov', 0.0, 9.4, [(0.0, 5.0), (2.4, 5.0), (3.9, 0.2), (9.4, 0.2)]),
    # деревня и дворник, замедлено 0,25x (дворник проходит около 15,5-16,3 с исходника)
    'slow2': ('s2.mov', 14.4, 11.8, [(0.0, 0.25), (11.8, 0.25)]),
}


def speed_at(t, pts):
    if t <= pts[0][0]:
        return pts[0][1]
    for (t0, s0), (t1, s1) in zip(pts, pts[1:]):
        if t0 <= t <= t1:
            if t1 == t0:
                return s1
            u = (t - t0) / (t1 - t0)
            u = u * u * (3 - 2 * u)  # плавный старт и финиш
            return math.exp(math.log(s0) + (math.log(s1) - math.log(s0)) * u)
    return pts[-1][1]


def ramp(src, dst, name, spec):
    f, start, dur, pts = spec
    n_out = round(dur * FPS)
    # сколько исходника нужно
    total = sum(speed_at(i / FPS, pts) * SRC_FPS / FPS for i in range(n_out)) + 4
    real = total / SRC_FPS + 0.2
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f'{start}', '-i', str(src / f), '-t', f'{real:.3f}', '-an',
                            '-vf', f'scale={W}:{H}:flags=lanczos,format=rgb24', '-fps_mode', 'passthrough',
                            '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                            '-i', '-', '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                            '-map_metadata', '-1', str(dst / f'{name}.mp4')], stdin=subprocess.PIPE)
    buf = {}
    read_idx = 0
    last = None

    def get(i):
        nonlocal read_idx, last
        while read_idx <= i:
            raw = dec.stdout.read(FRAME)
            if len(raw) < FRAME:
                return last
            last = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
            buf[read_idx] = last
            read_idx += 1
        return buf.get(i, last)

    p = 0.0
    for n in range(n_out):
        adv = speed_at(n / FPS, pts) * SRC_FPS / FPS
        if adv > 1.5:
            k0, k1 = int(p), max(int(p) + 1, int(p + adv * SHUTTER))
            acc = np.zeros((H, W, 3), np.float32)
            for k in range(k0, k1):
                acc += get(k)
            img = (acc / (k1 - k0)).astype(np.uint8)
        else:
            k = int(round(p))
            img = get(k)
        enc.stdin.write(np.ascontiguousarray(img).tobytes())
        p += adv
        for k in [k for k in buf if k < int(p) - 1]:
            del buf[k]
    enc.stdin.close()
    enc.wait()
    dec.stdout.close()
    dec.kill()
    print(name, n_out, 'кадров, исходник', round(p / SRC_FPS, 2), 'с')


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    names = sys.argv[3:] or list(RAMPS)
    for name in names:
        ramp(src, dst, name, RAMPS[name])


if __name__ == '__main__':
    main()
