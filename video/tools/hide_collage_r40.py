#!/usr/bin/env python3
"""Рилс 40 (запасной инструмент, в финал не вошёл: Катя 21.11 «Мы не против, оставь как есть»): спрятать холст-коллаж с фото людей на стене за Катей (проверка 21.11), не трогая саму Катю.

По кадрам: ищем лицо (детектор YuNet в OpenCV, модель face_detection_yunet_2023mar.onnx, MIT; путь в YUNET), сглаживаем рамку, строим маску головы (эллипс с волосами и ободком).
Размываем только прямоугольник коллажа минус голова, края мягкие. Звук не меняется.
Читает и перезаписывает public/r40/talk.mp4. Использование (из video/): python3 tools/hide_collage_r40.py
"""
import os, subprocess
import cv2
import numpy as np

SRC = 'public/r40/talk.mp4'
TMP = 'public/r40/talk_hidden.mp4'
R = (585, 105, 890, 540)  # x0, y0, x1, y1 коллажа в кадре 1080x1920
YUNET = os.environ.get('YUNET', 'work/models/yunet.onnx')


def main():
    cap = cv2.VideoCapture(SRC)
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    det = cv2.FaceDetectorYN_create(YUNET, '', (w // 3, h // 3), 0.6, 0.3, 50)
    rect = np.zeros((h, w), np.float32)
    x0, y0, x1, y1 = R
    rect[y0:y1, x0:x1] = 1.0
    rect = cv2.GaussianBlur(rect, (0, 0), 14)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{w}x{h}', '-r', str(fps),
                            '-i', '-', '-i', SRC, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', '15', '-preset', 'medium',
                            '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-map_metadata', '-1', TMP], stdin=subprocess.PIPE)
    box = None
    n = found = 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        n += 1
        small = cv2.resize(fr, (w // 3, h // 3))
        _, faces = det.detect(small)
        if faces is not None and len(faces):
            fx, fy, fw, fh = max(faces, key=lambda b: b[2] * b[3])[:4]
            cur = np.array([fx, fy, fw, fh], np.float32) * 3
            box = cur if box is None else box * 0.6 + cur * 0.4
            found += 1
        out = fr
        if box is not None:
            fx, fy, fw, fh = box
            head = np.zeros((h, w), np.float32)
            cx, cy = int(fx + fw / 2), int(fy + fh * 0.35)
            cv2.ellipse(head, (cx, cy), (int(fw * 0.85), int(fh * 1.15)), 0, 0, 360, 1.0, -1)
            head = cv2.GaussianBlur(head, (0, 0), 10)
            m = np.clip(rect * (1 - head), 0, 1)[..., None]
        else:
            m = rect[..., None]
        blur = cv2.GaussianBlur(fr, (0, 0), 22)
        out = (fr * (1 - m) + blur * m).astype(np.uint8)
        enc.stdin.write(out.tobytes())
    enc.stdin.close()
    enc.wait()
    os.replace(TMP, SRC)
    print(n, 'кадров, лицо найдено в', found)


if __name__ == '__main__':
    main()
