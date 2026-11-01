#!/usr/bin/env python3
"""Распознавание русской речи из видео или аудио: текст и время каждого слова.

Модель: GigaAM v2 (transducer) в формате sherpa-onnx, VAD: silero.
Модели не в репозитории (большие): скачать из релизов github.com/k2-fsa/sherpa-onnx (asr-models)
  sherpa-onnx-nemo-transducer-giga-am-v2-russian-2025-04-19.tar.bz2 и silero_vad.onnx
и положить в папку, переданную через --models (по умолчанию /tmp/asrmodel).

Использование:
  python3 transcribe.py видео.mp4 out.json
Результат: список фраз {start, end, text, words: [{w, start, end}]}, время в секундах от начала файла.
Распознавание автоматическое, с ошибками: текст для субтитров подтверждает Катя.
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
import sherpa_onnx

SR = 16000


def load_audio(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768


def words_from_tokens(tokens, stamps, offset, seg_end):
    """Токены BPE (▁ = начало слова) -> слова со временем начала и конца."""
    words = []
    for tok, t in zip(tokens, stamps):
        t = offset + t
        if tok.startswith('▁') or tok.startswith(' ') or not words:
            words.append({'w': tok.lstrip('▁ '), 'start': t, 'end': t})
        else:
            words[-1]['w'] += tok
        words[-1]['end'] = t
    for i, w in enumerate(words):  # конец слова: начало следующего или конец фразы, но не дольше 0,6 с после последнего токена
        nxt = words[i + 1]['start'] if i + 1 < len(words) else seg_end
        w['end'] = round(min(nxt, w['end'] + 0.6), 3)
        w['start'] = round(w['start'], 3)
    return [w for w in words if w['w']]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('media')
    ap.add_argument('out')
    ap.add_argument('--models', default='/tmp/asrmodel')
    args = ap.parse_args()
    m = Path(args.models)
    md = next(m.glob('sherpa-onnx-nemo-transducer-giga-am-v2-russian-*'))

    rec = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=str(md / 'encoder.int8.onnx'), decoder=str(md / 'decoder.onnx'), joiner=str(md / 'joiner.onnx'),
        tokens=str(md / 'tokens.txt'), num_threads=4, model_type='nemo_transducer', decoding_method='greedy_search')

    vcfg = sherpa_onnx.VadModelConfig()
    vcfg.silero_vad.model = str(m / 'silero_vad.onnx')
    vcfg.silero_vad.min_silence_duration = 0.25
    vcfg.silero_vad.min_speech_duration = 0.2
    vcfg.silero_vad.max_speech_duration = 20
    vcfg.sample_rate = SR
    vad = sherpa_onnx.VoiceActivityDetector(vcfg, buffer_size_in_seconds=120)

    x = load_audio(args.media)
    win = vcfg.silero_vad.window_size
    segs = []
    for i in range(0, len(x), win):
        vad.accept_waveform(x[i:i + win])
        while not vad.empty():
            segs.append((vad.front.start, np.array(vad.front.samples)))
            vad.pop()
    vad.flush()
    while not vad.empty():
        segs.append((vad.front.start, np.array(vad.front.samples)))
        vad.pop()

    out = []
    for start, samples in segs:
        s = rec.create_stream()
        s.accept_waveform(SR, samples)
        rec.decode_stream(s)
        r = s.result
        off, end = start / SR, (start + len(samples)) / SR
        words = words_from_tokens(list(r.tokens), list(r.timestamps), off, end)
        out.append({'start': round(off, 3), 'end': round(end, 3), 'text': r.text.strip(), 'words': words})
        print(f'{off:6.2f}-{end:6.2f}  {r.text.strip()}')
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
