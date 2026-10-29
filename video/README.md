# video: сборка рилсов в Remotion

Установлено: remotion и @remotion/cli 4.0.538, react 19. Фото, видео и аудио в репозиторий не кладём (см. `.gitignore`).

Проверено 29.10: тестовый кадр с кириллицей рендерится. Шрифт: Inter (есть в системе).

Запуск из папки `video/`:
- предпросмотр: `npx remotion studio`
- кадр: `npx remotion still src/index.ts <композиция> out/frame.png --browser-executable=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome --chrome-mode=chrome-for-testing`
- видео: `npx remotion render src/index.ts <композиция> out/reel.mp4` с теми же флагами браузера.

Композиции: `TestCard` (проверка). Рилсы собираются из материалов Кати (клипы, озвучка), которые она присылает в чат.
