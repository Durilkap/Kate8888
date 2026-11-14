#!/usr/bin/env python3
"""Рилс 31 «Зашла просто посмотреть» (14.11): ТЦ и примерочная.

Клипы с плавной сменой скорости (как в рилсе 26): ускорение с размытием движения (усреднение соседних кадров),
замедление. Вывески и названия магазинов в проходе ТЦ размываются: рамки заданы на опорных кадрах (координаты
в кадре 720x1280), между ними рамка ведётся по картинке (поиск шаблона) и сглаживается. Неподвижные места (таблички с QR-кодом, лица посторонних в отражениях, ярлык) размываются по рамкам STATIC.
Звук и метаданные не переносятся.

Использование (из папки video/):
  python3 tools/prepare_r31.py work/r31/src public/r31 [имя ...]
  python3 tools/prepare_r31.py work/r31/src public/r31 --check walk   (кадры с рамками для проверки)
"""
import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

W, H, FPS = 1080, 1920, 30
FRAME = W * H * 3
SHUTTER = 0.8

# имя: (файл, к/с исходника, начало, длительность результата, точки скорости [(время результата, скорость)])
CLIPS = {
    'hook': ('u_IMG_3509.mov', 30, 26.55, 1.0, [(0.0, 0.85)]),  # с разворота: лицо с первых кадров
    'walk': ('u_IMG_3510.mov', 30, 20.0, 2.5, [(0.0, 1.6), (0.7, 1.6), (1.2, 0.9), (2.3, 0.9)]),
    'o1': ('d03.mov', 60, 1.20, 3.1, [(0.0, 2.2), (0.9, 2.2), (1.3, 0.7), (2.3, 0.7), (2.6, 1.6), (3.1, 1.6)]),
    'o1x': ('d04.mov', 60, 19.70, 0.85, [(0.0, 2.0)]),
    'o2': ('d05.mov', 60, 1.00, 3.1, [(0.0, 2.2), (0.6, 2.2), (0.9, 4.0), (1.4, 4.0), (1.8, 0.8), (3.1, 0.8)]),
    'o2x': ('d05.mov', 60, 20.60, 0.9, [(0.0, 2.2)]),
    'o3': ('d06.mov', 120, 0.60, 4.6, [(0.0, 2.2), (0.6, 2.2), (0.9, 4.0), (1.6, 4.0), (1.9, 1.0), (2.3, 1.0), (2.6, 0.45), (4.6, 0.45)]),
    # ещё образы для вспышек (селфи в зеркале)
    'f1': ('d13.mov', 60, 10.45, 0.4, [(0.0, 1.0)]),
    'f2': ('d14.mov', 60, 14.05, 0.4, [(0.0, 1.0)]),
    'f3': ('u_IMG_3512.mov', 30, 1.55, 0.4, [(0.0, 1.0)]),
    # финал: три образа рядом, замедленно
    'h1': ('d03.mov', 60, 3.20, 3.6, [(0.0, 0.3)]),
    'h2': ('d05.mov', 60, 5.60, 3.6, [(0.0, 0.3)]),
    'h3': ('d06.mov', 120, 4.40, 3.6, [(0.0, 0.3)]),
}

# вывески: имя клипа -> список вывесок; вывеска = [(время исходника, (x0, y0, x1, y1))] в кадре 720x1280
SIGNS = {
    'hook': [
        [(26.30, (395, 100, 465, 140)), (27.45, (490, 90, 570, 135))],  # название магазина над входом
    ],
    'o3': [
        [(6.95, (222, 526, 262, 556)), (7.03, (231, 528, 270, 558)), (7.27, (290, 537, 335, 571)), (7.51, (339, 541, 383, 576)), (7.72, (357, 510, 401, 544)), (7.825, (362, 501, 405, 531))],  # ярлык сзади на брюках
    ],
    'walk': [
        [(20.0, (45, 700, 140, 785)), (21.0, (70, 710, 155, 785)), (22.0, (60, 695, 130, 785)), (22.9, (65, 610, 145, 715))],  # надпись на витрине-острове
        [(20.0, (52, 420, 78, 445)), (21.0, (45, 420, 70, 445)), (22.0, (35, 415, 60, 440)), (22.9, (35, 340, 60, 365))],  # вывески магазинов
        [(20.0, (215, 455, 245, 470)), (21.0, (205, 452, 235, 470)), (22.0, (198, 450, 230, 468)), (22.9, (198, 375, 232, 395))],
        [(20.0, (412, 452, 445, 470)), (21.0, (405, 450, 440, 468)), (22.0, (400, 447, 430, 465)), (22.9, (400, 372, 435, 392))],
        [(20.0, (530, 350, 560, 395)), (21.0, (515, 335, 545, 385)), (22.0, (508, 340, 535, 395)), (22.9, (512, 255, 540, 305))],
        [(20.0, (595, 380, 630, 420)), (21.0, (575, 375, 615, 420)), (22.0, (578, 375, 615, 420)), (22.9, (595, 300, 635, 340))],
        [(20.0, (365, 335, 390, 375)), (21.0, (355, 325, 380, 375)), (22.0, (350, 325, 372, 375)), (22.9, (352, 245, 378, 295))],
        [(20.0, (90, 470, 122, 528)), (21.0, (85, 475, 118, 530)), (22.0, (75, 485, 105, 530)), (22.9, (75, 415, 108, 455))],  # плакат «акция»
        [(20.0, (475, 465, 492, 485)), (22.9, (470, 395, 490, 415))],
        [(22.0, (595, 510, 625, 535)), (22.9, (600, 420, 625, 450))],
        [(22.0, (650, 670, 718, 708)), (22.9, (655, 670, 718, 708))],  # надпись на витрине справа
    ],
}


# неподвижные места (камера на полу или в руке без сдвига), в кадре 1080x1920: таблички с QR-кодом в зеркале
# примерочной, лица посторонних в отражениях, ярлык и плечики, табличка на стене (проверка 14.11)
QR_D03 = [(150, 715, 240, 830), (330, 715, 410, 830)]
QR_D05 = [(150, 912, 240, 1022), (330, 912, 400, 1022)]
QR_D06 = [(150, 905, 240, 1020), (320, 905, 392, 1012)]
STATIC = {
    'hook': [(950, 430, 1080, 600)],  # мужчина в отражении витрины справа
    'o1': QR_D03 + [(100, 1110, 200, 1220)],
    'h1': QR_D03 + [(100, 1110, 200, 1220)],
    'o1x': [(160, 898, 248, 1016)],
    'o2': QR_D05,
    'h2': QR_D05,
    'o2x': QR_D05 + [(66, 1318, 162, 1412)],
    'o3': QR_D06 + [(56, 1345, 134, 1452)],
    'h3': QR_D06 + [(56, 1345, 134, 1452)],
    'f2': [(96, 996, 178, 1104), (0, 478, 212, 622)],
    'f3': [(896, 126, 1024, 214)],
}


def speed_at(t, pts):
    if t <= pts[0][0]:
        return pts[0][1]
    for (t0, s0), (t1, s1) in zip(pts, pts[1:]):
        if t0 <= t <= t1:
            if t1 == t0:
                return s1
            u = (t - t0) / (t1 - t0)
            u = u * u * (3 - 2 * u)
            return math.exp(math.log(s0) + (math.log(s1) - math.log(s0)) * u)
    return pts[-1][1]


def decode(path, start, secs, w, h, gray=False):
    fmt, ch = ('gray', 1) if gray else ('rgb24', 3)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f'{start}', '-i', str(path), '-t', f'{secs:.3f}', '-an',
                          '-vf', f'scale={w}:{h}:flags=lanczos,format={fmt}', '-fps_mode', 'passthrough',
                          '-f', 'rawvideo', '-pix_fmt', fmt, '-'], stdout=subprocess.PIPE)
    return p, w * h * ch


def track_signs(path, src_fps, start, n, signs):
    """Рамки вывесок для кадров 0..n-1 (в координатах 720x1280)."""
    p, fs = decode(path, start, n / src_fps + 0.1, 720, 1280, gray=True)
    G = []
    while len(G) < n:
        raw = p.stdout.read(fs)
        if len(raw) < fs:
            break
        G.append(np.frombuffer(raw, np.uint8).reshape(1280, 720))
    p.kill()
    n = len(G)
    out = [[] for _ in range(n)]
    for sign in signs:
        keys = sorted((max(0, min(n - 1, round((t - start) * src_fps))), np.array(b, float)) for t, b in sign)

        def size_at(i):
            if i <= keys[0][0]:
                return keys[0][1][2:] - keys[0][1][:2]
            for (i0, b0), (i1, b1) in zip(keys, keys[1:]):
                if i0 <= i <= i1:
                    u = (i - i0) / max(1, i1 - i0)
                    return (b0[2:] - b0[:2]) * (1 - u) + (b1[2:] - b1[:2]) * u
            return keys[-1][1][2:] - keys[-1][1][:2]

        def track(i_from, c_from, step, count):
            """центры рамки, начиная с кадра i_from, по шаблону с запасом вокруг вывески."""
            cs = {i_from: c_from}
            c = c_from.copy()
            i = i_from
            for _ in range(count):
                j = i + step
                if j < 0 or j >= n:
                    break
                sz = size_at(i) + 30
                x0, y0 = (c - sz / 2).astype(int)
                x1, y1 = (c + sz / 2).astype(int)
                x0, y0 = max(0, x0), max(0, y0)
                x1, y1 = min(719, x1), min(1279, y1)
                tpl = G[i][y0:y1, x0:x1]
                R = 36
                sx0, sy0 = max(0, x0 - R), max(0, y0 - R)
                sx1, sy1 = min(720, x1 + R), min(1280, y1 + R)
                win = G[j][sy0:sy1, sx0:sx1]
                if tpl.shape[0] < 8 or tpl.shape[1] < 8 or win.shape[0] <= tpl.shape[0] or win.shape[1] <= tpl.shape[1]:
                    cs[j] = c.copy()
                else:
                    r = cv2.matchTemplate(win, tpl, cv2.TM_CCOEFF_NORMED)
                    _, mv, _, ml = cv2.minMaxLoc(r)
                    if mv > 0.4:
                        c = c + np.array([sx0 + ml[0] - x0, sy0 + ml[1] - y0], float)
                    cs[j] = c.copy()
                i = j
            return cs

        centers = {}
        for (i0, b0), (i1, b1) in zip(keys, keys[1:]):
            c0, c1 = (b0[:2] + b0[2:]) / 2, (b1[:2] + b1[2:]) / 2
            fw = track(i0, c0, 1, i1 - i0)
            bw = track(i1, c1, -1, i1 - i0)
            for i in range(i0, i1 + 1):
                u = (i - i0) / max(1, i1 - i0)
                lin = c0 * (1 - u) + c1 * u
                a = fw.get(i, lin)
                b = bw.get(i, lin)
                tr = a * (1 - u) + b * u
                # если поиск ушёл далеко от прямой между опорными кадрами, ближе к прямой
                d = np.linalg.norm(tr - lin)
                centers[i] = tr if d < 40 else lin
        i0, b0 = keys[0]
        for i, c in track(i0, (b0[:2] + b0[2:]) / 2, -1, i0).items():
            centers.setdefault(i, c)
        i1, b1 = keys[-1]
        if len(keys) > 1 or True:
            for i, c in track(i1, (b1[:2] + b1[2:]) / 2, 1, n - 1 - i1).items():
                centers.setdefault(i, c)
        # сглаживание
        idx = sorted(centers)
        arr = np.array([centers[i] for i in idx])
        k = 5
        sm = np.array([arr[max(0, j - k):j + k + 1].mean(axis=0) for j in range(len(arr))])
        for j, i in enumerate(idx):
            sz = size_at(i)
            out[i].append(np.concatenate([sm[j] - sz / 2, sm[j] + sz / 2]))
    return out


def blur_boxes(img, boxes, scale, tight=False):
    if not boxes:
        return img
    img = img.copy()
    for b in boxes:
        x0, y0, x1, y1 = np.asarray(b, float) * scale
        m = 4 if tight else 14 * scale + 0.25 * (x1 - x0)
        my = 4 if tight else 14 * scale + 0.25 * (y1 - y0)
        X0, Y0 = int(max(0, x0 - m - 20)), int(max(0, y0 - my - 20))
        X1, Y1 = int(min(W, x1 + m + 20)), int(min(H, y1 + my + 20))
        if X1 <= X0 or Y1 <= Y0:
            continue
        roi = img[Y0:Y1, X0:X1].astype(np.float32)
        bl = cv2.GaussianBlur(roi, (0, 0), 9 * scale)
        mask = np.zeros(roi.shape[:2], np.float32)
        cv2.rectangle(mask, (int(x0 - m - X0), int(y0 - my - Y0)), (int(x1 + m - X0), int(y1 + my - Y0)), 1.0, -1)
        mask = cv2.GaussianBlur(mask, (0, 0), 6 * scale)[..., None]
        img[Y0:Y1, X0:X1] = (roi * (1 - mask) + bl * mask).astype(np.uint8)
    return img


def render(src, dst, name, check=False):
    f, sfps, start, dur, pts = CLIPS[name]
    n_out = round(dur * FPS)
    total = sum(speed_at(i / FPS, pts) * sfps / FPS for i in range(n_out)) + 4
    real = total / sfps + 0.2
    boxes = track_signs(src / f, sfps, start, int(total) + 2, SIGNS[name]) if name in SIGNS else None
    dec, fs = decode(src / f, start, real, W, H)
    if check:
        outp = dst / f'{name}_check'
        outp.mkdir(parents=True, exist_ok=True)
    else:
        enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                                '-i', '-', '-vf', 'unsharp=5:5:0.45' if sfps == 30 else 'null', '-c:v', 'libx264', '-crf', '15',
                                '-preset', 'medium', '-pix_fmt', 'yuv420p', '-map_metadata', '-1', str(dst / f'{name}.mp4')],
                               stdin=subprocess.PIPE)
    buf, last, read_idx = {}, None, 0

    def get(i):
        nonlocal read_idx, last
        while read_idx <= i:
            raw = dec.stdout.read(fs)
            if len(raw) < fs:
                return last
            fr = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
            if boxes is not None and read_idx < len(boxes):
                fr = blur_boxes(fr, boxes[read_idx], W / 720)
            if name in STATIC:
                fr = blur_boxes(fr, STATIC[name], 1.0, tight=True)
            last = fr
            buf[read_idx] = last
            read_idx += 1
        return buf.get(i, last)

    p = 0.0
    for k in range(n_out):
        adv = speed_at(k / FPS, pts) * sfps / FPS
        if adv > 1.5:
            k0, k1 = int(p), max(int(p) + 1, int(p + adv * SHUTTER))
            acc = np.zeros((H, W, 3), np.float32)
            for j in range(k0, k1):
                acc += get(j)
            img = (acc / (k1 - k0)).astype(np.uint8)
        else:
            img = get(int(round(p)))
        if check:
            if k % 3 == 0:
                cv2.imwrite(str(outp / f'{k:03d}.jpg'), cv2.cvtColor(cv2.resize(img, (270, 480)), cv2.COLOR_RGB2BGR))
        else:
            enc.stdin.write(np.ascontiguousarray(img).tobytes())
        p += adv
        for j in [j for j in buf if j < int(p) - 1]:
            del buf[j]
    if not check:
        enc.stdin.close()
        enc.wait()
    dec.stdout.close()
    dec.kill()
    print(name, n_out, 'кадров, исходник', start, '->', round(start + p / sfps, 2), 'с')


def main():
    args = sys.argv[1:]
    check = '--check' in args
    args = [a for a in args if a != '--check']
    src, dst = Path(args[0]), Path(args[1])
    dst.mkdir(parents=True, exist_ok=True)
    for name in args[2:] or list(CLIPS):
        render(src, dst, name, check)


if __name__ == '__main__':
    main()
