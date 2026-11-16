#!/usr/bin/env python3
"""Рилс 34 «Мужчины, выбирайте» (16.11): разговор Кати в машине, дубль 3 (договорённый до конца).

Режет дубль по паузам (silencedetect), паузы ужимает до PAUSE, выравнивает громкость, собирает public/r34/talk.mp4
и пишет public/r34/cuts.json (границы кусков в кадрах итогового ролика) для смены крупности на склейках.
Исходник сначала уменьшается до 1080x1920, 30 к/с (иначе 4K 60 к/с не помещается в память при нарезке):
  ffmpeg -i work/r34/src/t3.mov -vf "scale=1080:1920:flags=lanczos,fps=30,format=yuv420p" -c:v libx264 -crf 14 -c:a pcm_s16le work/r34/t3_1080.mov
Использование (из папки video/): python3 tools/prepare_r34.py work/r34/t3_1080.mov public/r34
"""
import json
import re
import subprocess
import sys
from pathlib import Path

PAD, PAUSE, FPS = 0.12, 0.28, 30


def speech(src):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(src), '-vn', '-af', 'silencedetect=noise=-32dB:d=0.4', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    dur = float(re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).group(3)) + 60 * float(re.search(r'Duration: (\d+):(\d+)', out).group(2))
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    sil = list(zip(st, en + [dur] * (len(st) - len(en))))
    segs, t = [], 0.0
    for a, b in sil:
        if a > t:
            segs.append((t, a))
        t = b
    if t < dur:
        segs.append((t, dur))
    segs = [(max(0, a - PAD), min(dur, b + PAD)) for a, b in segs if b - a > 0.25]
    return segs


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    segs = speech(src)
    parts, cuts, t = [], [0], 0.0
    fc = []
    for i, (a, b) in enumerate(segs):
        d = b - a + (PAUSE - 2 * PAD if i < len(segs) - 1 else 0.3)
        d = max(d, b - a)
        fc.append(f'[0:v]trim={a:.3f}:{a + d:.3f},setpts=PTS-STARTPTS[v{i}];'
                  f'[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={b - a - 0.04:.3f}:d=0.04,apad=whole_dur={d:.3f}[a{i}];')
        parts.append(f'[v{i}][a{i}]')
        t += d
        cuts.append(round(t * FPS))
    fc.append(''.join(parts) + f'concat=n={len(segs)}:v=1:a=1[v][a];[v]format=yuv420p[vo];'
              '[a]highpass=f=80,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[ao]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-filter_complex', ''.join(fc), '-map', '[vo]', '-map', '[ao]',
                    '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-map_metadata', '-1',
                    str(dst / 'talk.mp4')], check=True)
    json.dump({'segs': segs, 'cuts': cuts}, open(dst / 'cuts.json', 'w'))
    print(len(segs), 'кусков,', round(t, 2), 'с; склейки (кадры):', cuts)


if __name__ == '__main__':
    main()
