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

## Рилс 16 «Хороший продажник сейчас это роскошь» (Катя на камеру в машине, 2 дубля)
1. Фото с корпоратива: `python3 tools/prepare_corporate_photos.py work/r16/src public/r16` (логотип убран, значок, текст грамоты кроме слова «ГРАМОТА», гости, бутылки размыты).
2. Расшифровка дублей: `python3 audio/transcribe.py work/r16/src/a.mov work/r16/asr_a.json` (и b).
3. Монтаж: `python3 tools/prepare_prodazhnik.py` (куски дублей в `CHUNKS`, титры в `CARDS`, вставки фото в `PHOTOS`; пишет `public/r16/` и `src/prodazhnik.json`).
4. Рендер композиции `ProdazhnikReel` со звуком, финальное кодирование с AAC и `-map_metadata -1`.
Общие титры по словам: `src/WordCaptions.tsx` (стиль рилса 14 v4).

## Рилс про сына (15 лет): нарезка по референсу Кати
1. Исходники в `work/r21/src` (не в git): `door.mov` (дверь, букет), `spin15.mov` (шары «15», кружит, 120 к/с), `photo_*.jpg`, `chat_*.jpg` (скрины без имён и фамилий).
2. `python3 tools/prepare_r21.py work/r21/src public/r21`: куски видео (кружение замедлено 0,62), фото без EXIF, скрины обрезаны до сообщений, границы сообщений в `src/syn_chat.json`. Кадр в дверях приближен: номер квартиры на стене подъезда за кадром.
3. Композиции в `src/SynReel.tsx`: `SynReel` (тихие белые титры Inter SemiBold) `SynReelPlate` (хук с первого кадра, весь текст на белой плашке) и `SynReelOne` (одна фраза в начале на плашке, решение Кати 09.11); сообщения появляются по одному, без звука.

## Рилс 22 «Завидуют те, кто ничего не делает» (фото из интернета)
1. `python3 tools/prepare_r22.py public/r22`: 6 фото Unsplash (id и описание в скрипте), вертикальная обрезка, без метаданных.
2. Композиции `ZavistReel` (слова Кати) и `ZavistReelSoft` (мягче) в `src/ZavistReel.tsx`: медленное приближение, переходы, белый текст Inter SemiBold. Без звука.
3. Версия на фото и видео Кати: `python3 tools/prepare_r22_katya.py work/r22k/src public/r22k` (видео HDR переводится в SDR, вывеска отеля вне кадра), композиция `ZavistKatya`.

## Рилс 23 «Угадай продукт по кусочку этикетки» (видео Кати из магазина)
1. `python3 tools/prepare_r23.py work/r23/src public/r23`: загадки g1-g6 (кусочек этикетки, цифровое приближение 4K), ответы a1-a6, финал end. Ценники с логотипом магазина и крупное название марки не берутся.
2. Композиция `UgadajReel` (`src/UgadajReel.tsx`) на шаблоне серии `SerijaReel`, красная плашка, без звука.
3. Композиция `UgadajMotion` (там же): хук-вызов, номер в круге с таймером, переходы «пролёт» (плавный зум и размытие, без рывков), ответы с плавным отъездом 1,45 -> 1,0.

## Рилс 24 «Закулисье твоего холодильника» (черновик)
Композиция `ZakuliseReel` (`src/ZakuliseReel.tsx`) из готовых кадров `public/r18` и `public/r19` (плюс стоп-кадры `r18/hook_f51.jpg`, `r19/wink_freeze54.jpg`). Общие части моушена (`MClip`, `KWord`, `Finale`, `Flash`) из `src/UgadajReel.tsx`.
Финальный монтаж на кадрах Кати: `python3 tools/prepare_r24.py work/r24/src public/r24`, композиция `ZakuliseMega` (`src/ZakuliseMega.tsx`): смахивания с размытием по горизонтали (SVG-фильтр), блики, кружок, галочка, корона и искры нарисованы в коде.

## Рилс 26 «Спешка» (видео из машины, 240 к/с)
1. `python3 tools/prepare_r26.py work/r26/src public/r26`: speed ramp в Python (кадры 240 к/с из ffmpeg, при ускорении усредняются: настоящее размытие движения; торможение по плавной кривой в лог-шкале скорости).
2. Композиция `SpeshkaReel` (`src/SpeshkaReel.tsx`): тряска и холодный цвет в суете, уведомления, Cormorant курсивом по буквам, маска «дворника», светлая дымка в финале.
