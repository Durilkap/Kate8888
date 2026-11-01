#!/usr/bin/env python3
"""Рилс «Слишком» в машине (рилс 12): монтаж без пауз и данные для Remotion.

Что делает:
  1) вырезает из исходника куски речи (паузы и запинки убираются), кадр в кадр со звуком;
  2) видео: 1080x1920 (lanczos), лёгкая резкость; звук: срез низов, мягкая компрессия, около -14 LUFS;
  3) переносит слова из распознавания (transcribe.py) на новую ленту и пишет src/slishkomCar.json.

Использование (из папки video/):
  python3 tools/prepare_slishkom_car.py исходник.mp4 asr.json
Результат: public/car/edit.mp4, public/car/voice.wav (в git не попадают), src/slishkomCar.json.
"""
import json
import subprocess
import sys
from pathlib import Path

FPS = 30
ROOT = Path(__file__).resolve().parent.parent

# Куски исходника (секунды), kind: video = видно лицо, card = засвет солнцем, показываем крупный текст.
# Начало «Вам говорили когда-нибудь... не говорили?» (0-11,7 с) и концовка с грубым словом (56,3-60,4 с) не входят.
PIECES = [
    (11.74, 15.02, 'video'),  # Мне говорили о том, что я слишком многого хочу.
    (15.58, 18.60, 'video'),  # ...слишком уверена в себе.
    (19.39, 22.54, 'video'),  # ...слишком яркая.
    (24.00, 26.95, 'video'),  # Знаете, только спустя некоторое время
    (28.12, 30.22, 'video'),  # я начала понимать: почему?
    (30.56, 31.47, 'video'),  # Для чего?
    (32.51, 34.67, 'video'),  # А для того, чтобы меня прогнуть под себя.
    (35.10, 37.23, 'video'),  # Для того, чтобы я уменьшалась.
    (37.63, 42.83, 'video'),  # Для того, чтобы я принимала чужие правила игры.
    (43.00, 44.52, 'card'),   # Но я выбрала другое.
    (45.28, 46.79, 'video'),  # Сейчас я не прогибаюсь,
    (47.04, 48.39, 'card'),   # никому ничего не доказываю.
    (48.67, 51.08, 'card'),   # Я иду своим путём.
    (51.55, 52.80, 'video'),  # Я иду к своей цели,
    (52.80, 54.47, 'card'),   # я иду к своей мечте. (солнце в кадре, финал крупным текстом)
]

# Слова на экране по кускам: (как распознано, как показать, золото). None в распознанном = слово не распознано, время берётся между соседями.
G = True
WORDS = [
    [('мне', 'Мне'), ('говорили', 'говорили'), ('о', 'о'), ('том', 'том,'), ('что', 'что'), ('я', 'я'), ('слишком', 'слишком', G), ('многого', 'многого', G), ('хочу', 'хочу.', G)],
    [('мне', 'Мне'), ('говорили', 'говорили'), ('о', 'о'), ('том', 'том,'), ('что', 'что'), ('я', 'я'), ('слишком', 'слишком', G), ('уверена', 'уверена', G), ('в', 'в', G), ('себе', 'себе.', G)],
    [('мне', 'Мне'), ('говорили', 'говорили'), ('о', 'о'), ('том', 'том,'), ('что', 'что'), ('я', 'я'), ('слишком', 'слишком', G), ('яркая', 'яркая.', G)],
    [('знаете', 'Знаете,'), ('только', 'только'), ('спустя', 'спустя'), ('некоторое', 'некоторое'), ('время', 'время')],
    [('я', 'я'), ('начала', 'начала'), ('понимать', 'понимать:'), ('почему', 'почему?', G)],
    [('для', 'Для'), ('чего', 'чего?', G)],
    [('а', 'А'), ('для', 'для'), ('того', 'того,'), ('чтобы', 'чтобы'), ('меня', 'меня'), ('прогнуть', 'прогнуть', G), ('под', 'под'), ('себя', 'себя.')],
    [('для', 'Для'), ('того', 'того,'), ('чтобы', 'чтобы'), ('я', 'я'), ('уменьшалась', 'уменьшалась.', G)],
    [('для', 'Для'), ('того', 'того,'), ('чтобы', 'чтобы'), ('я', 'я'), ('принимала', 'принимала'), ('чужие', 'чужие', G), ('правила', 'правила', G), ('игры', 'игры.', G)],
    [('но', 'Но'), ('я', 'я'), ('выбрала', 'выбрала'), ('другое', 'ДРУГОЕ.', G)],
    [('сейчас', 'Сейчас'), ('я', 'я'), ('не', 'не', G), ('прогибаюсь', 'прогибаюсь,', G)],
    [('кому', 'Никому'), ('ничего', 'ничего'), ('не', 'НЕ', G), ('доказываю', 'ДОКАЗЫВАЮ.', G)],
    [('я', 'Я'), ('иду', 'иду'), (None, 'СВОИМ', G), ('путем', 'ПУТЁМ.', G)],
    [('я', 'Я'), ('иду', 'иду'), ('к', 'к'), ('своей', 'своей'), ('цели', 'цели,', G)],
    [('я', 'Я'), ('иду', 'иду'), ('к', 'к'), ('своей', 'своей'), ('мечте', 'МЕЧТЕ.', G)],
]
# Разбивка субтитров на строки-фразы (номера слов, с которых начинается новая фраза) и строки карточек.
CHUNKS = [[0, 4, 7], [0, 4, 7], [0, 4, 7], [0, 2], [0, 3], [0], [0, 4], [0, 3], [0, 4, 5], [0, 3], [0, 2], [0, 2], [0, 2], [0, 2], [0, 4]]
CARD_SIZES = {9: [96, 190], 11: [96, 150], 12: [110, 170], 14: [96, 210]}


def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def asr_words(asr, a, b):
    out = []
    for seg in asr:
        for w in seg['words']:
            if a - 0.05 <= w['start'] < b:
                out.append(w)
    return out


def main():
    src, asr_path = sys.argv[1], sys.argv[2]
    asr = json.loads(Path(asr_path).read_text(encoding='utf-8'))
    pub = ROOT / 'public' / 'car'
    pub.mkdir(parents=True, exist_ok=True)

    frames = [(round(a * FPS), round(b * FPS), k) for a, b, k in PIECES]
    vparts, aparts, labels = [], [], []
    for i, (fa, fb, _) in enumerate(frames):
        vparts.append(f'[0:v]trim=start_frame={fa}:end_frame={fb},setpts=PTS-STARTPTS[v{i}]')
        ta, tb = fa / FPS, fb / FPS
        # мягкие края звука только там, где вырезана пауза; стык соседних кусков без провала
        fin = '' if i > 0 and frames[i - 1][1] == fa else ',afade=t=in:d=0.008'
        fout = '' if i + 1 < len(frames) and frames[i + 1][0] == fb else f',afade=t=out:st={tb - ta - 0.02:.4f}:d=0.02'
        aparts.append(f'[0:a]atrim=start={ta:.4f}:end={tb:.4f},asetpts=PTS-STARTPTS{fin}{fout}[a{i}]')
        labels.append(f'[v{i}][a{i}]')
    n = len(frames)
    fc = ';'.join(vparts + aparts) + ';' + ''.join(labels) + f'concat=n={n}:v=1:a=1[vc][ac];' \
        '[vc]scale=1080:1920:flags=lanczos,unsharp=5:5:0.45:5:5:0,format=yuv420p[vo];' \
        '[ac]highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150:makeup=2,' \
        'loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000[ao]'
    tmp = ROOT / 'work' / 'car-edit-tmp.mkv'
    run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex', fc, '-map', '[vo]', '-map', '[ao]',
         '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-g', '30', '-c:a', 'pcm_s16le', str(tmp)])
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-map', '0:v', '-c', 'copy', '-map_metadata', '-1', str(pub / 'edit.mp4')])
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-map', '0:a', '-c', 'copy', str(pub / 'voice.wav')])

    pieces, out_f = [], 0
    for i, ((fa, fb, kind), (a, _, _)) in enumerate(zip(frames, PIECES)):
        start_out = out_f
        found = asr_words(asr, a, fb / FPS)
        spec = WORDS[i]
        words, k = [], 0
        for j, item in enumerate(spec):
            heard, text = item[0], item[1]
            gold = len(item) > 2
            if heard is None:
                t = None
            else:
                if k >= len(found) or found[k]['w'] != heard:
                    raise SystemExit(f'Кусок {i}: ожидалось «{heard}», распознано {[w["w"] for w in found]}')
                t = found[k]['start']
                k += 1
            words.append({'text': text, 'src': t, 'gold': gold})
        for j, w in enumerate(words):  # нераспознанное слово: середина между соседями
            if w['src'] is None:
                prev = words[j - 1]['src']
                nxt = words[j + 1]['src']
                w['src'] = prev + (nxt - prev) * 0.45
        for w in words:
            w['f'] = start_out + max(0, round((w['src'] - fa / FPS) * FPS) - 1)
            del w['src']
        chunk_starts = CHUNKS[i]
        chunks = []
        for c, s in enumerate(chunk_starts):
            e = chunk_starts[c + 1] if c + 1 < len(chunk_starts) else len(words)
            chunks.append(words[s:e])
        piece = {'from': start_out, 'to': start_out + (fb - fa), 'kind': kind, 'chunks': chunks}
        if kind == 'card':
            piece['sizes'] = CARD_SIZES[i]
        pieces.append(piece)
        out_f += fb - fa

    data = {'editFrames': out_f, 'pieces': pieces}
    (ROOT / 'src' / 'slishkomCar.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'Монтаж: {out_f} кадров = {out_f / FPS:.2f} с из {len(PIECES)} кусков')
    for i, p in enumerate(pieces):
        txt = ' / '.join(' '.join(w['text'] for w in ch) for ch in p['chunks'])
        print(f'{i:2d} {p["kind"]:5s} {p["from"]:4d}-{p["to"]:4d}  {txt}')


if __name__ == '__main__':
    main()
