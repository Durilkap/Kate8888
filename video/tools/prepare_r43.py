#!/usr/bin/env python3
"""Рилс 43 (челлендж, день 7): «Мой топ мужских фраз, после которых я понимаю: это не мой мужчина».

Катя 24.11 прислала 2 полных дубля (work/r43/take/t1.mov, t2.mov). Берём по фразам лучшие куски (по расшифровке
tools/asr_units.py: work/r43/t1_units.json, t2_units.json), паузы убираем, громкость -14 LUFS.
Пишет public/r43/talk.mp4 и public/r43/timeline.json. Использование (из video/): python3 tools/prepare_r43.py
"""
import json, subprocess

# (дубль, начало, конец) по фразам; чередование дублей даёт смену кадра на склейке
PIECES = [
    ('t2', 0.88, 5.72),    # заголовок + «На четвёртом месте:»
    ('t2', 6.07, 9.05),    # «Ты слишком многого хочешь». Нет. Я просто знаю, чего я хочу.
    ('t2', 9.28, 11.70),   # А рядом нужен тот, кого это вдохновляет, а не пугает.
    ('t1', 11.46, 16.06),  # На третьем: «А зачем тебе это?», когда я покупаю что-то себе. Затем, что я так хочу.
    ('t2', 16.45, 18.82),  # Отчитываться за свои желания я больше не буду.
    ('t2', 18.96, 22.42),  # На втором: «Я тебе ничего не должен». Это на первом свидании.
    ('t2', 22.74, 23.80),  # Конечно, не должен.
    ('t2', 23.98, 26.36),  # Но я не должна тратить на тебя своё время.
    ('t1', 26.50, 31.62),  # И на первом месте: «Ну ты же сильная, справишься». Справлюсь. Только зачем тогда мне ты?
    ('t2', 33.10, 35.98),  # А какую фразу добавили бы вы? Пишите в комментариях. (видео до 35,72, дальше стоп-кадр: рука к камере)
]


VEND = {9: 35.72}  # конец видео куска (дальше стоп-кадр), звук идёт до конца куска


def main():
    fc, tl, t = [], [], 0.0
    for i, (tk, a, b) in enumerate(PIECES):
        idx = 0 if tk == 't1' else 1
        vb = min(b, VEND.get(i, b))
        hold = f',tpad=stop_mode=clone:stop_duration={b - vb:.3f}' if vb < b else ''
        fc.append(f"[{idx}:v]trim={a}:{vb},setpts=PTS-STARTPTS,scale=1080:1920,fps=30{hold}[v{i}];"
                  f"[{idx}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={b - a - 0.03:.3f}:d=0.03[a{i}];")
        tl.append({'take': tk, 'src': [a, b], 'out': [round(t, 3), round(t + b - a, 3)]})
        t += b - a
    n = len(PIECES)
    fc.append(''.join(f'[v{i}][a{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=1[v][a0];[a0]loudnorm=I=-14:TP=-1.5:LRA=11[a]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'work/r43/take/t1.mov', '-i', 'work/r43/take/t2.mov',
                    '-filter_complex', ''.join(fc), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '15',
                    '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-map_metadata', '-1', 'public/r43/talk.mp4'], check=True)
    json.dump(tl, open('public/r43/timeline.json', 'w'), ensure_ascii=False, indent=1)
    print(n, 'кусков,', round(t, 2), 'с')


if __name__ == '__main__':
    main()
