#!/usr/bin/env python3
"""Титры рилса 44 по словам и расписание карточек комментариев. Пишет src/KommCards.ts.
Слово «слово~N» забирает N распознанных слов (0: сразу после предыдущего). Использование (из video/): python3 tools/cards_r44.py"""
import json

FPS = 30
TL = json.load(open('public/r44/timeline.json'))
U = {t: json.load(open(f'work/r44/{t}_units.json')) for t in ('t1', 't2', 't3')}
W = {t: [w for u in U[t] for w in u['words']] for t in U}
TEXT = [
    [['Вопрос:']],
    [['женщина, которая', 'знает свою ценность,'], ['это *меркантильная?']],
    [['Под моим рилсом', 'больше *сотни', '*комментариев.'], ['Читаю самые яркие,'], ['а своё мнение', 'скажу в конце.']],
    [['«Не знал, что', 'молекулы пахнут»'], ['*Пахнут.', 'Особенно на', 'правильной *женщине 😌~0']],
    [['«Это все названия', 'порошков', 'перечислили?»'], ['Я же говорю:', 'лишь *малую *часть 😉~0']],
    [['«Нет уж, мне бывшей', 'хватило с её', 'уровнем жизни»']],
    [['Уровень жизни', 'тут ни при чём.'], ['Дело в~0 *уважении.']],
    [['«Да нам пофиг,', 'от кого чем пахнет,'], ['лишь бы человеком', 'была хорошим»']],
    [['*Согласна.', 'Одно другому', 'не мешает 😉~0']],
    [['«Всё верно.', 'Влюбляемся,'], ['но выключаем', 'эту х*рню сразу же,'], ['проверяем', 'на вшивость»']],
    [['Вот это подход,', '*аплодирую 👏~0']],
    [['Моё мнение:'], ['женщина, которая', 'знает свою ценность,'], ['*не *меркантильная.'], ['Она просто', 'не продаёт себя', '*дёшево.']],
    [['А вы как думаете?'], ['Пишите', 'в комментариях 👇~0']],
]
HEAD = 'Женщина, которая знает свою ценность: меркантильная?'  # как говорит Катя (проверка 25.11)


def piece_words(tk, a, b):
    """Слова куска со временем: распознаём ровно отрезок [a, b] дубля (так время совпадает со склейкой)."""
    import subprocess, numpy as np, sherpa_onnx
    global REC
    if 'REC' not in globals():
        M = 'work/models/giga3'
        REC = sherpa_onnx.OfflineRecognizer.from_nemo_ctc(model=f'{M}/model.int8.onnx', tokens=f'{M}/tokens.txt', num_threads=4)
    p = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a), '-t', str(b - a), '-i', f'work/r44/take/{tk}.mov', '-vn', '-ac', '1',
                        '-ar', '16000', '-f', 's16le', '-'], capture_output=True)
    x = np.frombuffer(p.stdout, np.int16).astype(np.float32) / 32768
    s = REC.create_stream(); s.accept_waveform(16000, x); REC.decode_stream(s); r = s.result
    words, cur = [], None
    for tok, tt in zip(r.tokens, r.timestamps):
        tt += a
        if tok.strip() == '' or tok == '▁':
            if cur: words.append(cur); cur = None
            continue
        if tok.startswith('▁') and cur: words.append(cur); cur = None
        t2 = tok.replace('▁', '')
        if cur is None: cur = {'w': t2, 's': round(tt, 2)}
        else: cur['w'] += t2
    if cur: words.append(cur)
    return words


def main():
    cards = []
    for i, cs in enumerate(TEXT):
        x = TL[i]; tk = x['take']; a, b = x['src']; o0 = x['out'][0]
        ws = piece_words(tk, a, b)
        k = 0; last = None
        for c in cs:
            lines = []
            for l in c:
                out = []
                for tok in l.split(' '):
                    n = 1
                    if '~' in tok:
                        tok, n = tok.split('~'); n = int(n)
                    if n == 0:
                        t = (last if last is not None else ws[k]['s']) + 0.12
                    else:
                        t = ws[k]['s']; k += n
                    last = t
                    out.append({'t': tok.lstrip('*'), 'at': max(0, round((o0 + t - a) * FPS)), 'a': tok.startswith('*')})
                lines.append({'big': False, 'words': out})
            cards.append({'from': max(0, lines[0]['words'][0]['at'] - 2), 'full': False, 'lines': lines})
        assert k == len(ws), (i, k, len(ws), [w['w'] for w in ws])
    cards[0]['from'] = 0
    total = round(TL[-1]['out'][1] * FPS)
    # карточки комментариев: от начала первого куска с этой карточкой до конца последнего
    sched = []
    for x in TL:
        if x['card'] is None:
            continue
        f0, f1 = round(x['out'][0] * FPS), round(x['out'][1] * FPS)
        if sched and sched[-1]['n'] == x['card']:
            sched[-1]['to'] = f1
        else:
            sched.append({'n': x['card'], 'from': f0, 'to': f1})
    head_to = round(TL[2]['out'][1] * FPS)
    cuts = [round(x['out'][0] * FPS) for x in TL] + [total]
    # куратор 25.11: текст сверху опустить к голове, минимальный зазор. Для каждого куска ищем верх головы (YuNet):
    # верх рамки лица минус доля её высоты на лоб и волосы (подобрано по кадрам: дубли 1-2 0,3, крупный дубль 3 0,5),
    # берём самое высокое положение за кусок
    import cv2
    cap = cv2.VideoCapture('public/r44/talk.mp4'); det = None; tops = []
    for x in TL:
        a, b = x['out']; best = 1920
        for k in range(8):
            t = a + (b - a) * (k + 0.5) / 8
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); ok, fr = cap.read()
            if not ok: continue
            h, w = fr.shape[:2]; sm = cv2.resize(fr, (w // 3, h // 3))
            if det is None: det = cv2.FaceDetectorYN_create('work/models/yunet.onnx', '', (w // 3, h // 3), 0.5, 0.3, 50)
            _, fc = det.detect(sm)
            if fc is not None and len(fc):
                fx, fy, fw, fh = [v * 3 for v in max(fc, key=lambda q: q[2] * q[3])[:4]]
                best = min(best, fy - (0.5 if x['take'] == 't3' else 0.3) * fh)
        tops.append(int(best))
    ts = ("// Титры и карточки рилса 44 (tools/cards_r44.py).\nimport {Card} from './WordCaptions';\n\n"
          f"export const KOMM_FRAMES = {total};\nexport const KOMM_HEAD = {json.dumps(HEAD, ensure_ascii=False)};\n"
          f"export const KOMM_HEAD_TO = {head_to};\n"
          f"export const KOMM_SCHED: {{n: number; from: number; to: number}}[] = {json.dumps(sched)};\n"
          f"export const KOMM_CUTS: number[] = {json.dumps(cuts)};\n"
          f"export const KOMM_HEADTOP: number[] = {json.dumps(tops)};\n"
          "export const KOMM_CARDS: Card[] = " + json.dumps(cards, ensure_ascii=False) + ";\n")
    open('src/KommCards.ts', 'w', encoding='utf-8').write(ts)
    print(len(cards), 'экранов,', total, 'кадров,', len(sched), 'карточек')


if __name__ == '__main__':
    main()
