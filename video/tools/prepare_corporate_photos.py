#!/usr/bin/env python3
"""Рилс 16 «Хороший продажник»: три фото Кати с корпоратива.

Убирается всё, по чему узнаётся работодатель и чужие люди:
  k1 - логотип и название на круглой табличке за спиной (закрашиваются цветом таблички);
  k2 - гости за столами и бутылки на фоне (размытие);
  k3 - значок в руке, логотип и весь текст грамоты, кроме слова «ГРАМОТА» (решение Кати 04.11),
       открытка с подписями, надпись марки на синтезаторе.

Использование (из папки video/):
  python3 tools/prepare_corporate_photos.py work/r16/src public/r16
Вход: k1.jpg, k2.jpg, k3.jpg (853x1280). Выход: те же имена без EXIF.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

# Рамки в пикселях исходника (853x1280): x0, y0, x1, y1
INPAINT = {1: [(282, 190, 440, 340)]}                     # логотип и «ГАММА-М»
BLUR = {
    2: [(0, 430, 250, 640), (540, 440, 765, 625)],        # гости и бутылки слева, гости справа
    3: [(276, 366, 327, 407),                             # значок в руке
        (138, 328, 218, 354)],                            # марка на синтезаторе
}
# Грамота: размыть рамку целиком, кроме слова «ГРАМОТА»
CERT = {3: ((400, 418, 532, 582), (450, 476, 526, 503))}
CERT_EXTRA = {3: [(402, 578, 468, 599)]}  # низ открытки с подписями


def feather(h, w, boxes, sigma):
    m = np.zeros((h, w), np.float32)
    for x0, y0, x1, y1 in boxes:
        m[y0:y1, x0:x1] = 1
    return cv2.GaussianBlur(m, (0, 0), sigma)


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for n in (1, 2, 3):
        a = np.asarray(Image.open(src / f'k{n}.jpg').convert('RGB'))
        h, w = a.shape[:2]
        if n in INPAINT:
            m = np.zeros((h, w), np.uint8)
            for x0, y0, x1, y1 in INPAINT[n]:
                m[y0:y1, x0:x1] = 255
            a = cv2.inpaint(a, m, 25, cv2.INPAINT_TELEA)
            soft = cv2.GaussianBlur(a, (0, 0), 6)
            fm = feather(h, w, INPAINT[n], 4)[..., None]
            a = (a * (1 - fm) + soft * fm).astype(np.uint8)
        f = a.astype(np.float32)
        if n in BLUR:
            m = feather(h, w, BLUR[n], 6)[..., None]
            f = f * (1 - m) + cv2.GaussianBlur(f, (0, 0), 16) * m
        if n in CERT:
            outer, keep = CERT[n]
            m = np.maximum(feather(h, w, [outer], 2.5), feather(h, w, CERT_EXTRA.get(n, []), 2)) - feather(h, w, [keep], 1.5)
            m = np.clip(m, 0, 1)[..., None]
            f = f * (1 - m) + cv2.GaussianBlur(f, (0, 0), 7) * m
        Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).save(dst / f'k{n}.jpg', quality=95)
        print(n, w, 'x', h)


if __name__ == '__main__':
    main()
