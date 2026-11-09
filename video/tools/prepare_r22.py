#!/usr/bin/env python3
"""Рилс 22 «Завидуют те, кто ничего не делает»: спокойные фото для фона (решение Кати 09.11: картинки из интернета).

Источник: Unsplash (images.unsplash.com, обычные фото, не Unsplash+). Лицензия Unsplash: бесплатное использование,
в том числе коммерческое, указание автора не обязательно; продавать фото без изменений нельзя. Сверить: unsplash.com/license.
Людей, брендов и надписей на фото нет (проверено помощником 09.11).

Использование (из папки video/):
  python3 tools/prepare_r22.py public/r22
Пишет bg1..bg6.jpg 1296x2304 (вертикальная обрезка Unsplash, запас под приближение), без метаданных.
"""
import io
import sys
import urllib.request
from pathlib import Path

from PIL import Image

PHOTOS = {
    'bg1': '1418065460487-3e41a6c84dc5',  # туман над хвойным лесом
    'bg2': '1475924156734-496f6cac6ec1',  # вечернее море, фиолетовое небо
    'bg3': '1506905925346-21bda4d32df4',  # горы над облаками на рассвете
    'bg4': '1500530855697-b586d89ba3ee',  # дорога в каньоне
    'bg5': '1439066615861-d1af74d74000',  # деревянный пирс на тихом озере
    'bg6': '1507525428034-b723cf961d3e',  # пляж, волна, рассвет
}


def main():
    dst = Path(sys.argv[1])
    dst.mkdir(parents=True, exist_ok=True)
    for name, pid in PHOTOS.items():
        url = f'https://images.unsplash.com/photo-{pid}?w=1296&h=2304&fit=crop&crop=entropy&q=90&fm=jpg'
        data = urllib.request.urlopen(url, timeout=60).read()
        Image.open(io.BytesIO(data)).convert('RGB').save(dst / f'{name}.jpg', quality=92)
        print(name, pid)


if __name__ == '__main__':
    main()
