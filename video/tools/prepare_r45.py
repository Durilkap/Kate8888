#!/usr/bin/env python3
"""Рилс 45 (челлендж Лилии, день 9, «В чём я переобулась, когда у меня сформировались лобные доли», 26.11).

Катя прислала 2 дубля (work/r45/take, в git не попадают): k1 горчичный лонг (45 с), k2 серое худи (43 с).
Катя 26.11: «Выбери лучшие кадры, мне больше нравится в горчичном лонге» -> берём только k1.
Склейка: начало на 1,10 с (рука уже у лица, до первого слова 0,05 с), долгая пауза перед «Третье» (1,3 с, взгляд вверх)
сокращена до 0,3 с по огибающей громкости (тишина -60...-80 дБ), конец на 44,10 с (после «пишите», до того как рука тянется к телефону).
Кадр: приближение 1,2 по лицу (лицо крупнее, стол и брюки внизу ушли), цвет: чуть светлее (gamma 1,06), тёплый как в исходнике.
Исходник в полном диапазоне (yuvj420p): переводим в tv-диапазон. Пишет public/r45/talk.mp4 и public/r45/timeline.json.
Использование (из video/): python3 tools/prepare_r45.py
"""
import json, os, subprocess

SRC = 'work/r45/take/k1.mp4'
# стык перед «Третье»: конец A на 23,95 (взгляд ещё в камеру), начало B на 24,88 (меньше кадров со взглядом вверх), пауза около 0,3 с
PIECES = [(1.10, 23.95), (24.88, 44.10)]  # (начало, конец) в дубле k1
CROP = 'crop=900:1600:43:0'               # центр лица x≈493, верх кадра сохраняем
GRADE = 'eq=gamma=1.06'
# обложка: спокойная пауза перед вопросом, взгляд в камеру, губы сомкнуты, лёгкая улыбка; запасные кадры для выбора Кати
COVER_T = 40.75
COVER_ALT = [13.55, 5.85, 0.30]


def cover(t, dst):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', SRC, '-frames:v', '1', '-vf',
                    f'scale=in_range=full:out_range=full,{CROP},scale=1080:1920:flags=lanczos,{GRADE}', '-q:v', '2', dst], check=True)


def main():
    os.makedirs('public/r45', exist_ok=True)
    fc, tl, t = [], [], 0.0
    for i, (a, b) in enumerate(PIECES):
        fc.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,{CROP},scale=1080:1920:flags=lanczos,{GRADE},"
                  f"scale=in_range=full:out_range=tv,format=yuv420p,fps=30[v{i}];"
                  f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={b - a - 0.04:.3f}:d=0.04[a{i}];")
        tl.append({'src': [a, b], 'out': [round(t, 3), round(t + b - a, 3)]})
        t += b - a
    n = len(PIECES)
    fc.append(''.join(f'[v{i}][a{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=1[v][a0];[a0]highpass=f=70,loudnorm=I=-14:TP=-1.5:LRA=11[a]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-filter_complex', ''.join(fc), '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-color_range', 'tv', '-colorspace', 'bt709',
                    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-map_metadata', '-1', 'public/r45/talk.mp4'], check=True)
    json.dump(tl, open('public/r45/timeline.json', 'w'), ensure_ascii=False, indent=1)
    print(n, 'куска,', round(t, 2), 'с')
    cover(COVER_T, 'public/r45/cover.jpg')
    for k, ct in enumerate(COVER_ALT, 2):
        cover(ct, f'public/r45/cover{k}.jpg')


if __name__ == '__main__':
    main()
