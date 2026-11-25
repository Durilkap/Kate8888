#!/usr/bin/env python3
"""Рилс 44 (челлендж, день 8, формат «Threads» на своих комментариях): карточки комментариев под «Мужчины, выбирайте».

Скрины Кати 25.11 (work/r44/shots, в git не попадают). Ник и аватарка каждого автора закрыты (пикселизация и размытие,
решение Кати 17.11), упоминание ника в ответе Кати тоже. Пишет public/r44/c<N>.png со скруглёнными углами.
Использование (из video/): python3 tools/prepare_r44.py
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SH = 'work/r44/shots'
# (файл, вырез (x0, y0, x1, y1), закрыть [(x0, y0, x1, y1)] в координатах выреза, замены текста [(x0,y0,x1,y1,текст)])
CARDS = [
    ('083e9fc5-image.jpg', (0, 22, 1320, 152), [(30, 0, 148, 122), (150, 18, 420, 66)], []),          # «Не знал, что молекулы пахнут»
    ('f21e51ab-image.jpg', (0, 8, 1320, 330), [(30, 0, 148, 108), (150, 6, 370, 50), (250, 262, 520, 312)], []),  # «Это все названия порошков...» + ответ Кати
    ('083e9fc5-image.jpg', (0, 232, 1320, 395), [(30, 0, 148, 110), (150, 12, 365, 60)], []),       # «Нет уж, мне бывшей хватило...»
    ('f21e51ab-image.jpg', (0, 405, 1320, 568), [(30, 0, 148, 110), (150, 10, 670, 56)], []),       # «Да нам пофиг, от кого чем пахнет...»
    ('17028560-image.jpg', (0, 10, 1320, 228), [(30, 0, 148, 112), (150, 4, 405, 58)], [(154, 117, 272, 160, 'х*рню')]),  # «Влюбляемся, но выключаем...»
    ('29ed8686-image.jpg', (0, 10, 1320, 152), [(30, 0, 148, 112), (150, 0, 290, 60)], []),         # «Инфаркт и смерть...» (запас)
]


def cover(im, box):
    x0, y0, x1, y1 = box
    reg = im.crop(box)
    w, h = reg.size
    reg = reg.resize((max(1, w // 16), max(1, h // 16)), Image.BILINEAR).resize((w, h), Image.NEAREST)
    reg = reg.filter(ImageFilter.GaussianBlur(8))
    im.paste(reg, (x0, y0))


# голос и видео: лучшие куски по фразам из дублей t1, t2, t3 (t4 = копия t3);
# выбраны по крупной сетке лиц (Катя 25.11: «Выбери лучшие кадры, чтобы везде было красиво, чтобы влюбиться»)
PIECES = [  # (дубль, начало, конец, карточка или None)
    # Катя 25.11: первый кадр был некрасивый; начало с дубля 3 (спокойное лицо, губы сомкнуты)
    ('t3', 0.78, 1.40, None),    # Вопрос:
    ('t1', 1.56, 4.42, None),    # женщина, которая знает свою ценность, это меркантильная?
    ('t1', 4.60, 9.38, None),    # Под моим рилсом больше сотни комментариев...
    ('t1', 9.72, 13.72, 1),      # «Не знал, что молекулы пахнут». Пахнут. Особенно на правильной женщине.
    ('t1', 14.48, 18.78, 2),     # «Это все названия порошков перечислили?» Я же говорю: лишь малую часть.
    ('t3', 19.06, 21.48, 3),     # «Нет уж, мне бывшей хватило с её уровнем жизни»
    ('t2', 22.82, 25.56, 3),     # Уровень жизни тут ни при чём. Дело в уважении. (дубль 2: спокойный взгляд в камеру)
    ('t1', 25.24, 28.46, 4),     # «Да нам пофиг, от кого чем пахнет...»
    ('t2', 29.70, 31.84, 4),     # Согласна. Одно другому не мешает. (дубль 2: без гримас и жестов)
    ('t1', 31.90, 36.72, 5),     # «Всё верно. Влюбляемся, но выключаем эту х*рню...»
    ('t1', 36.90, 38.98, 5),     # Вот это подход, аплодирую.
    ('t1', 39.18, 44.50, None),  # Моё мнение: ... не продаёт себя дёшево.
    ('t3', 44.88, 46.62, None),  # А вы как думаете? Пишите в комментариях. (с 44,88: до этого хвост «дёшево», было задвоение)
]
# кадрирование (Катя 25.11: «кадры максимально эстетичные»): срезать потолок машины, лицо крупнее и по центру,
# макушка примерно на 22 % высоты; (ширина, высота, x, y) в кадре 1080x1920
CROP = {'t1': (830, 1476, 31, 427), 't2': (810, 1440, 78, 480), 't3': (956, 1700, 0, 53)}
# тёплый мягкий цвет (куратор 23.11 просила меньше синевы)
WARM = 'colortemperature=temperature=5600:mix=0.5,eq=gamma=1.04:saturation=1.04'


def talk():
    import json, subprocess
    fc, tl, t = [], [], 0.0
    for i, (tk, a, b, card) in enumerate(PIECES):
        idx = {'t1': 0, 't2': 1, 't3': 2}[tk]
        cw, ch, cx, cy = CROP[tk]
        fc.append(f"[{idx}:v]trim={a}:{b},setpts=PTS-STARTPTS,crop={cw}:{ch}:{cx}:{cy},scale=1080:1920:flags=lanczos,fps=30,{WARM}[v{i}];"
                  f"[{idx}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={b - a - 0.03:.3f}:d=0.03[a{i}];")
        tl.append({'take': tk, 'src': [a, b], 'out': [round(t, 3), round(t + b - a, 3)], 'card': card})
        t += b - a
    n = len(PIECES)
    fc.append(''.join(f'[v{i}][a{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=1[v][a0];[a0]loudnorm=I=-14:TP=-1.5:LRA=11[a]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'work/r44/take/t1.mov', '-i', 'work/r44/take/t2.mov', '-i', 'work/r44/take/t3.mov',
                    '-filter_complex', ''.join(fc), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '15',
                    '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-map_metadata', '-1', 'public/r44/talk.mp4'], check=True)
    json.dump(tl, open('public/r44/timeline.json', 'w'), ensure_ascii=False, indent=1)
    print(n, 'кусков,', round(t, 2), 'с')


def main():
    talk()
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 40)
    for i, (f, crop, covers, repl) in enumerate(CARDS, 1):
        im = Image.open(f'{SH}/{f}').convert('RGB').crop(crop)
        for b in covers:
            cover(im, b)
        d = ImageDraw.Draw(im)
        for x0, y0, x1, y1, t in repl:
            d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255))
            d.text((x0 + 4, y0 + 28), t, fill=(20, 20, 20), font=font, anchor='ls')  # на базовой линии строки
        m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=34, fill=255)
        out = Image.new('RGBA', im.size)
        out.paste(im, (0, 0), m)
        out.save(f'public/r44/c{i}.png')
    print('карточек', len(CARDS))


if __name__ == '__main__':
    main()
