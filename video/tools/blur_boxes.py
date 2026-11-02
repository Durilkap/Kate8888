#!/usr/bin/env python3
"""Точечное размытие прямоугольников на фото (вывески, логотипы, надписи на ковриках, чужие лица).

Использование:
  python3 blur_boxes.py вход.jpg выход.jpg "x0,y0,x1,y1;x0,y0,x1,y1" [--blur 18]
Координаты в долях кадра (0..1). Края размытия мягкие. EXIF и геометка в выход не попадают.
"""
import argparse

import cv2
import numpy as np
from PIL import Image, ImageOps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('boxes')
    ap.add_argument('--blur', type=float, default=18)
    a = ap.parse_args()
    img = np.asarray(ImageOps.exif_transpose(Image.open(a.src)).convert('RGB')).astype(np.float32)
    h, w = img.shape[:2]
    k = max(w, h) / 1000
    m = np.zeros((h, w), np.float32)
    for b in a.boxes.split(';'):
        x0, y0, x1, y1 = [float(v) for v in b.split(',')]
        m[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 1
    m = cv2.GaussianBlur(m, (0, 0), 6 * k)[..., None]
    bl = cv2.GaussianBlur(img, (0, 0), a.blur * k)
    out = img * (1 - m) + bl * m
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(a.dst, quality=95)


if __name__ == '__main__':
    main()
