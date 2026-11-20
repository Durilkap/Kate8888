#!/usr/bin/env python3
"""Рилс 39 (челлендж, день 4): «Меня сейчас возненавидят все мамы и подружки невест...», свадебное платье.

Голос: Катя записала видео с текстом 20.11 (work/r39/voice/take.mov, один чистый дубль), берём только звук:
от 0,85 до 41,6 с, паузы между фразами естественные (0,3-0,4 с), громкость -14 LUFS -> public/r39/voice.wav.
Кадры: видео видеографа (work/r39/wed/w3.mp4), селфи Кати у зеркала (work/r14/vid/v1.mov, v2.mov, её съёмка),
проход к церемонии и общий план (w1, w2, присланы 20.11): копии 1080x1920 30 к/с без звука в public/r39. Фото фотографа не берём
(нет его «да»). Исходники и копии в git не попадают. Использование (из папки video/): python3 tools/prepare_r39.py
"""
import subprocess

T0, T1 = 0.85, 41.6


def main():
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(T0), '-to', str(T1), '-i', 'work/r39/voice/take.mov', '-vn',
                    '-af', 'highpass=f=80,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:d=0.05,afade=t=out:st=%.2f:d=0.2' % (T1 - T0 - 0.2),
                    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', 'public/r39/voice.wav'], check=True)
    # 20.11 Катя прислала ещё видео (work/r39/wed): w1 проход к церемонии (41 с), w2 общий план (120 с, берём 52-62 с),
    # w3 то же видео видеографа в 1080x1920 (лучше v3)
    for src, dst, ss, to in [('work/r14/vid/v1.mov', 'v1', None, None), ('work/r14/vid/v2.mov', 'v2', None, None),
                             ('work/r39/wed/w1.mp4', 'w1', None, None), ('work/r39/wed/w2.mp4', 'w2', 52, 62),
                             ('work/r39/wed/w3.mp4', 'w3', None, None)]:
        cut = (['-ss', str(ss), '-to', str(to)] if ss is not None else [])
        subprocess.run(['ffmpeg', '-v', 'error', '-y'] + cut + ['-i', src, '-an',
                        '-vf', 'scale=1080:1920:flags=lanczos,fps=30,format=yuv420p',
                        '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-map_metadata', '-1',
                        f'public/r39/{dst}.mp4'], check=True)
    print('голос и 5 видео готовы')


if __name__ == '__main__':
    main()
