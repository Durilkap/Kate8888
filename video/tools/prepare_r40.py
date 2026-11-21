#!/usr/bin/env python3
"""Рилс 40 (челлендж, день 5): «Фразы, после которых я обхожу человека за километр».

Катя 21.11 сняла один дубль дома (work/r40/take/take.mov, говорит и собирается). Единицы речи из расшифровки
(work/r40/units.json, паузы по silencedetect) склеиваются без длинных пауз: запас 0,08 с до и 0,12 с после.
Пишет public/r40/talk.mp4 (видео 1080x1920 30 к/с и голос -14 LUFS) и public/r40/timeline.json (начало единиц в ролике).
Использование (из папки video/): python3 tools/prepare_r40.py
"""
import json, subprocess

U = [u for u in json.load(open('work/r40/units.json')) if u['words']]
PRE, POST = 0.08, 0.12


def main():
    parts, tl, t = [], [], 0.0
    fc = []
    for i, u in enumerate(U):
        a, b = max(0, u['a'] - PRE), u['b'] + POST
        fc.append(f"[0:v]trim={a:.3f}:{b:.3f},setpts=PTS-STARTPTS,scale=1080:1920,fps=30[v{i}];"
                  f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[a{i}];")
        tl.append({'k': u['k'], 'src': [round(a, 3), round(b, 3)], 'out': [round(t, 3), round(t + b - a, 3)]})
        t += b - a
    n = len(U)
    fc.append(''.join(f'[v{i}][a{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=1[v][a0];[a0]loudnorm=I=-14:TP=-1.5:LRA=11[a]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'work/r40/take/take.mov', '-filter_complex', ''.join(fc),
                    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-map_metadata', '-1', 'public/r40/talk.mp4'], check=True)
    json.dump(tl, open('public/r40/timeline.json', 'w'), ensure_ascii=False, indent=1)
    print(n, 'кусков,', round(t, 2), 'с')


if __name__ == '__main__':
    main()
