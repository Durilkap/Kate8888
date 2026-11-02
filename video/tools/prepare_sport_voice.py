#!/usr/bin/env python3
"""Рилс 13 «Свой тренер»: озвучка Кати без длинных пауз и тайминги сцен под её речь.

Использование (из папки video/):
  python3 tools/prepare_sport_voice.py запись.m4a
Пишет public/sport/voice.wav (в git не попадает) и src/sportVoice.json (длины сцен в кадрах).
Куски заданы по распознаванию (audio/transcribe.py): между фразами оставляется около 0,3 с.
"""
import json
import subprocess
import sys
from pathlib import Path

FPS = 30
ROOT = Path(__file__).resolve().parent.parent

# Сцены по порядку SportTrainer (секунды исходной записи). Одна сцена может состоять из нескольких кусков.
SCENES = [
    [(1.04, 3.98)],                    # Говорят, у меня фигура 25-летней (хук)
    [(4.12, 7.18)],                    # Но пять лет тренировок такого результата мне не дали.
    [(7.51, 10.75)],                   # И он появился за крайние три месяца.
    [(11.48, 12.81)],                  # Знаешь, что изменилось?
    [(12.92, 14.80)],                  # Я нашла своего тренера.
    [(15.22, 18.86)],                  # Раньше у меня было: тут тяжело, это не хочу.
    [(19.03, 21.61)],                  # А сейчас я всё делаю с кайфом.
    [(21.88, 23.13)],                  # Нет, я не голодаю,
    [(23.13, 24.56)],                  # не живу в зале.
    [(24.82, 27.79)],                  # Два раза в неделю тренировка и питание по плану.
    [(28.12, 29.29)],                  # Тело подтянулось,
    [(29.29, 31.07)],                  # мышцы рельефные.
    [(31.14, 33.74)],                  # Энергии стало гораздо больше.
    [(34.10, 37.17), (37.43, 40.42)],  # Было, стало. Вот это я. Мне помогла не программа, а свой тренер.
    [(40.50, 42.10)],                  # Я Екатерина.
]
# Слова, к которым привязаны события в сцене «было / стало» (секунды исходника)
MARKS = {'bylo': 34.28, 'stalo': 34.64, 'vot': 35.48, 'mne': 37.57}
END_HOLD = 24  # кадров тишины после «Я Екатерина.»


def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def main():
    src = sys.argv[1]
    pieces = [p for sc in SCENES for p in sc]
    fr = [(round(a * FPS), round(b * FPS)) for a, b in pieces]
    parts, labels = [], []
    for i, (fa, fb) in enumerate(fr):
        ta, tb = fa / FPS, fb / FPS
        fin = '' if i > 0 and fr[i - 1][1] == fa else ',afade=t=in:d=0.01'
        fout = '' if i + 1 < len(fr) and fr[i + 1][0] == fb else f',afade=t=out:st={tb - ta - 0.03:.4f}:d=0.03'
        parts.append(f'[0:a]atrim=start={ta:.4f}:end={tb:.4f},asetpts=PTS-STARTPTS{fin}{fout}[a{i}]')
        labels.append(f'[a{i}]')
    fc = ';'.join(parts) + ';' + ''.join(labels) + f'concat=n={len(fr)}:v=0:a=1,' \
        'highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150:makeup=2,' \
        'loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000[o]'
    out = ROOT / 'public' / 'sport' / 'voice.wav'
    run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex', fc, '-map', '[o]', '-ac', '2', '-c:a', 'pcm_s16le', str(out)])

    # длины сцен и пересчёт меток в кадры новой ленты
    durs, t = [], 0
    marks = {}
    for sc in SCENES:
        d = 0
        for a, b in sc:
            fa, fb = round(a * FPS), round(b * FPS)
            for k, v in MARKS.items():
                if a <= v < b:
                    marks[k] = t + d + round(v * FPS) - fa
            d += fb - fa
        durs.append(d)
        t += d
    reveal_from = sum(durs[:13])
    data = {
        'scenes': durs[:13],
        'reveal': durs[13],
        'end': durs[14] + END_HOLD,
        'marks': {k: v - reveal_from for k, v in marks.items()},
        'total': t + END_HOLD,
    }
    (ROOT / 'src' / 'sportVoice.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(data, ensure_ascii=False))
    print(f'Озвучка: {t / FPS:.2f} с, ролик {data["total"] / FPS:.2f} с')


if __name__ == '__main__':
    main()
