#!/usr/bin/env python3
"""Рилс 45 (челлендж Лилии, день 9, «В чём я переобулась, когда у меня сформировались лобные доли», 26.11).

Дубли Кати (work/r45/take, в git не попадают), все в горчичном лонге, кроме k2 (серое худи, не берём):
k1 тёмная стена, конфета (45 с); k3 рука у подбородка, светлые шторы; k4 конфета у окна; k5 с собакой на кровати.
Версия 1: только k1. Версия 2 (Катя: «Мне не нравится ролик, ты сделал его с паузами. Убери и сделай так, чтобы их не было
слышно и понятно»): все паузы от 0,2 с вырезаны. Версия 3 (Катя прислала k3-k5: «Можешь нарезать еще оттуда»): по разделам
лучшие по лицам дубли (сравнение лиц по разделам 26.11: k3 и k4 чаще с прищуром и рукой у рта): хук, 2 и 4 из k5 (собака,
светло, волосы распущены), 1, 3 и вопрос из k1 (спокойное лицо). Смена дубля на каждом пункте.
k5 (Катя: «Если будешь брать там, где с собакой... обрежь повыше, чтобы трусов не было видно»): низ кадра на 1420 из 1920
(бельё ниже 1470, проверено по всей длине), справа до x=878 (дальше на полке грамота с текстом: в кадр не берём).
Паузы: огибающая громкости 10 мс, порог -45 дБ (тишина -60...-80 дБ); паузы от 0,2 с вырезаются, у слова остаётся 0,06 с
с каждой стороны. Склейки в ролике прячет смена крупности (src/PereobReel.tsx). Границы кусков по кадрам 30 к/с.
Исходники в полном диапазоне (yuvj420p): переводим в tv-диапазон. Пишет public/r45/talk.mp4 и public/r45/timeline.json.
Использование (из video/): python3 tools/prepare_r45.py
"""
import json, os, subprocess
import numpy as np

TAKE = 'work/r45/take/{}.mp4'
THR, MIN_GAP, PAD = -45.0, 0.20, 0.06  # порог тишины (дБ), какую паузу резать (с), сколько оставлять у слова (с)
CROP = {'k1': 'crop=900:1600:43:0',    # приближение 1,2 по лицу, стол и брюки внизу ушли
        'k5': 'crop=798:1420:80:0'}    # приближение 1,35: без белья внизу и без грамоты справа
GRADE = {'k1': 'eq=gamma=1.06', 'k5': 'eq=gamma=1.02'}
# разделы: (дубль, начало первого слова, начало последнего слова, предел конца) по распознаванию дубля
SECTIONS = [
    ('k5', 1.59, 6.14, 6.62),     # хук: «В чём я переобулась... Спойлер: на это ушло два брака»
    ('k1', 6.11, 13.07, 13.75),   # 1: «Первое... И да, мне дарят»
    ('k5', 14.18, 20.95, 21.70),  # 2: «Второе... и этого достаточно»
    ('k1', 25.00, 30.52, 31.30),  # 3: «Третье... И да, я замужем»
    ('k5', 28.52, 37.53, 38.25),  # 4: «И четвёртое... не продаёт себя дёшево»
    ('k1', 41.20, 43.77, 44.10),  # вопрос: «С каким пунктом... Пишите» (после 44,10 рука тянется к телефону)
]
# начало куска с опущенными веками (первые кадры после склейки): держим первый кадр с открытыми глазами (с), звук не трогаем
FREEZE = {('k1', 6.0667): 0.1667}  # «Первое»: 5 кадров взгляд вниз
# обложка: дубль и время; запасные кадры для выбора Кати
# версия 3: с собакой (37,95: губы сомкнуты, взгляд в камеру, рука у подбородка), запасные: прежняя 1 из k1 и два кадра с собакой
COVER = ('k5', 37.95)
COVER_ALT = [('k1', 40.75), ('k5', 13.75), ('k5', 21.6)]
_ENV = {}


def env(take):
    """Громкость дубля по 10 мс (дБ)."""
    if take not in _ENV:
        x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', TAKE.format(take), '-vn', '-ac', '1', '-ar', '16000',
                                          '-f', 's16le', '-'], capture_output=True, check=True).stdout, np.int16).astype(np.float32) / 32768
        _ENV[take] = 20 * np.log10(np.sqrt((x[:len(x) // 160 * 160].reshape(-1, 160) ** 2).mean(1)) + 1e-9)
    return _ENV[take]


def section_pieces(take, w0, w1, lim):
    """Куски речи раздела без пауз: от тишины перед первым словом до тишины после последнего (не дальше lim)."""
    e = env(take)
    loud = e > THR
    i = int(round(w0 * 100))
    while i > 0 and loud[i - 1]:      # назад до тишины перед первым словом (время распознавания бывает позже)
        i -= 1
    while i < len(e) and not loud[i]:  # вперёд до начала звука
        i += 1
    lim_i = int(lim * 100)
    j = min(lim_i, len(e)) - 1
    while j > int(w1 * 100) and not loud[j]:  # конец последнего звука до предела
        j -= 1
    a, b = i / 100 - PAD, min(lim, (j + 1) / 100 + PAD)
    out, s, k = [], a, i
    while k <= j:
        if not loud[k]:
            m = k
            while m <= j and not loud[m]:
                m += 1
            if (m - k) / 100 >= MIN_GAP:
                out.append((s, k / 100 + PAD))
                s = m / 100 - PAD
            k = m
        else:
            k += 1
    out.append((s, b))
    return [(round(round(p * 30) / 30, 4), round(round(q * 30) / 30, 4)) for p, q in out]


def vchain(take):
    return f"{CROP[take]},scale=1080:1920:flags=lanczos,{GRADE[take]},scale=in_range=full:out_range=tv,format=yuv420p,fps=30"


def cover(take, t, dst):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', TAKE.format(take), '-frames:v', '1', '-vf',
                    f'scale=in_range=full:out_range=full,{CROP[take]},scale=1080:1920:flags=lanczos,{GRADE[take]}', '-q:v', '2', dst], check=True)


def main():
    os.makedirs('public/r45', exist_ok=True)
    takes = sorted({s[0] for s in SECTIONS})
    idx = {k: n for n, k in enumerate(takes)}
    fc, tl, t, n = [], [], 0.0, 0
    for si, (take, w0, w1, lim) in enumerate(SECTIONS):
        for a, b in section_pieces(take, w0, w1, lim):
            x = idx[take]
            fz = FREEZE.get((take, a), 0)
            hold = f',tpad=start_duration={fz}:start_mode=clone' if fz else ''
            fc.append(f"[{x}:v]trim={a + fz:.4f}:{b},setpts=PTS-STARTPTS,{vchain(take)}{hold}[v{n}];"
                      f"[{x}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={b - a - 0.02:.3f}:d=0.02[a{n}];")
            tl.append({'take': take, 'section': si, 'src': [a, b], 'out': [round(t, 4), round(t + b - a, 4)]})
            t += b - a; n += 1
    fc.append(''.join(f'[v{i}][a{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=1[v][a0];[a0]highpass=f=70,loudnorm=I=-14:TP=-1.5:LRA=11[a]')
    inputs = sum((['-i', TAKE.format(k)] for k in takes), [])
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex', ''.join(fc), '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-color_range', 'tv', '-colorspace', 'bt709',
                    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-map_metadata', '-1', 'public/r45/talk.mp4'], check=True)
    json.dump(tl, open('public/r45/timeline.json', 'w'), ensure_ascii=False, indent=1)
    print(n, 'кусков,', round(t, 2), 'с;', ' | '.join(f"{x['section']}:{x['take']} {x['src'][0]}-{x['src'][1]}" for x in tl))
    cover(*COVER, 'public/r45/cover.jpg')
    for k, (tk, ct) in enumerate(COVER_ALT, 2):
        cover(tk, ct, f'public/r45/cover{k}.jpg')


if __name__ == '__main__':
    main()
