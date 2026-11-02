#!/usr/bin/env python3
"""Размытие фона за человеком в видео (кадр за кадром): прячет вывески, логотипы зала и чужих людей.

Модель u2net_human_seg.onnx (как в portrait_blur.py), маска сглаживается во времени, чтобы не мерцала.
Звук не переносится (в зале может играть чужая музыка).

Использование:
  python3 video_portrait_blur.py вход.mov выход.mp4 --ss 6.5 --t 1.3 [--fps 60] [--blur 9] [--dark 0.82]
Выход: 1080x1920, H.264, без звука и метаданных.
"""
import argparse
import subprocess
import time

import cv2
import numpy as np
import onnxruntime as ort

W, H = 1080, 1920


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--ss', type=float, default=0)
    ap.add_argument('--t', type=float, default=None)
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--blur', type=float, default=9)
    ap.add_argument('--dark', type=float, default=0.82)
    ap.add_argument('--vf', default='', help='доп. фильтр ffmpeg (цвет), применяется до маски')
    ap.add_argument('--model', default='/tmp/segdl/u2net_human_seg.onnx')
    ap.add_argument('--keep', default='', help='x0,y0,x1,y1 (доли кадра): рамка, где человек всегда чёткий')
    ap.add_argument('--zone', default='', help='x0,y0,x1,y1: размывать только внутри этой области (вывески)')
    ap.add_argument('--noseg', action='store_true', help='без нейросети: просто размыть область --zone')
    a = ap.parse_args()

    def box(spec, feather):
        m = np.zeros((H, W), np.float32)
        x0, y0, x1, y1 = [float(v) for v in spec.split(',')]
        m[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = 1
        return cv2.GaussianBlur(m, (0, 0), feather)

    keep = box(a.keep, 40) if a.keep else None
    zone = box(a.zone, 25) if a.zone else np.ones((H, W), np.float32)

    so = ort.SessionOptions()
    so.intra_op_num_threads = 4
    sess = ort.InferenceSession(a.model, so, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0].name

    vf = f'fps={a.fps},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}'
    if a.vf:
        vf += ',' + a.vf
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(a.ss)] + (['-t', str(a.t)] if a.t else []) + \
          ['-i', a.src, '-an', '-vf', vf, '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']
    rd = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    wr = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                           '-r', str(a.fps), '-i', '-', '-c:v', 'libx264', '-crf', '15', '-preset', 'medium',
                           '-pix_fmt', 'yuv420p', '-map_metadata', '-1', a.dst], stdin=subprocess.PIPE)
    mean = np.array([0.485, 0.456, 0.406], np.float32)
    std = np.array([0.229, 0.224, 0.225], np.float32)
    prev, n, t0 = None, 0, time.time()
    while True:
        buf = rd.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        if a.noseg:
            mk = (1 - zone)[..., None]
            f32 = fr.astype(np.float32)
            small = cv2.resize(f32, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
            bg = cv2.resize(cv2.GaussianBlur(small, (0, 0), a.blur / 4), (W, H), interpolation=cv2.INTER_LINEAR)
            wr.stdin.write(np.clip(f32 * mk + bg * (1 - mk), 0, 255).astype(np.uint8).tobytes())
            n += 1
            continue
        x = cv2.resize(fr, (320, 320), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
        x = ((x - mean) / std).transpose(2, 0, 1)[None]
        m = sess.run(None, {inp: x})[0][0, 0]
        m = (m - m.min()) / (m.max() - m.min() + 1e-8)
        binm = (m > 0.5).astype(np.uint8)
        k, lab, stats, _ = cv2.connectedComponentsWithStats(binm, 8)
        if k > 1:  # только самый крупный человек
            big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            m = m * cv2.dilate((lab == big).astype(np.uint8), np.ones((5, 5), np.uint8))
        prev = m if prev is None else 0.55 * m + 0.45 * prev  # сглаживание во времени
        mk = cv2.GaussianBlur(cv2.resize(prev, (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 4)
        mk = np.clip(mk * 1.15, 0, 1)
        if keep is not None:
            mk = np.maximum(mk, keep)
        mk = 1 - (1 - mk) * zone  # размываем только внутри зоны
        mk = mk[..., None]
        f32 = fr.astype(np.float32)
        small = cv2.resize(f32, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        bg = cv2.resize(cv2.GaussianBlur(small, (0, 0), a.blur / 4 * 1.0), (W, H), interpolation=cv2.INTER_LINEAR) * a.dark
        out = f32 * mk + bg * (1 - mk)
        wr.stdin.write(np.clip(out, 0, 255).astype(np.uint8).tobytes())
        n += 1
    wr.stdin.close()
    wr.wait()
    rd.wait()
    print(f'{a.dst}: {n} кадров, {time.time() - t0:.1f} с')


if __name__ == '__main__':
    main()
