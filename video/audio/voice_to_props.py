#!/usr/bin/env python3
"""Озвучка Кати -> тайминги титров для рилса «Слишком».

Что делает:
  1) чистит запись (ffmpeg: срез низов, мягкая компрессия, громкость около -15 LUFS);
     шумоподавление включается только флагом --denoise (на слух я проверить не могу, поэтому по умолчанию выключено);
  2) находит паузы между фразами по громкости;
  3) сопоставляет фразы и паузы; если пауза у фразы не найдена, берёт оценку по числу слогов (помечает «оценка»);
  4) режет тишину в начале, пишет video/public/voice.wav и video/work/props-voice.json для Remotion.

Звук помощник не слышит: тайминги проверяются только по паузам, дальше смотрит и слушает Катя.

Использование:
  python3 voice_to_props.py запись.m4a            # обычный запуск
  python3 voice_to_props.py запись.m4a --denoise  # плюс шумоподавление
  python3 voice_to_props.py запись.wav --skip-clean  # без обработки (для проверки)
"""
import argparse
import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np

FPS = 30
# Фразы в том порядке, в каком идут титры (рилс «Слишком», scenarii/rils-11-slishkom.md).
SPOKEN = [
    'Тебе говорили: «Ты слишком»?',
    'Слишком яркая.',
    'Слишком уверенная.',
    'Слишком смелая.',
    'Мне тоже.',
    'И ты начинаешь уменьшаться,',
    'чтобы всем было удобно.',
    'А знаешь, что я сделала?',
    'Я перестала.',
    'Не прогибаюсь.',
    'Не оправдываюсь.',
    'Чужое «слишком» мне не указ.',
    'Я Екатерина.',
]
VOWELS = set('аеёиоуыэюяАЕЁИОУЫЭЮЯ')
LEAD = 0.07      # титр появляется чуть раньше слова, с
HOLD = 0.9       # держим последний кадр после слов, с
MIN_GAP = 0.16   # пауза короче считается внутри фразы, с
MIN_SPEECH = 0.07
FREE = 0.45      # во сколько секунд ошибки обходится «граница без паузы»
MIN_STEP = 6     # минимум кадров между титрами

ROOT = Path(__file__).resolve().parent.parent


def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def clean(src, dst, denoise):
    filters = ['highpass=f=80']
    if denoise:
        filters.append('afftdn=nr=10:nf=-35')
    filters += ['acompressor=threshold=-21dB:ratio=3:attack=8:release=120:makeup=3',
                'loudnorm=I=-15:TP=-1.5:LRA=8']
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-vn', '-af', ','.join(filters),
         '-ar', '48000', '-ac', '1', str(dst)])


def load(path):
    with wave.open(str(path)) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    return x, sr


def envelope_db(x, sr, hop=0.01, win=0.03):
    h, w = int(sr * hop), int(sr * win)
    csum = np.concatenate([[0.0], np.cumsum(x.astype(np.float64) ** 2)])
    starts = np.arange(0, len(x) - w, h)
    power = (csum[starts + w] - csum[starts]) / w
    return 10 * np.log10(power + 1e-12), hop


def runs(mask):
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append([start, i])
            start = None
    if start is not None:
        out.append([start, len(mask)])
    return out


def speech_segments(db, hop):
    floor, top = np.percentile(db, 10), np.percentile(db, 95)
    thr = floor + 0.3 * (top - floor)
    segs = runs(db > thr)
    merged = []
    for s in segs:  # склеиваем куски, между которыми пауза короче MIN_GAP
        if merged and (s[0] - merged[-1][1]) * hop < MIN_GAP:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [(a * hop, b * hop) for a, b in merged if (b - a) * hop >= MIN_SPEECH]


def syllables(text):
    return max(1, sum(ch in VOWELS for ch in text))


def abs_time_at_speech(segs, c):
    """Время на ленте, когда накопилось c секунд речи (паузы не считаются)."""
    for a, b in segs:
        if c <= b - a:
            return a + c
        c -= b - a
    return segs[-1][1]


def match(segs, n):
    """Выбирает начала титров 1..n-1: ближайшие паузы по порядку, иначе оценка по слогам."""
    speech = sum(b - a for a, b in segs)
    weights = [syllables(t) for t in SPOKEN[:n]]
    total_w = sum(weights)
    est, acc = [], 0
    for w in weights[:-1]:
        acc += w
        est.append(abs_time_at_speech(segs, speech * acc / total_w))
    pauses = [(segs[j][0], segs[j][0] - segs[j - 1][1]) for j in range(1, len(segs))]  # (время, длина паузы)
    B, P = n - 1, len(pauses)

    def cost(i, p):
        t, ln = pauses[p]
        return (t - est[i]) ** 2 * (1 - 0.5 * min(1.0, ln / 0.5))  # длинная пауза надёжнее

    INF = 1e18
    f = [[INF] * (P + 1) for _ in range(B + 1)]
    how = [[None] * (P + 1) for _ in range(B + 1)]
    for j in range(P + 1):
        f[0][j] = 0.0
    for i in range(1, B + 1):
        for j in range(P + 1):
            best, h = f[i - 1][j] + FREE ** 2, 'free'
            if j > 0:
                if f[i][j - 1] < best:
                    best, h = f[i][j - 1], 'skip'
                use = f[i - 1][j - 1] + cost(i - 1, j - 1)
                if use < best:
                    best, h = use, 'use'
            f[i][j], how[i][j] = best, h
    res = [None] * B
    i, j = B, P
    while i > 0:
        h = how[i][j]
        if h == 'use':
            res[i - 1] = (pauses[j - 1][0], 'пауза')
            i, j = i - 1, j - 1
        elif h == 'skip':
            j -= 1
        else:
            res[i - 1] = (est[i - 1], 'оценка')
            i -= 1
    return res


def to_frames(times, trim):
    frames, prev = [0], 0
    for t in times:
        fr = max(prev + MIN_STEP, round((t - trim - LEAD) * FPS))
        frames.append(fr)
        prev = fr
    return frames


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('voice')
    ap.add_argument('--denoise', action='store_true')
    ap.add_argument('--skip-clean', action='store_true')
    ap.add_argument('--work', default=str(ROOT / 'work'))
    ap.add_argument('--public', default=str(ROOT / 'public'))
    args = ap.parse_args()

    work, public = Path(args.work), Path(args.public)
    work.mkdir(exist_ok=True, parents=True)
    public.mkdir(exist_ok=True, parents=True)
    cleaned = work / 'voice-clean.wav'
    if args.skip_clean:
        run(['ffmpeg', '-v', 'error', '-y', '-i', args.voice, '-vn', '-ar', '48000', '-ac', '1', str(cleaned)])
    else:
        clean(args.voice, cleaned, args.denoise)

    x, sr = load(cleaned)
    db, hop = envelope_db(x, sr)
    segs = speech_segments(db, hop)
    if not segs:
        raise SystemExit('Речь не найдена: файл пустой или слишком тихий.')
    n = len(SPOKEN)
    trim = max(0.0, segs[0][0] - 0.1)
    picks = match(segs, n)
    times = [p[0] for p in picks]
    frames = to_frames(times, trim)
    end = segs[-1][1] - trim
    total = math.ceil((end + HOLD) * FPS)

    out = public / 'voice.wav'
    run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{trim:.3f}', '-i', str(cleaned), '-c:a', 'pcm_s16le', str(out)])
    props = {'mode': 'bar', 'starts': frames, 'total': total, 'voice': 'voice.wav'}
    (work / 'props-voice.json').write_text(json.dumps(props, ensure_ascii=False), encoding='utf-8')

    print(f'Речь: {len(segs)} кусков, {sum(b - a for a, b in segs):.1f} с, от {segs[0][0]:.2f} до {segs[-1][1]:.2f} с')
    print(f'Обрезан старт: {trim:.2f} с; длина ролика: {total} кадров = {total / FPS:.1f} с')
    print('Фраза | начало, с | кадр | как найдено')
    srcs = ['старт'] + [p[1] for p in picks]
    for i, ph in enumerate(SPOKEN):
        t = 0.0 if i == 0 else times[i - 1] - trim
        print(f'{i + 1:>2}. {t:6.2f} {frames[i]:5d}  {srcs[i]:<7} {ph}')
    if any(s == 'оценка' for s in srcs):
        print('ВНИМАНИЕ: у фраз с пометкой «оценка» пауза не найдена, начало титра примерное, нужна проверка на слух.')
    if len(segs) < n:
        print(f'Кусков речи ({len(segs)}) меньше, чем фраз ({n}): часть фраз сказана без пауз.')


if __name__ == '__main__':
    main()
