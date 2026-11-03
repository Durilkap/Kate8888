#!/usr/bin/env python3
"""Рилс 14 «Как я стала девочкой»: голос Кати, укороченные паузы и титры, привязанные к её словам.

Использование (из папки video/):
  python3 audio/transcribe.py work/r14/voice/voice.mp3 work/r14/voice/asr.json
  python3 tools/prepare_wedding_voice.py work/r14/voice/voice.mp3 work/r14/voice/asr.json
Пишет public/wed/voice.wav (в git не попадает) и src/weddingVoice.json:
  cards  - экраны титров: кадр начала и строки из слов, у каждого слова кадр появления;
  anchors - пары «кадр старого монтажа (30 с) -> кадр новой ленты» для растяжки кадров под голос;
  total  - длина ролика в кадрах.

Паузы длиннее CAP режутся по тишине (громкость ниже SILENCE_DB), речь не трогается.
Разметка титров: строки через «|», «!» в начале строки - крупная строка, *слово* - жёлтое,
слово{13.95} - время слова задано вручную (распознавание его пропустило, время найдено по громкости).
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

FPS = 30
ROOT = Path(__file__).resolve().parent.parent
SILENCE_DB = -35
CAP = 0.34                      # столько тишины оставляем в обычной паузе
CAP_AT = [(19.4, 20.4, 0.60),   # после «какая ты»: смысловой поворот
          (35.6, 36.5, 0.65)]   # перед «Так я стала девочкой»
LEAD = 0.75                     # начало записи (до «Скажи» тишина)
TAIL = 0.35                     # после «Екатерина»
END_HOLD = 36                   # кадров картинки после голоса

# Экраны титров (слова Кати по записи 03.11). Первый экран (хук) виден целиком с первого кадра.
CARDS = [
    'Скажи, когда ты|в последний раз|была не сильной,|!а *девочкой?*',
    'Работа, дом,|решения.',
    '!*Всё* *на* *тебе.*',
    'И все говорят:|«Ты же *сильная*,|справишься».',
    'И{13.95} ты|справляешься.',
    'Только *устаёшь*|так,',
    'что *забываешь*,|*какая* *ты.*',
    'Я{20.30} тоже долго|была только|*сильной.*',
    'Пока не разрешила|себе другое:',
    '!*просить*|!*помощи,*',
    '!*принимать*|!*заботу,*',
    'быть *мягкой*|рядом со своим|мужчиной.',
    'Это не слабость.|Это *лёгкость.*',
    'Так{36.40} я стала|!*девочкой.*',
    'И это только|часть пути|к *себе* *настоящей.*',
    '!Я Екатерина.',
]
# Начала титров в старом 30-секундном монтаже (кадры) -> номер экрана в CARDS, с которого начинается та же фраза
OLD_ANCHORS = [(96, 1), (150, 2), (198, 3), (276, 4), (324, 5), (400, 7), (462, 8), (516, 9), (560, 10),
               (604, 11), (676, 12), (746, 13), (800, 14), (862, 15)]
OLD_TOTAL = 900


def norm(w):
    return ''.join(c for c in w.lower().replace('ё', 'е') if c.isalnum())


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True)


def silence_runs(src):
    raw = run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-']).stdout
    x = np.frombuffer(raw, np.float32)
    win = 320  # 20 мс
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
    return runs, len(x) / 16000


def main():
    src, asr_path = sys.argv[1], sys.argv[2]
    segs = json.load(open(asr_path, encoding='utf-8'))
    words = [w for s in segs for w in s['words']]
    speech_end = max(w['end'] for w in words)
    runs, dur = silence_runs(src)

    # куски, которые оставляем (секунды исходника)
    keep, t0 = [], LEAD
    for a, b in runs:
        if b <= LEAD or b >= speech_end:
            continue
        cap = next((c for lo, hi, c in CAP_AT if lo <= (a + b) / 2 <= hi), CAP)
        if a < LEAD:  # тишина в самом начале: начинаем за 0,15 с до первого звука
            t0 = max(LEAD, b - 0.15)
        elif b - a > cap + 0.08:
            keep.append((t0, a + cap / 2))
            t0 = b - cap / 2
    keep.append((t0, speech_end + TAIL))

    def new_t(t):
        acc = 0.0
        for a, b in keep:
            if t < a:
                return acc
            if t <= b:
                return acc + t - a
            acc += b - a
        return acc

    # аудио: склейка кусков с короткими фейдами, затем обработка голоса
    parts, labels = [], []
    for i, (a, b) in enumerate(keep):
        parts.append(f'[0:a]atrim=start={a:.4f}:end={b:.4f},asetpts=PTS-STARTPTS,'
                     f'afade=t=in:d=0.015,afade=t=out:st={b - a - 0.015:.4f}:d=0.015[a{i}]')
        labels.append(f'[a{i}]')
    fc = ';'.join(parts) + ';' + ''.join(labels) + f'concat=n={len(keep)}:v=0:a=1,' \
        'highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150:makeup=2,' \
        'loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000[o]'
    out = ROOT / 'public' / 'wed' / 'voice.wav'
    run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex', fc, '-map', '[o]', '-ac', '2', '-c:a', 'pcm_s16le', str(out)])
    voice_len = sum(b - a for a, b in keep)

    # титры: каждое слово карточки ищем по порядку в распознавании
    ptr, cards, last = 0, [], 0.0
    for ci, card in enumerate(CARDS):
        lines = []
        for li, line in enumerate(card.split('|')):
            big = line.startswith('!')
            ws = []
            for tok in line.lstrip('!').split(' '):
                fixed = None
                if '{' in tok:
                    tok, fx = tok.split('{')
                    fixed = float(fx.rstrip('}'))
                accent = tok.startswith('*')
                text = tok.replace('*', '')
                if fixed is None:
                    k = next((j for j in range(ptr, min(ptr + 3, len(words))) if norm(words[j]['w']) == norm(text)), None)
                    if k is None:
                        raise SystemExit(f'Слово «{text}» (экран {ci + 1}) не найдено в распознавании около «{words[ptr]["w"]}»')
                    fixed, ptr = words[k]['start'], k + 1
                    # первое слово после паузы: распознавание ставит его чуть позже, берём начало звука
                    prev_end = words[k - 1]['end'] if k > 0 else 0
                    onset = next((b for a, b in runs if b - a >= 0.15 and max(fixed - 0.35, prev_end, last + 0.05) <= b <= fixed + 0.05), None)
                    if onset is not None:
                        fixed = onset
                last = fixed
                ws.append({'t': text, 'at': round(new_t(fixed) * FPS), 'a': accent})
            lines.append({'big': big, 'words': ws})
        first = min(w['at'] for l in lines for w in l['words'])
        cards.append({'from': 0 if ci == 0 else max(first - 4, 0), 'full': ci == 0, 'lines': lines})
    for i in range(1, len(cards)):
        cards[i]['from'] = max(cards[i]['from'], cards[i - 1]['from'] + 10)

    total = round(voice_len * FPS) + END_HOLD
    anchors = [[0, 0]] + [[o, cards[c]['from']] for o, c in OLD_ANCHORS] + [[OLD_TOTAL, total]]
    data = {'total': total, 'anchors': anchors, 'cards': cards}
    (ROOT / 'src' / 'weddingVoice.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    for c in cards:
        print(c['from'], ' / '.join(' '.join(w['t'] + f"@{w['at']}" for w in l['words']) for l in c['lines']))
    print(f'Голос {voice_len:.2f} с (исходник {dur:.2f} с), ролик {total / FPS:.2f} с, кусков {len(keep)}')


if __name__ == '__main__':
    main()
