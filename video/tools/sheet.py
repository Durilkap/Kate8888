#!/usr/bin/env python3
"""Контакт-лист кадров видео: python3 tools/sheet.py видео начало конец шаг выход_без_расширения [ширина]."""
import subprocess, sys, os
from concurrent.futures import ThreadPoolExecutor
f, a, b, st, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
w = int(sys.argv[6]) if len(sys.argv) > 6 else 144
h = w * 16 // 9
ts = []; t = a
while t <= b + 1e-6: ts.append(round(t, 2)); t += st
def one(i_t):
    i, t = i_t; o = f'{out}_{i}.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t}', '-i', f, '-frames:v', '1', '-vf', f'scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text={t}:x=3:y=3:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.6', o])
    return o
with ThreadPoolExecutor(8) as ex: fs = [x for x in ex.map(one, enumerate(ts)) if os.path.exists(x)]
cols = 10
rows = [fs[i:i + cols] for i in range(0, len(fs), cols)]
rowf = []
for r, row in enumerate(rows):
    while len(row) < cols: row = row + [row[-1]]
    o = f'{out}_r{r}.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + sum([['-i', x] for x in row], []) + ['-filter_complex', ''.join(f'[{i}]' for i in range(cols)) + f'hstack=inputs={cols}', o]); rowf.append(o)
if len(rowf) > 1:
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + sum([['-i', x] for x in rowf], []) + ['-filter_complex', ''.join(f'[{i}]' for i in range(len(rowf))) + f'vstack=inputs={len(rowf)}', out + '.jpg'])
else:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', rowf[0], out + '.jpg'])
for x in set(fs + rowf):
    if os.path.exists(x): os.remove(x)
