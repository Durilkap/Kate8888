#!/usr/bin/env python3
"""Рилс 39 (челлендж, день 4): «Меня сейчас возненавидят все мамы и подружки невест...», свадебное платье.

Голос: Катя записала видео с текстом 20.11 (work/r39/voice/take.mov, один чистый дубль), берём только звук:
от 0,85 до 41,6 с, паузы между фразами естественные (0,3-0,4 с), громкость -14 LUFS -> public/r39/voice.wav.
Кадры: видео видеографа (work/r14/vid/v3.mp4, 720x1280) и селфи Кати в платье у зеркала (v1.mov, v2.mov, её съёмка):
копии 1080x1920 30 к/с без звука -> public/r39/v1.mp4, v2.mov -> v2.mp4, v3.mp4. Фото фотографа не берём
(нет его «да»). Исходники и копии в git не попадают. Использование (из папки video/): python3 tools/prepare_r39.py
"""
import subprocess

T0, T1 = 0.85, 41.6


def main():
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(T0), '-to', str(T1), '-i', 'work/r39/voice/take.mov', '-vn',
                    '-af', 'highpass=f=80,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:d=0.05,afade=t=out:st=%.2f:d=0.2' % (T1 - T0 - 0.2),
                    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', 'public/r39/voice.wav'], check=True)
    for src, dst in [('work/r14/vid/v1.mov', 'v1'), ('work/r14/vid/v2.mov', 'v2'), ('work/r14/vid/v3.mp4', 'v3')]:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-an',
                        '-vf', 'scale=1080:1920:flags=lanczos,fps=30,format=yuv420p',
                        '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-map_metadata', '-1',
                        f'public/r39/{dst}.mp4'], check=True)
    print('голос и 3 видео готовы')


if __name__ == '__main__':
    main()
