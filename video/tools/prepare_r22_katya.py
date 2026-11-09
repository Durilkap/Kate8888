#!/usr/bin/env python3
"""Рилс 22 «Завидуют» на фото и видео Кати (09.11): вместо картинок из интернета.

Фото Кати (отпуск): прогулка в белом платье, балкон на закате, под сосной. Видео: качели на пляже (HDR HLG, 60 к/с),
переводится в SDR. Вывеска отеля над качелями в кадр не берётся (куски без неё). Звук не переносится.

Использование (из папки video/):
  python3 tools/prepare_r22_katya.py work/r22k/src public/r22k
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image

W, H, FPS = 1080, 1920, 30
TONEMAP = 'zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv'

# имя: (начало, конец, скорость)
CLIPS = {
    'face': (11.25, 12.80, 0.56),  # камера приближается к лицу Кати, улыбка (хук)
    'sea': (13.60, 15.55, 0.66),   # море без людей; после 15,6 камера поворачивает к качелям
    'swing': (8.00, 10.95, 1.0),   # качели, лёгкость; вывеска отеля вне кадра
}
# фото: центр кадра по x в долях ширины (вертикальная обрезка 9:16)
PHOTOS = {'photo_walk': 0.40, 'photo_balcony': 0.47, 'photo_tree': 0.52}


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for name, (a, b, speed) in CLIPS.items():
        vf = f'{TONEMAP},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}'
        if speed != 1.0:
            vf += f',setpts=PTS/{speed}'
        vf += f',fps={FPS},format=yuv420p'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a}', '-to', f'{b}', '-i', str(src / 'swing.mov'), '-an', '-vf', vf,
                        '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-color_primaries', 'bt709', '-color_trc', 'bt709',
                        '-colorspace', 'bt709', '-map_metadata', '-1', str(dst / f'{name}.mp4')], check=True)
        print(name)
    for name, cx in PHOTOS.items():
        im = Image.open(src / f'{name}.jpg').convert('RGB')  # без EXIF
        cw = round(im.height * 9 / 16)
        x0 = min(max(0, round(im.width * cx - cw / 2)), im.width - cw)
        im.crop((x0, 0, x0 + cw, im.height)).save(dst / f'{name}.jpg', quality=93)
        print(name, im.size, '->', (cw, im.height))


if __name__ == '__main__':
    main()
