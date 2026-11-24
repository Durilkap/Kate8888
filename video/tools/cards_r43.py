#!/usr/bin/env python3
"""Титры рилса 43 по словам, заголовок и счётчик пунктов: время слов из расшифровки дублей, текст по словам Кати.
Слово «слово~N» забирает N распознанных слов (0: стоит сразу после предыдущего). Пишет src/TopCards.ts.
Использование (из video/): python3 tools/cards_r43.py"""
import json

FPS = 30
TL = json.load(open('public/r43/timeline.json'))
U = {t: json.load(open(f'work/r43/{t}_units.json')) for t in ('t1', 't2')}
W = {t: [w for u in U[t] for w in u['words']] for t in U}
# по кускам: карточки -> строки (до 20-22 знаков); '*' = слово на плашке
TEXT = [
    [['Мой личный топ', 'мужских фраз,'], ['после которых', 'я понимаю:'], ['это *не *мой *мужчина.'], ['На четвёртом месте:']],
    [['«Ты слишком', 'многого хочешь».'], ['*Нет.', 'Я просто знаю,'], ['чего я хочу.']],
    [['А рядом нужен тот,', 'кого это вдохновляет,'], ['а *не *пугает.']],
    [['На третьем:', '«А зачем тебе это?»,'], ['когда я покупаю', 'что-то~2 себе.'], ['*Затем, что', 'я так хочу.']],
    [['Отчитываться за~0', 'свои желания'], ['я больше *не *буду.']],
    [['На втором:', '«Я тебе ничего', 'не должен».'], ['Это на первом~2', 'свидании.']],
    [['Конечно,', 'не должен.']],
    [['Но я не должна', 'тратить на тебя'], ['своё время.']],  # «и» не сказано (проверка 24.11)
    [['И~1 на первом месте:'], ['«Ну~1 ты же сильная,', 'справишься».'], ['*Справлюсь.'], ['Только зачем', 'тогда мне *ты?']],
    [['А какую фразу', 'добавили бы вы?'], ['Пишите', 'в комментариях 👇~0']],
]
# заголовок и счётчик: пункт k (1..4) от куска до куска включительно
HEAD = 'Мой топ мужских фраз, после которых я понимаю: это не мой мужчина'
TRIG = '(мужчины, без обид 😏)'
ITEMS = [(1, 2, '1/4'), (3, 4, '2/4'), (5, 7, '3/4'), (8, 8, '4/4')]


def main():
    cards = []
    for i, cs in enumerate(TEXT):
        x = TL[i]; tk = x['take']; a, b = x['src']; o0 = x['out'][0]
        ws = [w for w in W[tk] if a - 0.05 <= w['s'] <= b]
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
    items = [{'from': round(TL[p]['out'][0] * FPS), 'to': round(TL[q]['out'][1] * FPS), 't': t} for p, q, t in ITEMS]
    total = round(TL[-1]['out'][1] * FPS)
    cuts = [round(x['out'][0] * FPS) for x in TL] + [total]
    ts = ("// Титры, заголовок и счётчик рилса 43 (tools/cards_r43.py).\nimport {Card} from './WordCaptions';\n\n"
          f"export const TOP_FRAMES = {total};\nexport const TOP_HEAD = {json.dumps(HEAD, ensure_ascii=False)};\n"
          f"export const TOP_TRIG = {json.dumps(TRIG, ensure_ascii=False)};\n"
          f"export const TOP_ITEMS: {{from: number; to: number; t: string}}[] = {json.dumps(items, ensure_ascii=False)};\n"
          f"export const TOP_CUTS: number[] = {json.dumps(cuts)};\n"
          "export const TOP_CARDS: Card[] = " + json.dumps(cards, ensure_ascii=False) + ";\n")
    open('src/TopCards.ts', 'w', encoding='utf-8').write(ts)
    print(len(cards), 'экранов,', total, 'кадров')


if __name__ == '__main__':
    main()
