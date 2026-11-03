#!/usr/bin/env python3
"""Рилс 14 «Как я стала девочкой»: подготовка свадебных фото Кати.

Размываются муж, гости, ведущий, фотографы, свидетельство о браке, баллончики с лаком.
Горизонтальные фото режутся в вертикаль 9:16 вокруг Кати. Фото с бутылкой (марка алкоголя) и первый танец
с толпой гостей не используются.

Использование (из папки video/):
  python3 tools/prepare_wedding_photos.py work/r14/src public/wed
Вход: pNN.jpg (номера ниже). Выход: wNN.jpg без EXIF.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

# Рамки размытия (доли кадра исходного фото)
BLUR = {
    6: ['0.6,0.2,1.0,0.52'],                      # помощница за спиной
    7: ['0.03,0.37,0.17,0.51'],                   # баллончики с лаком
    10: ['0.46,0.1,0.84,0.92'],                   # муж
    11: ['0.57,0.25,1.0,0.88'],                   # муж
    14: ['0,0.41,0.07,0.49'],                     # машина
    15: ['0.19,0.19,0.565,0.92'],                 # парень и девушка с телефоном
    16: ['0.19,0.3,0.495,0.97'],                  # муж и свидетельство о браке
    20: ['0.5,0.33,0.92,1.0', '0.02,0.3,0.24,0.7'],   # муж и ведущий
    21: ['0.0,0.05,0.27,0.52', '0.0,0.52,0.13,1.0', '0.29,0.26,0.45,0.48', '0.78,0.3,1.0,0.8'],  # гости
    23: ['0.465,0.33,0.61,0.9'],                  # муж
}
# Букет: чётким остаётся только букет и рука, остальное (гости) размыто
KEEP = {25: ['0.0,0.2,0.31,0.7', '0.18,0.5,0.8,0.87', '0.66,0.28,0.99,0.78', '0.24,0.2,0.82,0.31', '0.12,0.0,0.62,0.26']}
# Горизонтальные фото: левый край вертикального окна 9:16 (доля ширины)
CROP = {19: 0.33, 22: 0.415, 23: 0.25, 24: 0.31}


def mask(h, w, boxes, feather):
    m = np.zeros((h, w), np.float32)
    for b in boxes:
        x0, y0, x1, y1 = [float(v) for v in b.split(',')]
        m[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 1
    return cv2.GaussianBlur(m, (0, 0), feather)


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for p in sorted(src.glob('p*.jpg')):
        n = int(p.stem[1:])
        if n not in range(1, 26):
            continue
        a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
        h, w = a.shape[:2]
        k = max(h, w) / 1000
        if n in BLUR:
            m = mask(h, w, BLUR[n], 8 * k)[..., None]
            a = a * (1 - m) + cv2.GaussianBlur(a, (0, 0), 30 * k) * m
        if n in KEEP:
            m = mask(h, w, KEEP[n], 10 * k)[..., None]
            a = a * m + cv2.GaussianBlur(a, (0, 0), 18 * k) * (1 - m)
        if n in CROP:
            cw = int(h * 9 / 16)
            x0 = int(CROP[n] * w)
            a = a[:, x0:x0 + cw]
        Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(dst / f'w{n:02d}.jpg', quality=95)
        print(n, a.shape[1], 'x', a.shape[0])


if __name__ == '__main__':
    main()
