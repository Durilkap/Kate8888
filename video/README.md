# video: сборка рилсов в Remotion

Установлено: remotion и @remotion/cli 4.0.538, react 19. Фото, видео и аудио в репозиторий не кладём (см. `.gitignore`).

Проверено 29.10: тестовый кадр с кириллицей рендерится. Шрифт: Inter (есть в системе).

Запуск из папки `video/`:
- предпросмотр: `npx remotion studio`
- кадр: `npx remotion still src/index.ts <композиция> out/frame.png --browser-executable=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome --chrome-mode=chrome-for-testing`
- видео: `npx remotion render src/index.ts <композиция> out/reel.mp4` с теми же флагами браузера.

Композиции: `TestCard` (проверка), `BestAngle` (рилс «лучший ракурс»), `BestAngleFifa` (про фифу, без звука), `Slishkom` (рилс «Слишком» с голосом Кати). Рилсы собираются из материалов Кати (клипы, озвучка), которые она присылает в чат.

## Рилс «Слишком» с озвучкой
Текст и решения: `scenarii/rils-11-slishkom.md`. Композиция `Slishkom`, параметры (`--props=файл.json`):
- `mode`: `bar` (титры в чёрном поле сверху, рекомендовано, читается чище) или `overlay` (титры поверх видео).
- `starts`: кадры (30 fps), с которых звучит каждая из 13 фраз; `total`: длина ролика в кадрах; `voice`: файл озвучки в `public/`; `music`: необязательная тихая музыка в `public/`.
- Планы и зумы заданы в `src/Slishkom.tsx` (`SHOTS`). Сейчас в шаблоне запасные кадры из видео в платье (`public/source.mp4`, `public/slow.mp4`), их надо заменить на видео, которое выберет Катя.

Озвучка, шаги:
1. `python3 audio/voice_to_props.py запись.m4a` чистит запись, находит паузы, ставит титры и пишет `public/voice.wav` и `work/props-voice.json`. Метка «оценка» в таблице значит, что пауза у фразы не найдена и начало титра примерное.
2. Рендер: `npx remotion render src/index.ts Slishkom out/slishkom.mp4 --props=work/props-voice.json` с флагами браузера и `--codec=h264 --crf=18 --pixel-format=yuv420p`.
3. Перекодировать в обычный `yuv420p` TV range и убрать метаданные (`-vf scale=in_range=full:out_range=tv,format=yuv420p -color_range tv -colorspace bt709 -map_metadata -1`).

Ограничения: звук помощник не слышит, тайминги проверены только по паузам и на синтетическом сигнале; финал смотрит и слушает Катя. Лицензия Remotion для коммерческого использования блогером не подтверждена (см. remotion.dev/license).

## Рилс «Слишком» в машине (видео Кати на камеру)
1. Распознать речь: `python3 audio/transcribe.py исходник.mp4 work/asr.json`. Нужны `pip install sherpa-onnx` и модели в `/tmp/asrmodel` (GigaAM v2 transducer и silero_vad.onnx из релизов github.com/k2-fsa/sherpa-onnx, раздел asr-models; HuggingFace из этой среды закрыт).
2. Монтаж без пауз и данные субтитров: `python3 tools/prepare_slishkom_car.py исходник.mp4 work/asr.json` (куски и слова заданы в скрипте).
3. Рендер композиции `SlishkomCar`, затем перекодирование в обычный `yuv420p` и удаление метаданных, как выше.

## Рилс 14 «Как я стала девочкой» (свадебные фото и видео, голос Кати)
1. Фото: `python3 tools/prepare_wedding_photos.py work/r14/src public/wed` (размытие, вертикальная обрезка, без EXIF).
2. Голос: `python3 audio/transcribe.py work/r14/voice/voice.mp3 work/r14/voice/asr.json`, затем
   `python3 tools/prepare_wedding_voice.py work/r14/voice/voice.mp3 work/r14/voice/asr.json`
   (паузы длиннее 0,34 с укорачиваются по тишине, пишет `public/wed/voice.wav` и `src/weddingVoice.json` с титрами по словам).
3. Плавные замедленные копии видеокусков: `python3 tools/slow_wedding_clips.py`.
4. Рендер композиции `WeddingReel` со звуком (без `--muted`), затем финальное кодирование с AAC и `-map_metadata -1`.
Титры: Montserrat ExtraBold, ключевые слова жёлтые (в разметке `*слово*`), строки через `|`, `!` - крупная строка.
