#!/usr/bin/env python3
"""Титры рилса 40 по словам и заголовки типажей: время слов из расшифровки дубля, текст по словам Кати.
Пишет src/FrazyCards.ts. Использование (из video/): python3 tools/cards_r40.py"""
import json

U = {u['k']: u for u in json.load(open('work/r40/units.json')) if u['words']}
TL = {x['k']: x for x in json.load(open('public/r40/timeline.json'))}
FPS = 30
MAT = 'охуевшей'  # решение Кати по субтитрам; при «мягкой» версии заменить на 'ох*евшей'
TEXT = {
    1: [['Меня называют', '*' + MAT + '.']],
    2: [['Вот фразы,', 'после которых'], ['я обхожу человека', '*за *километр.']],
    3: [['*Первая:']],
    4: [['«Корону сними».']],
    5: [['Не сниму,', 'она мне *идёт.']],
    6: [['*Вторая:']],
    7: [['«Кому ты нужна', 'с такими запросами».']],
    8: [['Тому, кто *потянет.']],
    9: [['*Третья:']],
    10: [['«Ты стала другой».']],
    11: [['Да, перестала', 'быть *удобной.'], ['*Четвёртая:']],
    12: [['«Проще будь».']],
    13: [['Проще,', 'это как вы?']],
    14: [['Нет, *спасибо.']],
    15: [['Часть 2 будет.']],
    16: [['Пишите, какую фразу', 'слышали *вы\u00a0👇']],  # неразрывный пробел: смайлик не отдельное слово
}
# заголовки сверху: (с какой единицы, по какую включительно, текст); у 4-го типажа старт со слова «Четвёртая»
HEAD = [(3, 5, '1/ «Корону сними»'), (6, 8, '2/ «Кому ты нужна...»'), (9, 11, '3/ «Ты стала другой»'), ('11w4', 14, '4/ «Проще будь»')]


def out_t(k, t):
    x = TL[k]
    return x['out'][0] + (t - x['src'][0])


def main():
    cards = []
    for k in sorted(TEXT):
        u = U[k]
        words = [w for c in TEXT[k] for l in c for w in l.split(' ')]
        assert len(words) == len(u['words']), (k, len(words), len(u['words']))
        i = 0
        for c in TEXT[k]:
            lines = []
            for l in c:
                ws = []
                for w in l.split(' '):
                    ws.append({'t': w.lstrip('*'), 'at': max(0, round(out_t(k, u['words'][i]['s']) * FPS)), 'a': w.startswith('*')})
                    i += 1
                lines.append({'big': False, 'words': ws})
            cards.append({'from': max(0, lines[0]['words'][0]['at'] - 2), 'full': False, 'lines': lines})
    cards[0]['from'] = 0
    heads = []
    for a, b, text in HEAD:
        if a == '11w4':
            start = round(out_t(11, U[11]['words'][4]['s']) * FPS) - 2
        else:
            start = round(TL[a]['out'][0] * FPS)
        end = round(TL[b]['out'][1] * FPS)
        heads.append({'from': start, 'to': end, 't': text})
    for i in range(len(heads) - 1):
        heads[i]['to'] = min(heads[i]['to'], heads[i + 1]['from'])
    total = round(TL[max(TL)]['out'][1] * FPS)
    ts = ("// Титры и заголовки рилса 40 (tools/cards_r40.py): время из расшифровки дубля Кати.\n"
          "import {Card} from './WordCaptions';\n\n"
          f"export const FRAZY_FRAMES = {total};\n"
          "export const FRAZY_HEADS: {from: number; to: number; t: string}[] = " + json.dumps(heads, ensure_ascii=False) + ";\n"
          "export const FRAZY_CUTS: number[] = " + json.dumps([round(TL[k]['out'][0] * FPS) for k in sorted(TL)] + [total]) + ";\n"
          "export const FRAZY_CARDS: Card[] = " + json.dumps(cards, ensure_ascii=False) + ";\n")
    open('src/FrazyCards.ts', 'w', encoding='utf-8').write(ts)
    print(len(cards), 'экранов,', total, 'кадров')


if __name__ == '__main__':
    main()
