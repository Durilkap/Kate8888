#!/usr/bin/env python3
"""Рилс 18 «Видишь всё, что есть в холодильнике?»: подготовка кадров Кати (цех, рулоны, экран, холодильник).

Что прячется:
  этикетки клиентов на рулонах и на печатной машине (размытие всего цветного: рисунки, марки, штрихкоды);
  названия продуктов в холодильнике (фон за Катей размыт, Катя чёткая, модель u2net_human_seg);
  логотип GEW на машине (кадр обрезан сверху), PHILIPS на мониторе, марка клавиатуры, образцы на столе (рамки);
  на фото цеха: листы с маркой клиента под рулонами и наклейки на тележке.
Звук не переносится (Катя добавит музыку).

Использование (из папки video/):
  python3 tools/prepare_etiketki.py work/r18/src public/r18
Пишет public/r18/*.mp4 (1080x1920, 30 к/с, без звука и метаданных) и p1.jpg.
"""
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

W, H, FPS = 1080, 1920, 30
MODEL = '/tmp/segdl/u2net_human_seg.onnx'

# Решение Кати 05.11: «Не размывай». Эффекты размытия выключены (NO_BLUR), обрезки оставлены для кадра.
NO_BLUR = True
# имя: (исходник, начало, конец (с), скорость, эффект, обрезка)
CLIPS = {
    'hook': ('g6', 4.40, 7.40, 1.0, 'fridge', None),     # холодильник открыт
    'final': ('g6', 7.95, 10.05, 0.6, None, None),       # подмигивание (около 8,4 с), замедлено
    'machine': ('g3', 0.30, 6.60, 1.0, 'sat', None),     # печатная машина, лента с этикетками клиента
    'line': ('g2', 0.00, 10.70, 1.0, None, 'bottom'),    # линия флексопечати; сверху срезан логотип GEW
    'rolls': ('u1', 0.00, 2.95, 1.0, 'sat_text', None),  # рулоны с этикетками клиента (цвет, текст, штрихкоды)
    'type1': ('g4', 1.00, 4.20, 2.0, 'boxes', None),     # Катя печатает «3. МАТЕРИАЛ», ускорено
    'type2': ('g4', 7.40, 8.60, 2.0, 'boxes', None),     # «4. ТИРАЖ», ускорено
    'screen': ('g5', 0.20, 1.60, 1.0, 'boxes', 'top'),   # экран со списком крупно; снизу размыты PHILIPS и панель задач
}
# рамки (доли кадра 1080x1920) для эффекта boxes
BOXES = {
    'g4': [(0.0, 0.42, 0.34, 0.61), (0.30, 0.41, 0.70, 0.50), (0.78, 0.54, 1.0, 0.64)],  # образцы на столе, PHILIPS, клавиатура
    'g5': [(0.0, 0.85, 1.0, 1.0)],  # PHILIPS и панель задач внизу
}
# фото цеха: листы с маркой клиента под рулонами, наклейки на тележке
PHOTO_BOXES = [(0.28, 0.655, 0.98, 0.80), (0.60, 0.78, 1.0, 1.0), (0.85, 0.49, 0.96, 0.58)]


def soft_blur(f32, sigma):
    small = cv2.resize(f32, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    return cv2.resize(cv2.GaussianBlur(small, (0, 0), sigma / 4), (W, H), interpolation=cv2.INTER_LINEAR)


def box_mask(boxes, feather=14):
    m = np.zeros((H, W), np.float32)
    for x0, y0, x1, y1 in boxes:
        m[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = 1
    return cv2.GaussianBlur(m, (0, 0), feather)


def sat_mask(fr):
    hsv = cv2.cvtColor(fr, cv2.COLOR_RGB2HSV)
    m = ((hsv[..., 1] > 60) & (hsv[..., 2] > 40)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    m = cv2.dilate(m, np.ones((41, 41), np.uint8))
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), 12)


def text_mask(fr):
    """Мелкий текст и штрихкоды: много резких границ на небольшом участке."""
    g = cv2.cvtColor(fr, cv2.COLOR_RGB2GRAY)
    e = cv2.Canny(g, 60, 160).astype(np.float32) / 255
    d = cv2.boxFilter(e, -1, (41, 41))
    m = (d > 0.06).astype(np.uint8)
    m = cv2.dilate(m, np.ones((31, 31), np.uint8))
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), 12)


class Person:
    def __init__(self):
        so = ort.SessionOptions()
        so.intra_op_num_threads = 4
        self.sess = ort.InferenceSession(MODEL, so, providers=['CPUExecutionProvider'])
        self.inp = self.sess.get_inputs()[0].name
        self.prev = None
        self.mean = np.array([0.485, 0.456, 0.406], np.float32)
        self.std = np.array([0.229, 0.224, 0.225], np.float32)

    def mask(self, fr):
        x = cv2.resize(fr, (320, 320), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
        x = ((x - self.mean) / self.std).transpose(2, 0, 1)[None]
        m = self.sess.run(None, {self.inp: x})[0][0, 0]
        m = (m - m.min()) / (m.max() - m.min() + 1e-8)
        binm = (m > 0.5).astype(np.uint8)
        k, lab, stats, _ = cv2.connectedComponentsWithStats(binm, 8)
        if k > 1:
            big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            m = m * cv2.dilate((lab == big).astype(np.uint8), np.ones((5, 5), np.uint8))
        self.prev = m if self.prev is None else 0.55 * m + 0.45 * self.prev
        mk = cv2.GaussianBlur(cv2.resize(self.prev, (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 4)
        return np.clip(mk * 1.15, 0, 1)


def build(name, spec, src_dir, out_dir):
    src, a, b, speed, effect, crop = spec
    if NO_BLUR:
        effect = None
    vf = []
    if crop == 'bottom':  # приблизить на 1,18 от нижнего края
        vf.append('crop=iw/1.18:ih/1.18:(iw-ow)/2:ih-oh')
    elif crop == 'top':  # приблизить на 1,25 от верхнего края
        vf.append('crop=iw/1.25:ih/1.25:(iw-ow)/2:0')
    vf.append(f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}')
    if speed != 1.0:
        vf.append(f'setpts=PTS/{speed}')
    if speed < 1.0:  # плавное замедление: кадры смешиваются
        vf.append(f'framerate=fps={FPS}:interp_start=0:interp_end=255:scene=100')
    else:
        vf.append(f'fps={FPS}')
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{a}', '-to', f'{b}', '-i', str(src_dir / f'{src}.mov'), '-an',
           '-vf', ','.join(vf), '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']
    rd = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    dst = out_dir / f'{name}.mp4'
    wr = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                           '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '15', '-preset', 'medium',
                           '-pix_fmt', 'yuv420p', '-map_metadata', '-1', str(dst)], stdin=subprocess.PIPE)
    person = Person() if effect == 'fridge' else None
    bm = box_mask(BOXES[src])[..., None] if effect == 'boxes' else None
    n = 0
    while True:
        buf = rd.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        f32 = fr.astype(np.float32)
        if effect == 'fridge':
            mk = person.mask(fr)[..., None]
            f32 = f32 * mk + soft_blur(f32, 18) * (1 - mk)
        elif effect in ('sat', 'sat_text'):
            m = sat_mask(fr)
            if effect == 'sat_text':
                m = np.maximum(m, text_mask(fr))
            m = m[..., None]
            f32 = f32 * (1 - m) + soft_blur(f32, 28) * m
        elif effect == 'boxes':
            f32 = f32 * (1 - bm) + soft_blur(f32, 30) * bm
        wr.stdin.write(np.clip(f32, 0, 255).astype(np.uint8).tobytes())
        n += 1
    wr.stdin.close()
    wr.wait()
    rd.wait()
    print(name, n, 'кадров')


def photo(src_dir, out_dir):
    if NO_BLUR:  # без размытия, только без EXIF
        Image.open(src_dir / 'p1.jpg').convert('RGB').save(out_dir / 'p1.jpg', quality=95)
        print('p1 без размытия')
        return
    im = np.asarray(Image.open(src_dir / 'p1.jpg').convert('RGB')).astype(np.float32)
    h, w = im.shape[:2]
    m = np.zeros((h, w), np.float32)
    for x0, y0, x1, y1 in PHOTO_BOXES:
        m[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 1
    m = cv2.GaussianBlur(m, (0, 0), 10)[..., None]
    out = im * (1 - m) + cv2.GaussianBlur(im, (0, 0), 22) * m
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(out_dir / 'p1.jpg', quality=95)
    print('p1', w, 'x', h)


def main():
    src_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    only = sys.argv[3:] or list(CLIPS) + ['p1']
    out_dir.mkdir(parents=True, exist_ok=True)
    for name in only:
        if name == 'p1':
            photo(src_dir, out_dir)
        else:
            build(name, CLIPS[name], src_dir, out_dir)


if __name__ == '__main__':
    main()
