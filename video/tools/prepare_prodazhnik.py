#!/usr/bin/env python3
"""Рилс 16 «Хороший продажник сейчас это роскошь»: монтаж видео Кати в машине (2 дубля), два варианта.

Использование (из папки video/):
  python3 audio/transcribe.py work/r16/src/a.mov work/r16/asr_a.json   (и так же b)
  python3 tools/prepare_prodazhnik.py a     # вариант на первом дубле
  python3 tools/prepare_prodazhnik.py b     # вариант на втором дубле
Пишет public/r16/a.mp4, b.mp4 (H.264), public/r16/voice_<вариант>.wav и src/prodazhnik_<вариант>.json.

Вырезано помощником (Катя может вернуть): «Поэтому просто взять и позвонить это не про меня»
(без продолжения «звоню своим состоянием» читается как «не звонит»), повтор «пишут» в первом дубле.
«И да, мои клиенты приносят компании деньги» оставлено по решению Кати (04.11), фраза из второго дубля.
Внутри кусков паузы длиннее CAP укорачиваются по тишине.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

FPS = 30
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'work' / 'r16'
OUT = ROOT / 'public' / 'r16'
SILENCE_DB = -35
CAP = 0.30
END_HOLD = 27

# Экраны титров. «|» - новая строка, «!» - крупная строка, *слово* - жёлтое,
# слово~асr - как слово записано в распознавании, слово{a:55.25} - время задано вручную (дубль:секунды).
# PHOTOS: файл и номера экранов (с какого по какой, не включая). levels: крупность лица, cap_top: верх титров.
VARIANTS = {
    'a': {  # первый дубль; одна фраза из второго под фото на кресле, финал из второго под фото с подмигиванием
        'chunks': [
            ('a', 1.55, 44.85),   # Я обожаю своих клиентов ... они это чувствуют.
            ('b', 48.45, 53.25),  # Хороший продажник это роскошь. А роскошь начинается с состояния.
            ('a', 55.15, 61.57),  # Так классно, на самом деле ... не по рабочим вопросам, а
            ('a', 62.88, 67.25),  # просто поделиться ... что-то обсудить.
            ('b', 66.55, 72.00),  # И да, мои клиенты приносят компании деньги. Я Екатерина.
        ],
        'cards': [
            'Я *обожаю*|своих клиентов',
            'и сейчас|расскажу|почему.',
            'Я больше *10*~десяти лет|в продажах,',
            'и по своему|опыту я знаю:',
            'хороший|продажник|попадается',
            '!*один* *из* *30*,~тридцати',
            'а может быть,|из *50*.~пятидесяти',
            'Поэтому хороший|продажник сейчас|!это *роскошь.*',
            'Отдел продаж|это *локомотив*.',
            'Он приводит|клиентов,',
            'а клиенты|приносят|компании *деньги*.',
            'Чем отличается|хороший|от рядового,|скажем так?',
            'А тем, что он|*продаёт* *себя*.',
            'Продукт, да,|важен,|но *доверяют*|*человеку*.',
            'Для меня|продажа|это *отношения*.',
            'Сначала|человек,|потом сделка.',
            'И я продаю|своё~свое|*состояние*,',
            'я продаю свою|*энергетику*.',
            'Люди идут|на него,',
            'они это|*чувствуют*.',
            'Хороший|продажник|это *роскошь*.',
            'А роскошь|начинается|с *состояния*.~стоянием',
            'Так{a:55.25} классно,|на самом деле,',
            'когда|в{a:56.88} выходной день|тебе пишут|*клиенты*.',
            'Пишут не по|рабочим|вопросам,',
            'а просто|*поделиться*|своими|радостями,',
            'своими|новостями,|что-то~что обсудить.',
            'И да,|мои клиенты|приносят|компании *деньги*.',
            '!Я Екатерина.',
        ],
        'photos': [('k3', 2, 4), ('k1', 20, 22), ('k2', 27, None)],
        'levels': [1.22, 1.34, 1.26, 1.38],
        'cap_top': 1030,
    },
    'b': {  # целиком второй дубль: камера ниже, поэтому крупнее и титры ниже
        'chunks': [
            ('b', 1.65, 44.75),   # Я обожаю своих клиентов ... и его чувствуют.
            ('b', 48.45, 72.00),  # Хороший продажник это роскошь ... Я Екатерина.
        ],
        'cards': [
            'Я *обожаю*|своих клиентов',
            'и сейчас|расскажу|почему.',
            'Я больше *10*~десяти лет|в продажах,',
            'и по своему|опыту я знаю,',
            'что хороший|продажник|попадается',
            '!*один* *из* *30*,~тридцати',
            'а может быть,|и из~с *50*.~пятидесяти',
            'Поэтому хороший|продажник|в наше время',
            '!это *роскошь.*',
            'Отдел продаж|это *локомотив*.',
            'Он приводит|клиентов,',
            'а клиенты|приносят|компании *деньги*.',
            'Чем отличается|хороший|от рядового,|скажем так?',
            'А тем, что он|*продаёт* *себя*.',
            'Да, продукт|важен,|но идут за|*человеком*.',
            'Для меня|продажа|это *отношения*.',
            'Сначала|человек,|потом сделка.',
            'Я продаю|своё~свое|*состояние*,',
            'я продаю свою|*энергетику*,',
            'и его|*чувствуют*.',
            'Хороший|продажник|это *роскошь*.',
            'А роскошь|начинается|с *состояния*.~стоянием',
            'Так классно,|на самом деле,|знаете,',
            'когда|в{b:55.81} выходной день|тебе пишут|*клиенты*.',
            'Пишут не по|рабочим|вопросам,',
            'а для того,|чтобы *поделиться*|своим событием,',
            '*радостью*,|просто|поговорить.',
            'И да,|мои клиенты|приносят|компании *деньги*.',
            '!Я Екатерина.',
        ],
        'photos': [('k3', 2, 4), ('k1', 20, 22), ('k2', 28, None)],
        'levels': [1.38, 1.48, 1.42, 1.52],
        'cap_top': 1110,
    },
}


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True)


def norm(w):
    return ''.join(c for c in w.lower().replace('ё', 'е') if c.isalnum())


def silence_runs(path):
    raw = run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-']).stdout
    x = np.frombuffer(raw, np.float32)
    win = 320
    n = len(x) // win
    db = 20 * np.log10(np.sqrt((x[:n * win].reshape(n, win) ** 2).mean(1)) + 1e-9)
    quiet = db < SILENCE_DB
    runs, i = [], 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            runs.append((i * 0.02, j * 0.02))
            i = j
        else:
            i += 1
    return runs


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else 'a'
    V = VARIANTS[name]
    CHUNKS, CARDS, PHOTOS = V['chunks'], V['cards'], V['photos']
    OUT.mkdir(parents=True, exist_ok=True)
    takes = {t: SRC / 'src' / f'{t}.mov' for t in 'ab'}
    for t, p in takes.items():
        dst = OUT / f'{t}.mp4'
        if not dst.exists():
            run(['ffmpeg', '-v', 'error', '-y', '-i', str(p), '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264', '-crf', '15',
                 '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-map_metadata', '-1', str(dst)])
    runs = {t: silence_runs(p) for t, p in takes.items()}
    asr = {t: [w for s in json.load(open(SRC / f'asr_{t}.json', encoding='utf-8')) for w in s['words']] for t in 'ab'}

    # куски -> клипы (кадры исходника), паузы внутри кусков укорачиваются
    clips = []
    for take, a, b in CHUNKS:
        t0 = a
        for s, e in runs[take]:
            # не режем, если получится клип короче 0,5 с (мелькание крупности)
            if s > a and e < b and e - s > CAP + 0.08 and s + CAP / 2 - t0 >= 0.5 and b - (e - CAP / 2) >= 0.5:
                clips.append((take, t0, s + CAP / 2))
                t0 = e - CAP / 2
        clips.append((take, t0, b))
    out_clips, at = [], 0
    for i, (take, s, e) in enumerate(clips):
        f0, f1 = round(s * FPS), round(e * FPS)
        out_clips.append({'take': take, 'from': f0, 'len': f1 - f0, 'at': at})
        at += f1 - f0
    total = at + END_HOLD

    def timeline(take, t):
        f = round(t * FPS)
        for c in out_clips:
            if c['take'] == take and c['from'] <= f < c['from'] + c['len']:
                return c['at'] + f - c['from']
        return None

    # аудио: те же кадровые границы
    parts, labels = [], []
    for i, c in enumerate(out_clips):
        ta, tb = c['from'] / FPS, (c['from'] + c['len']) / FPS
        src = 0 if c['take'] == 'a' else 1
        parts.append(f'[{src}:a]atrim=start={ta:.4f}:end={tb:.4f},asetpts=PTS-STARTPTS,'
                     f'afade=t=in:d=0.01,afade=t=out:st={tb - ta - 0.01:.4f}:d=0.01[a{i}]')
        labels.append(f'[a{i}]')
    fc = ';'.join(parts) + ';' + ''.join(labels) + f'concat=n={len(parts)}:v=0:a=1,' \
        'highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150:makeup=2,' \
        'loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000[o]'
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(takes['a']), '-i', str(takes['b']), '-filter_complex', fc,
         '-map', '[o]', '-ac', '2', '-c:a', 'pcm_s16le', str(OUT / f'voice_{name}.wav')])

    # слова в порядке ленты: (текст, кадр ленты)
    stream = []
    for take, a, b in CHUNKS:
        prev_end = 0.0
        for w in asr[take]:
            if a <= w['start'] < b or (w['start'] < a < w['end'] and w['end'] - a > 0.15):
                t = max(w['start'], a)
                onset = next((e for s, e in runs[take] if e - s >= 0.15 and max(t - 0.35, prev_end) <= e <= t + 0.05), None)
                if onset is not None:
                    t = onset
                f = timeline(take, t)
                if f is None:  # начало слова попало в вырезанную паузу: берём начало следующего клипа
                    f = min(c['at'] for c in out_clips if c['take'] == take and c['from'] > round(t * FPS))
                stream.append((w['w'], f))
                prev_end = w['end']
    ptr, cards = 0, []
    for ci, card in enumerate(CARDS):
        lines = []
        for line in card.split('|'):
            big = line.startswith('!')
            ws = []
            for tok in line.lstrip('!').split(' '):
                fixed = None
                if '{' in tok:
                    tok, fx = tok.split('{')
                    tk, sec = fx.rstrip('}').split(':')
                    fixed = timeline(tk, float(sec))
                alias = None
                if '~' in tok:
                    tok, alias = tok.split('~')
                accent = tok.startswith('*')
                text = tok.replace('*', '')
                if fixed is None:
                    key = norm(alias or text)
                    k = next((j for j in range(ptr, min(ptr + 3, len(stream))) if norm(stream[j][0]) == key), None)
                    if k is None:
                        raise SystemExit(f'Слово «{text}» (экран {ci + 1}) не найдено около «{stream[ptr][0]}»')
                    fixed, ptr = stream[k][1], k + 1
                ws.append({'t': text, 'at': fixed, 'a': accent})
            lines.append({'big': big, 'words': ws})
        first = min(w['at'] for l in lines for w in l['words'])
        cards.append({'from': 0 if ci == 0 else max(first - 3, 0), 'full': ci == 0, 'lines': lines})
    for i in range(1, len(cards)):
        cards[i]['from'] = max(cards[i]['from'], cards[i - 1]['from'] + 8)
    photos = [{'src': f'r16/{name}.jpg', 'from': cards[a]['from'], 'to': cards[b]['from'] if b is not None else total}
              for name, a, b in PHOTOS]
    # в варианте на первом дубле кадры второго (там куртка расстёгнута) закрываем фото, с запасом на переход
    if name == 'a':
        for ph in photos:
            for c in out_clips:
                if c['take'] == 'b' and ph['from'] <= c['at'] + c['len'] and ph['to'] >= c['at']:
                    ph['from'] = min(ph['from'], c['at'] - 4)
                    ph['to'] = max(ph['to'], c['at'] + c['len'] + 4) if ph['to'] < total else total

    data = {'total': total, 'clips': out_clips, 'cards': cards, 'photos': photos, 'levels': V['levels'],
            'capTop': V['cap_top'], 'voice': f'r16/voice_{name}.wav'}
    (ROOT / 'src' / f'prodazhnik_{name}.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    for c in cards:
        print(c['from'], ' / '.join(' '.join(f"{w['t']}@{w['at']}" for w in l['words']) for l in c['lines']))
    print('клипов', len(out_clips), 'фото', [(p['src'], p['from'], p['to']) for p in photos])
    print(f'ролик {total / FPS:.2f} с')


if __name__ == '__main__':
    main()
