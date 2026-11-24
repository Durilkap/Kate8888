#!/usr/bin/env python3
"""Сетка лиц по кадрам (детектор YuNet, work/models/yunet.onnx): проверить, что в ролике нет открытого рта и гримас.
Использование: python3 tools/faceaudit.py видео выход.jpg шаг_в_секундах"""
import sys, cv2, numpy as np
src, out, step = sys.argv[1], sys.argv[2], float(sys.argv[3])
det = None
cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
tiles = []; f = 0
while f < n:
    cap.set(cv2.CAP_PROP_POS_FRAMES, f); ok, fr = cap.read()
    if not ok: break
    h, w = fr.shape[:2]
    small = cv2.resize(fr, (w // 3, h // 3))
    if det is None: det = cv2.FaceDetectorYN_create('work/models/yunet.onnx', '', (w // 3, h // 3), 0.5, 0.3, 50)
    _, faces = det.detect(small)
    if faces is not None and len(faces):
        x, y, fw, fh = [int(v * 3) for v in max(faces, key=lambda b: b[2] * b[3])[:4]]
        c = max(fw, fh) * 1.6; cx, cy = x + fw / 2, y + fh / 2
        x0, y0 = int(max(0, cx - c / 2)), int(max(0, cy - c / 2)); x1, y1 = int(min(w, cx + c / 2)), int(min(h, cy + c / 2))
        crop = cv2.resize(fr[y0:y1, x0:x1], (150, 150))
    else:
        crop = np.zeros((150, 150, 3), np.uint8)
    cv2.putText(crop, f'{f / fps:.1f}', (3, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
    tiles.append(crop); f += int(round(step * fps))
cols = 12
while len(tiles) % cols: tiles.append(np.zeros((150, 150, 3), np.uint8))
cv2.imwrite(out, np.vstack([np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]))
print(len(tiles))
