#!/usr/bin/env python3
"""Титры рилса 46 (день 10, «в найме») по словам, границы пунктов и верх головы по пунктам. Пишет src/PereobCards.ts.
Слово «слово~N» забирает N распознанных слов (0: сразу после предыдущего). Использование (из video/): python3 tools/cards_r45.py"""
import json, subprocess
import numpy as np

FPS = 30
TALK = 'public/r46/talk.mp4'
TL = json.load(open('public/r46/timeline.json'))


# начала блоков (смена дубля): первый кусок каждого блока (tools/prepare_r46.py)
STARTS = [next(x['out'][0] for x in TL if x['section'] == i) for i in range(6)]
# проверка 27.11: красным не выделяем «уходи из найма», «своё» (без звука читается как лозунг Кати) и «цену» (зовёт «сколько стоит?»)
# «!» в начале экрана: не показывать (куратор 26.11: внизу не дублировать текст, который уже написан вверху: хук и вопрос)
TEXT = [
    [['!Мне 42,~2', 'и я до сих пор', 'в найме.']],
    [['*Найм научил меня'], ['*любить *себя'], ['и понимать', 'свою *ценность'], ['как специалиста.'], ['А ещё *продавать,'],
     ['держать *слово'], ['и не *сдаваться.']],
    [['Каждый день', 'я разговариваю', 'с клиентами,'], ['веду *переговоры'], ['и не *боюсь', 'назвать цену.']],
    [['Из каждого *утюга:'], ['уходи из найма,'], ['открывай своё.']],
    [['Будто в найме'], ['ты *автоматически'], ['*неудачница.~2'], ['А я в 42~2', 'работаю на кого-то.~2'], ['И для меня', 'это не *провал,'],
     ['а *разгон.']],
    [['Работать в найме', '*не *стыдно.'], ['*Стыдно делать вид,'], ['что у тебя всё есть,'], ['когда это не так.'], ['Я в найме.'],
     ['Но я точно', '*не *стою *на *месте.'], ['!А вы в найме', 'или на себя?'], ['!И сколько вам лет?']],
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
            hide = c[0].startswith('!')
            c = [c[0].lstrip('!')] + c[1:]
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
            cards.append({'from': max(0, lines[0]['words'][0]['at'] - 2), 'full': False, 'lines': [] if hide else lines})
            if hide and c[0].startswith('А вы'):
                spoiler = lines[0]['words'][0]['at']  # начало вопроса: заголовок-вопрос вверху
        assert k == len(ws), (i, k, len(ws), [w['w'] for w in ws])
    cards[0]['from'] = 0
    cuts = [round(s * FPS) for s in STARTS] + [total]
    jumps = [round(x['out'][0] * FPS) for x in TL]  # склейки (смена крупности)
    # верх головы по разделам (YuNet): верх рамки лица минус 0,15 её высоты (подобрано по кадрам 26.11), самое высокое за раздел;
    # куратор 26.11 («убрать субтитры со лба, поднять чуть выше»): проверяем каждые 0,2 с, а не 10 кадров на раздел
    import cv2
    cap = cv2.VideoCapture(TALK); det = None; tops = []
    for i in range(len(STARTS)):
        a, b = bounds[i], bounds[i + 1]; best = 1920
        nj = max(10, int((b - a) / 0.2))
        for j in range(nj):
            cap.set(cv2.CAP_PROP_POS_MSEC, (a + (b - a) * (j + 0.5) / nj) * 1000); ok, fr = cap.read()
            if not ok: continue
            h, w = fr.shape[:2]; sm = cv2.resize(fr, (w // 3, h // 3))
            if det is None: det = cv2.FaceDetectorYN_create('work/models/yunet.onnx', '', (w // 3, h // 3), 0.5, 0.3, 50)
            _, fc = det.detect(sm)
            if fc is not None and len(fc):
                fx, fy, fw, fh = [v * 3 for v in max(fc, key=lambda q: q[2] * q[3])[:4]]
                best = min(best, fy - 0.15 * fh)
        tops.append(int(best))
    ts = ("// Титры и блоки рилса 46 (tools/cards_r46.py).\nimport {Card} from './WordCaptions';\n\n"
          f"export const NAYM_FRAMES = {total};\nexport const NAYM_CUTS: number[] = {json.dumps(cuts)};\n"
          f"export const NAYM_JUMPS: number[] = {json.dumps(jumps)};\n"
          f"export const NAYM_HEADTOP: number[] = {json.dumps(tops)};\nexport const NAYM_QUESTION = {spoiler};\n"
          "export const NAYM_CARDS: Card[] = " + json.dumps(cards, ensure_ascii=False) + ";\n")
    open('src/NaymCards.ts', 'w', encoding='utf-8').write(ts)
    print(len(cards), 'экранов,', total, 'кадров, разделы', cuts, 'верх головы', tops, 'вопрос', spoiler)


if __name__ == '__main__':
    main()
