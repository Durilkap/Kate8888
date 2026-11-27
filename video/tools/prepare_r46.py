#!/usr/bin/env python3
"""Рилс 46 (челлендж Лилии, день 10, «Мне 42, и я до сих пор в найме», 27.11).

Дубли Кати (work/r46/take, в git не попадают): t1 машина крупно, t2 и t3 кафе (камера снизу, ракурс хуже), t4 машина средний план.
Катя: «Выбери лучшие дубли, смотри на лицо». Сравнение лиц по фразам во всех 4 дублях (27.11): в кафе камера снизу
(подбородок, ноздри), в машине на уровне глаз. Берём t1 и t4 и чередуем по блокам речи: крупный и средний план, как две камеры.
Блоки (по паузам в обоих дублях): хук t1; «Найм научил... не сдаваться» t4; «Каждый день...» t1; «Из каждого утюга...» t4;
«Будто в найме... разгон» t1; «Работать в найме не стыдно... сколько вам лет» t4 (в t1 «стыдно... когда делать вид» с заминкой).
Паузы внутри блоков от 0,2 с вырезаются (как в дне 9, по просьбе Кати без пауз): огибающая 10 мс, порог -45 дБ, у слова 0,06 с.
Кадр: потолок машины срезан (Катя 25.11 про потолок), макушка около 300 px от верха; цвет теплее (куратор 23.11: меньше синевы).
Исходники в полном диапазоне (yuvj420p): переводим в tv-диапазон. Пишет public/r46/talk.mp4 и public/r46/timeline.json.
Использование (из video/): python3 tools/prepare_r46.py
"""
import json, os, subprocess
import numpy as np

TAKE = 'work/r46/take/{}.mp4'
THR, MIN_GAP, PAD = -45.0, 0.20, 0.06
CROP = {'t1': 'crop=776:1380:162:354',   # крупный план, приближение 1,39
        't4': 'crop=731:1300:228:407'}   # средний план, приближение 1,48
GRADE = 'colortemperature=temperature=5600:mix=0.5,eq=gamma=1.05:saturation=1.03'
# блоки: (дубль, начало первого слова, предел конца = чуть раньше следующего слова) по распознаванию и огибающей
SECTIONS = [
    ('t1', 1.13, 3.25),    # «Мне 42, и я до сих пор в найме.»
    ('t4', 3.37, 9.85),    # «Найм научил меня любить себя... А ещё продавать, держать слово и не сдаваться.»
    ('t1', 9.46, 13.42),   # «Каждый день я разговариваю с клиентами...»
    ('t4', 14.07, 17.02),  # «Из каждого утюга: уходи из найма, открывай своё.»
    ('t1', 16.38, 23.47),  # «Будто в найме ты автоматически неудачница. А я в 42 работаю на кого-то... разгон.»
    ('t4', 24.17, 34.15),  # «Работать в найме не стыдно... Я в найме. Но я точно не стою на месте. А вы в найме или на себя?..»
]
# кадры с закрытыми глазами на склейке: держим соседний кадр с открытыми глазами (с), звук не трогаем
FREEZE = {('t1', 9.4667): 0.1667}        # начало «Каждый день»: 5 кадров с закрытыми глазами
FREEZE_END = {('t1', 3.0333): 0.0667}    # конец хука: 2 последних кадра моргание
END_EXTRA = 0.12                         # конец ролика: после «лет» ещё 0,12 с (рука к телефону не тянется, проверено)
COVER = ('t1', 5.0)
_ENV = {}


def env(take):
    if take not in _ENV:
        x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', TAKE.format(take), '-vn', '-ac', '1', '-ar', '16000',
                                          '-f', 's16le', '-'], capture_output=True, check=True).stdout, np.int16).astype(np.float32) / 32768
        _ENV[take] = 20 * np.log10(np.sqrt((x[:len(x) // 160 * 160].reshape(-1, 160) ** 2).mean(1)) + 1e-9)
    return _ENV[take]


def section_pieces(take, w0, lim):
    """Куски речи блока без пауз: от тишины перед первым словом до конца последнего звука (не дальше lim)."""
    e = env(take)
    loud = e > THR
    i = int(round(w0 * 100))
    while i > 0 and loud[i - 1]:
        i -= 1
    while i < len(e) and not loud[i]:
        i += 1
    j = min(int(lim * 100), len(e)) - 1
    while j > i and not loud[j]:
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
    # кусок короче 0,35 с (одно «А» между паузами) даёт двойной скачок: склеиваем его со следующим, паузу между ними оставляем
    merged = []
    for p, q in out:
        if merged and merged[-1][1] - merged[-1][0] < 0.35:
            merged[-1] = (merged[-1][0], q)
        else:
            merged.append((p, q))
    return [(round(round(p * 30) / 30, 4), round(round(q * 30) / 30, 4)) for p, q in merged]


def vchain(take):
    return f"{CROP[take]},scale=1080:1920:flags=lanczos,{GRADE},scale=in_range=full:out_range=tv,format=yuv420p,fps=30"


def main():
    os.makedirs('public/r46', exist_ok=True)
    takes = sorted({s[0] for s in SECTIONS})
    idx = {k: n for n, k in enumerate(takes)}
    fc, tl, t, n = [], [], 0.0, 0
    for si, (take, w0, lim) in enumerate(SECTIONS):
        ps = section_pieces(take, w0, lim)
        if si == len(SECTIONS) - 1:
            ps[-1] = (ps[-1][0], round(ps[-1][1] + END_EXTRA, 4))
        for a, b in ps:
            x = idx[take]
            fz, fe = FREEZE.get((take, a), 0), FREEZE_END.get((take, b), 0)
            hold = (f',tpad=start_duration={fz}:start_mode=clone' if fz else '') + (f',tpad=stop_duration={fe}:stop_mode=clone' if fe else '')
            fc.append(f"[{x}:v]trim={a + fz:.4f}:{b - fe:.4f},setpts=PTS-STARTPTS,{vchain(take)}{hold}[v{n}];"
                      f"[{x}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={b - a - 0.02:.3f}:d=0.02[a{n}];")
            tl.append({'take': take, 'section': si, 'src': [a, b], 'out': [round(t, 4), round(t + b - a, 4)]})
            t += b - a; n += 1
    fc.append(''.join(f'[v{i}][a{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=1[v][a0];[a0]highpass=f=70,loudnorm=I=-14:TP=-1.5:LRA=11[a]')
    inputs = sum((['-i', TAKE.format(k)] for k in takes), [])
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex', ''.join(fc), '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-color_range', 'tv', '-colorspace', 'bt709',
                    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-map_metadata', '-1', 'public/r46/talk.mp4'], check=True)
    json.dump(tl, open('public/r46/timeline.json', 'w'), ensure_ascii=False, indent=1)
    print(n, 'кусков,', round(t, 2), 'с;', ' | '.join(f"{x['section']}:{x['take']} {x['src'][0]}-{x['src'][1]}" for x in tl))


if __name__ == '__main__':
    main()
