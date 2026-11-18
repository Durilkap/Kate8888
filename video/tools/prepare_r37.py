#!/usr/bin/env python3
"""Рилс 37 «ПРОШУ» (челлендж, день 2, 18.11): три полных дубля Кати, монтаж по фразам с чередованием дублей.

Фразы и их границы в каждом дубле: work/r37/sent.json (по словам из локальной расшифровки GigaAM v3).
Внутри фразы паузы длиннее 0,25 с вырезаются по участкам речи (silencedetect). Громкость выравнивается.
Пишет public/r37/talk.mp4 и public/r37/timeline.json (куски: дубль, фраза, время в ролике).
Использование (из папки video/): python3 tools/prepare_r37.py
"""
import json
import re
import subprocess
from pathlib import Path

FPS, PAD, MERGE = 30, 0.08, 0.25
# какой дубль на какую фразу (S1..S12): чередуем ракурсы, ни разу два одинаковых подряд
PLAN = ['t2', 't1', 't2', 't3', 't1', 't3', 't2', 't1', 't3', 't2', 't1', 't3']
TMP = Path('work/r37/pieces')


def speech_units(wav):
    log = subprocess.run(['ffmpeg', '-hide_banner', '-i', wav, '-af', 'silencedetect=noise=-30dB:d=0.25', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]))
    st = [float(v) for v in re.findall(r'silence_start: ([\d.]+)', log)]
    en = [float(v) for v in re.findall(r'silence_end: ([\d.]+)', log)]
    sil = list(zip(st, en + [dur] * (len(st) - len(en))))
    units, t = [], 0.0
    for a, b in sil:
        if a > t:
            units.append((t, a))
        t = b
    if t < dur:
        units.append((t, dur))
    return [(a, b) for a, b in units if b - a > 0.12]


def main():
    S = json.load(open('work/r37/sent.json'))
    U = {t: speech_units(f'work/r37/wav/{t}.wav') for t in ['t1', 't2', 't3']}
    TMP.mkdir(parents=True, exist_ok=True)
    pieces, tl, t_out = [], [], 0.0
    for i, take in enumerate(PLAN):
        a, b = S[take][i]
        parts = []
        for ua, ub in U[take]:
            x0, x1 = max(a, ua - PAD), min(b, ub + PAD)
            if x1 - x0 > 0.1:
                if parts and x0 - parts[-1][1] < MERGE:
                    parts[-1] = (parts[-1][0], x1)
                else:
                    parts.append((x0, x1))
        for k, (x0, x1) in enumerate(parts):
            p = TMP / f'p{i:02d}_{k}.mov'
            d = x1 - x0
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{x0:.3f}', '-i', f'work/r37/src/{take}.mov', '-t', f'{d:.3f}',
                            '-vf', 'fps=30,format=yuv420p', '-af', f'afade=t=in:d=0.015,afade=t=out:st={max(0, d - 0.025):.3f}:d=0.025',
                            '-c:v', 'libx264', '-crf', '13', '-preset', 'fast', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '1',
                            '-map_metadata', '-1', str(p)], check=True)
            real = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)]))
            pieces.append(p)
            tl.append({'s': i, 'take': take, 'src': [round(x0, 3), round(x1, 3)], 'out': [round(t_out, 3), round(t_out + real, 3)]})
            t_out += real
    lst = TMP / 'list.txt'
    lst.write_text(''.join(f"file '{p.resolve()}'\n" for p in pieces))
    Path('public/r37').mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-af',
                    'highpass=f=80,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000', '-c:v', 'libx264', '-crf', '15', '-preset', 'medium',
                    '-c:a', 'aac', '-b:a', '192k', '-map_metadata', '-1', 'public/r37/talk.mp4'], check=True)
    json.dump(tl, open('public/r37/timeline.json', 'w'))
    print(len(pieces), 'кусков,', round(t_out, 2), 'с')


if __name__ == '__main__':
    main()
