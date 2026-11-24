#!/usr/bin/env python3
"""Локальное распознавание русской речи по фразам: паузы по silencedetect, слова со временем (GigaAM v3 CTC, sherpa-onnx).

Модель: work/models/giga3 (model.int8.onnx, tokens.txt; Hugging Face csukuangfj/sherpa-onnx-nemo-ctc-giga-am-v3-russian-2025-12-16).
Использование: python3 tools/asr_units.py запись.wav выход.json [модель]
"""
import sys, wave, json, re, subprocess
import numpy as np
import sherpa_onnx

wav, out = sys.argv[1], sys.argv[2]
M = sys.argv[3] if len(sys.argv) > 3 else 'work/models/giga3'
log = subprocess.run(['ffmpeg', '-hide_banner', '-i', wav, '-af', 'silencedetect=noise=-35dB:d=0.3', '-f', 'null', '-'], capture_output=True, text=True).stderr
w = wave.open(wav); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
dur = len(x) / sr
ss = [float(v) for v in re.findall(r'silence_start: ([\d.]+)', log)]
se = [float(v) for v in re.findall(r'silence_end: ([\d.]+)', log)]
units = []; t = 0.0
for a, b in zip(ss, se + [dur] * (len(ss) - len(se))):
    if a - t > 0.15: units.append([t, a])
    t = b
if dur - t > 0.15: units.append([t, dur])
rec = sherpa_onnx.OfflineRecognizer.from_nemo_ctc(model=f'{M}/model.int8.onnx', tokens=f'{M}/tokens.txt', num_threads=4)
res = []
for k, (a, b) in enumerate(units):
    a0 = max(0, a - 0.05); b0 = min(dur, b + 0.05)
    s = rec.create_stream(); s.accept_waveform(sr, x[int(a0 * sr):int(b0 * sr)]); rec.decode_stream(s); r = s.result
    words = []; cur = None
    for tok, tt in zip(r.tokens, r.timestamps):
        tt = tt + a0
        if tok.strip() == '' or tok == '▁':
            if cur: words.append(cur); cur = None
            continue
        if tok.startswith('▁') and cur: words.append(cur); cur = None
        tok2 = tok.replace('▁', '')
        if cur is None: cur = {'w': tok2, 's': round(tt, 2), 'e': round(tt + 0.1, 2)}
        else: cur['w'] += tok2; cur['e'] = round(tt + 0.1, 2)
    if cur: words.append(cur)
    res.append({'k': k, 'a': round(a, 2), 'b': round(b, 2), 'text': r.text, 'words': words})
    print(f'{k:2d} [{a:6.2f}-{b:6.2f}] {r.text}')
json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
