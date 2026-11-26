#!/usr/bin/env python3
"""Титры рилса 45 по словам, границы пунктов и верх головы по пунктам. Пишет src/PereobCards.ts.
Слово «слово~N» забирает N распознанных слов (0: сразу после предыдущего). Использование (из video/): python3 tools/cards_r45.py"""
import json, subprocess
import numpy as np

FPS = 30
TALK = 'public/r45/talk.mp4'
TL = json.load(open('public/r45/timeline.json'))


# начала разделов (хук, 1-4, вопрос): первый кусок каждого раздела (tools/prepare_r45.py, версия 3: смена дубля на каждом пункте)
STARTS = [next(x['out'][0] for x in TL if x['section'] == i) for i in range(6)]
TEXT = [
    [['В чём я', '*переобулась,'], ['когда у меня', 'сформировались', 'лобные доли.'], ['*Спойлер:', 'на это ушло', '*два *брака.']],
    [['*Первое.', 'Раньше я ждала,'], ['что мужчина', 'сам *догадается.'], ['Два брака ждала.', '*Не *догадались.'],
     ['Теперь я', 'прошу *прямо.'], ['И да,', 'мне *дарят 😏~0']],
    [['*Второе.', 'Раньше я объясняла'], ['каждое своё', '*«нет».'], ['Теперь', 'не *оправдываюсь.'],
     ['Ни за желания,', 'ни за цену,', 'ни за *«нет».'], ['«Мне так', 'не подходит»,'], ['и этого', '*достаточно.']],
    [['*Третье.', 'Раньше я думала,'], ['что хорошая жена', '*обязана'], ['готовить', 'и убирать.'],
     ['Теперь я', '*не *убираюсь', '*и *не *готовлю.'], ['И да,', 'я *замужем 😏~0']],
    [['И *четвёртое.'], ['Раньше слово', '«меркантильная»'], ['меня *задевало.'], ['Теперь я', 'спокойно говорю:'],
     ['женщина, которая', 'знает свою ценность,'], ['*не *меркантильная.'], ['Она просто', 'не продаёт себя', '*дёшево.']],
    [['С каким пунктом', 'вы *согласны,'], ['с каким', 'готовы *спорить?'], ['*Пишите 👇~0']],
]
REC = None


def words(a, b):
    """Слова отрезка [a, b] ролика со временем (ASR GigaAM v3, локально)."""
    global REC
    import sherpa_onnx
    if REC is None:
        M = 'work/models/giga3'
        REC = sherpa_onnx.OfflineRecognizer.from_nemo_ctc(model=f'{M}/model.int8.onnx', tokens=f'{M}/tokens.txt', num_threads=4)
    p = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a), '-t', str(b - a), '-i', TALK, '-vn', '-ac', '1', '-ar', '16000',
                        '-f', 's16le', '-'], capture_output=True)
    x = np.frombuffer(p.stdout, np.int16).astype(np.float32) / 32768
    s = REC.create_stream(); s.accept_waveform(16000, x); REC.decode_stream(s); r = s.result
    ws, cur = [], None
    for tok, tt in zip(r.tokens, r.timestamps):
        tt += a
        if tok.strip() == '' or tok == '▁':
            if cur: ws.append(cur); cur = None
            continue
        if tok.startswith('▁') and cur: ws.append(cur); cur = None
        t2 = tok.replace('▁', '')
        if cur is None: cur = {'w': t2, 's': round(tt, 2)}
        else: cur['w'] += t2
    if cur: ws.append(cur)
    return ws


def main():
    total_s = TL[-1]['out'][1]
    total = round(total_s * FPS)
    bounds = STARTS + [total_s]
    cards, spoiler = [], None
    for i, cs in enumerate(TEXT):
        ws = words(bounds[i], bounds[i + 1])
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
                    out.append({'t': tok.lstrip('*'), 'at': max(0, round(t * FPS)), 'a': tok.startswith('*')})
                lines.append({'big': False, 'words': out})
            cards.append({'from': max(0, lines[0]['words'][0]['at'] - 2), 'full': False, 'lines': lines})
            if i == 0 and c[0].startswith('*Спойлер'):
                spoiler = lines[0]['words'][0]['at']
        assert k == len(ws), (i, k, len(ws), [w['w'] for w in ws])
    cards[0]['from'] = 0
    cuts = [round(s * FPS) for s in STARTS] + [total]
    jumps = [round(x['out'][0] * FPS) for x in TL]  # склейки (смена крупности)
    # верх головы по разделам (YuNet): верх рамки лица минус 0,15 её высоты (подобрано по кадрам 26.11), самое высокое за раздел
    import cv2
    cap = cv2.VideoCapture(TALK); det = None; tops = []
    for i in range(len(STARTS)):
        a, b = bounds[i], bounds[i + 1]; best = 1920
        for j in range(10):
            cap.set(cv2.CAP_PROP_POS_MSEC, (a + (b - a) * (j + 0.5) / 10) * 1000); ok, fr = cap.read()
            if not ok: continue
            h, w = fr.shape[:2]; sm = cv2.resize(fr, (w // 3, h // 3))
            if det is None: det = cv2.FaceDetectorYN_create('work/models/yunet.onnx', '', (w // 3, h // 3), 0.5, 0.3, 50)
            _, fc = det.detect(sm)
            if fc is not None and len(fc):
                fx, fy, fw, fh = [v * 3 for v in max(fc, key=lambda q: q[2] * q[3])[:4]]
                best = min(best, fy - 0.15 * fh)
        tops.append(int(best))
    ts = ("// Титры и разделы рилса 45 (tools/cards_r45.py).\nimport {Card} from './WordCaptions';\n\n"
          f"export const PER_FRAMES = {total};\nexport const PER_CUTS: number[] = {json.dumps(cuts)};\n"
          f"export const PER_JUMPS: number[] = {json.dumps(jumps)};\n"
          f"export const PER_HEADTOP: number[] = {json.dumps(tops)};\nexport const PER_SPOILER = {spoiler};\n"
          "export const PER_CARDS: Card[] = " + json.dumps(cards, ensure_ascii=False) + ";\n")
    open('src/PereobCards.ts', 'w', encoding='utf-8').write(ts)
    print(len(cards), 'экранов,', total, 'кадров, разделы', cuts, 'верх головы', tops, 'спойлер', spoiler)


if __name__ == '__main__':
    main()
