#!/usr/bin/env python3
"""Рилс 47 (челлендж Лилии, день 11, «Мне дарят цветы и подарки без повода не потому, что повезло с мужем...», 28.11).

Видео около 7 с без голоса (музыку Катя добавит в Instagram), смысл в описании (список + слово ПРОШУ).
Исходники Кати (work/r47, в git не попадают): фото p1-p9, видео v1-v5.
Не берём: p1 (номер машины и телефон дилера, на фоне дети, низкое разрешение), p4 (карточка с названием флористов,
фото людей в рамке), p6 (бренды на пакете и коробке, бирка с адресом и телефоном), p7 (беспорядок и упаковки на столе),
v1 и v3 (лица мужчины и подростка, логотипы на футболке). Берём кадры, где только Катя, цветы и подарки.
Пишет public/r47/<имя>.mp4 (1080x1920, 30 к/с, без звука) и public/r47/<имя>.jpg. Использование (из video/): python3 tools/prepare_r47.py
"""
import os, subprocess

W = 'work/r47'
# фото: (файл, имя, crop в пикселях исходника или None = весь кадр 9:16)
PHOTOS = [
    ('p5.jpg', 'roses_car', (378, 0, 1134, 2016)),   # Катя в машине с большим букетом роз, улыбается (3:4 -> 9:16: лицо и часть букета)
    ('p8.jpg', 'tulips', None),                      # Катя с тюльпанами и корзиной ромашек, улыбается
    ('p2.jpg', 'white', None),                       # белые хризантемы в машине
    ('p3.jpg', 'box', None),                         # розовая коробка с бантом
    ('p9.jpg', 'bears', (222, 0, 1134, 2016)),       # мишки «I love you»
]
# видео: (файл, имя, начало, длительность)
CLIPS = [
    ('v4.mp4', 'roses', 0.2, 1.2),    # большой букет красных роз крупно
    ('v2.mp4', 'ring', 15.5, 1.3),    # рука с кольцом (справа тарелка с «Happy Birthday»: обрезаем, хук «без повода»)
    ('v5.mp4', 'heart', 14.0, 1.3),   # сердце из лепестков на кровати и мишка
]
GRADE = 'eq=contrast=1.04:saturation=1.05'
# дополнительное кадрирование до вписывания в 1080x1920 (проверка 28.11): кольцо без тарелки с «Happy Birthday» справа
PRECROP = {'ring': 'crop=iw*0.73:ih*0.73:0:ih*0.18,'}


def main():
    os.makedirs('public/r47', exist_ok=True)
    for f, n, crop in PHOTOS:
        c = f'crop={crop[2]}:{crop[3]}:{crop[0]}:{crop[1]},' if crop else ''
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{W}/photo/{f}', '-vf',
                        f'{c}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,{GRADE}', '-q:v', '2',
                        f'public/r47/{n}.jpg'], check=True)
    for f, n, ss, d in CLIPS:
        pre = PRECROP.get(n, '')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-t', str(d), '-i', f'{W}/take/{f}', '-an', '-vf',
                        f'{pre}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,{GRADE},format=yuv420p',
                        '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-map_metadata', '-1', f'public/r47/{n}.mp4'], check=True)
    print('фото', len(PHOTOS), 'видео', len(CLIPS))


if __name__ == '__main__':
    main()
