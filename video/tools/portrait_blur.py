#!/usr/bin/env python3
"""Размытие фона за человеком на фото (как «портрет»): прячет логотипы зала, чужих людей и вещи в кадре.

Модель: u2net_human_seg.onnx (github.com/danielgatis/rembg, релиз v0.0.0), запуск через onnxruntime.
Оставляется только самый крупный человек в кадре, остальные (например, в зеркале) размываются вместе с фоном.

Использование:
  python3 portrait_blur.py вход.jpg выход.jpg [--model /tmp/segdl/u2net_human_seg.onnx] [--blur 28] [--dark 0.8]
Пишет ещё выход.mask.png (маска) для проверки. EXIF и геометка в выходной файл не попадают.
"""
import argparse

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps


def person_mask(img, model):
    sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
    x = np.asarray(img.convert('RGB').resize((320, 320), Image.LANCZOS)).astype(np.float32) / 255
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    out = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
    m = (out - out.min()) / (out.max() - out.min() + 1e-8)
    m = cv2.resize(m, img.size, interpolation=cv2.INTER_CUBIC)
    # только самый крупный связный кусок (сам человек), отражения и люди на фоне уходят в размытие
    binm = (m > 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(binm, 8)
    if n > 1:
        big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        keep = (lab == big).astype(np.uint8)
        keep = cv2.dilate(keep, np.ones((25, 25), np.uint8))
        m = m * keep
    return np.clip(cv2.GaussianBlur(m, (0, 0), 3), 0, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--model', default='/tmp/segdl/u2net_human_seg.onnx')
    ap.add_argument('--blur', type=float, default=28)
    ap.add_argument('--dark', type=float, default=0.8)
    a = ap.parse_args()
    img = ImageOps.exif_transpose(Image.open(a.src)).convert('RGB')
    m = person_mask(img, a.model)
    arr = np.asarray(img).astype(np.float32)
    bg = cv2.GaussianBlur(arr, (0, 0), a.blur) * a.dark
    out = arr * m[..., None] + bg * (1 - m[..., None])
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(a.dst, quality=95)
    Image.fromarray((m * 255).astype(np.uint8)).save(a.dst.rsplit('.', 1)[0] + '.mask.png')


if __name__ == '__main__':
    main()
