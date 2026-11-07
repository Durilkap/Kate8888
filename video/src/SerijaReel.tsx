import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Card, useMontserrat, WordCaptions} from './WordCaptions';

// Серия рилсов про этикетки в формате рилса 18 (решение Кати 06.11): без голоса, музыка из Instagram,
// вопрос-хук, быстрые кадры, белый текст и ключевые слова на красной плашке, подмигивание и «ПОДПИШИСЬ: ПРО ЭТИКЕТКИ ПРОСТО».
// Кадры готовят скрипты tools/prepare_r*.py в public/<папка>/.

export type Shot = {src: string; from: number; dur: number; start?: number; punch?: boolean; push?: [number, number, string]};
export const RED = '#E8202A';

// Экран титров: строки через «|», *слово* на плашке, «!» крупная строка; слова появляются друг за другом
export const card = (from: number, text: string, opts: {full?: boolean; top?: number; all?: boolean} = {}): Card => {
  let k = 0;
  let open = false; // выделение *...* может охватывать несколько слов
  const lines = text
    ? text.split('|').map((line) => ({
        big: line.startsWith('!'),
        words: line
          .replace(/^!/, '')
          .split(' ')
          .map((t) => {
            const starts = t.startsWith('*');
            if (starts) open = true;
            const a = open;
            const stars = (t.match(/\*/g) || []).length;
            if ((starts && stars === 2) || (!starts && stars === 1)) open = false;
            return {t: t.replace(/\*/g, ''), a: a || !!opts.all, at: from + 3 + 3 * k++}; // all: весь текст на красной плашке
          }),
      }))
    : [];
  return {from, full: !!opts.full, lines, top: opts.top};
};

const Clip: React.FC<{s: Shot; folder: string}> = ({s, folder}) => {
  const f = useCurrentFrame();
  const punch = s.punch ? interpolate(f, [0, 6], [1.12, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}) : 1;
  const [z0, z1, origin] = s.push ?? [1, 1.03, '50% 50%'];
  const z = punch * interpolate(f, [0, s.dur], [z0, z1], {easing: Easing.inOut(Easing.sin)});
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, transformOrigin: origin};
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      {s.src.endsWith('.jpg') ? (
        <Img src={staticFile(`${folder}/${s.src}`)} style={style} />
      ) : (
        <OffthreadVideo src={staticFile(`${folder}/${s.src}.mp4`)} startFrom={s.start ?? 0} muted style={{...style, filter: 'contrast(1.05) saturate(1.08)'}} />
      )}
    </AbsoluteFill>
  );
};

const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{backgroundColor: '#fff', opacity: interpolate(f, [0, 2, 6], [0, 0.55, 0], {extrapolateRight: 'clamp'})}} />;
};

const BOTTOM = 'linear-gradient(to top, rgba(0,0,0,0) 10%, rgba(0,0,0,0.45) 20%, rgba(0,0,0,0.45) 43%, rgba(0,0,0,0) 55%)';
const TOPG = 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.42) 22%, rgba(0,0,0,0) 38%)';

export const SerijaReel: React.FC<{folder: string; shots: Shot[]; cards: Card[]; total: number; flashes?: number[]; topBands?: [number, number][]}> = ({
  folder,
  shots,
  cards,
  total,
  flashes = [],
  topBands = [],
}) => {
  const ready = useMontserrat();
  // затемнение под текстом: сверху там, где титры наверху, снизу в остальное время
  const bands: [number, number, string][] = [];
  let t = 0;
  for (const [a, b] of topBands) {
    if (a > t) bands.push([t, a, BOTTOM]);
    bands.push([a, b, TOPG]);
    t = b;
  }
  if (t < total) bands.push([t, total, BOTTOM]);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {shots.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur}>
          <Clip s={s} folder={folder} />
        </Sequence>
      ))}
      {flashes.map((fr) => (
        <Sequence key={`f${fr}`} from={fr} durationInFrames={8}>
          <Flash />
        </Sequence>
      ))}
      {bands.map(([a, b, bg]) => (
        <Sequence key={`b${a}`} from={a} durationInFrames={b - a}>
          <AbsoluteFill style={{background: bg}} />
        </Sequence>
      ))}
      <WordCaptions cards={cards} total={total} ready={ready} accent={RED} plate />
    </AbsoluteFill>
  );
};

// Рилс 19 «Что девушка делает в типографии?» (видео Кати с производства 06.11, tools/prepare_r19.py)
const R19_SHOTS: Shot[] = [
  {src: 'heels', from: 0, dur: 48},
  {src: 'walk', from: 48, dur: 60, punch: true},
  {src: 'line', from: 108, dur: 60, punch: true},
  {src: 'rolls', from: 168, dur: 48, punch: true},
  {src: 'phone', from: 216, dur: 54, punch: true},
  {src: 'desk', from: 270, dur: 54, punch: true},
  {src: 'crouch', from: 324, dur: 51, punch: true},
  {src: 'smile', from: 375, dur: 63},
  {src: 'wink', from: 438, dur: 121},
];
export const R19_FRAMES = 559;
const R19_CARDS: Card[] = [
  card(0, 'ЧТО ДЕВУШКА|ДЕЛАЕТ В|!*ТИПОГРАФИИ?*', {full: true, top: 200}),
  card(108, 'ЗНАЮ, КАК|ПЕЧАТАЮТ|*ЭТИКЕТКИ*'),
  card(216, 'ВЕДУ|*ПЕРЕГОВОРЫ*'),
  card(270, 'РАБОТАЮ|С *КЛИЕНТАМИ*'),
  card(324, 'И ДА,|НА *КАБЛУКАХ*', {top: 200}),
  card(375, 'И ОБЪЯСНЯЮ|ЭТО *ПРОСТО*'),
  card(438, 'ПОДПИШИСЬ:|ПРО ЭТИКЕТКИ|!*ПРОСТО*', {top: 1130}),
];
export const DevushkaReel: React.FC = () => (
  <SerijaReel folder="r19" shots={R19_SHOTS} cards={R19_CARDS} total={R19_FRAMES} flashes={[108]} topBands={[[0, 108], [324, 375]]} />
);

// Рилс 19, версия 3 (06.11, Катя: «не цепляет, переделай»): история вместо перечня.
// Стереотип («Говорят...», проверено), ответ («А я здесь. И на каблуках»), быстрые доказательства по одному слову, подмигивание.
const R19B_SHOTS: Shot[] = [
  {src: 'heels', from: 0, dur: 45},
  {src: 'walk', from: 45, dur: 60, punch: true},
  {src: 'crouch', from: 105, dur: 45, punch: true, push: [1.0, 1.1, '30% 80%']},
  {src: 'line', from: 150, dur: 30, start: 20, punch: true},
  {src: 'rolls', from: 180, dur: 30, start: 10, punch: true},
  {src: 'phone', from: 210, dur: 30, start: 15, punch: true},
  {src: 'desk', from: 240, dur: 30, start: 15, punch: true},
  {src: 'smile', from: 270, dur: 60, punch: true},
  {src: 'wink', from: 330, dur: 120},
];
export const R19B_FRAMES = 450;
const R19B_CARDS: Card[] = [
  card(0, 'ГОВОРЯТ,|ТИПОГРАФИЯ|НЕ МЕСТО|ДЛЯ *ДЕВУШКИ*', {full: true, top: 170}),
  card(45, '!А Я *ЗДЕСЬ*'),
  card(105, 'И НА|!*КАБЛУКАХ*', {top: 200}),
  card(150, '!*ПЕЧАТЬ*'),
  card(180, '!*РУЛОНЫ*'),
  card(210, '!*ПЕРЕГОВОРЫ*'),
  card(240, '!*КЛИЕНТЫ*'),
  card(270, 'ЗНАЮ, КАК|ПЕЧАТАЮТ|*ЭТИКЕТКИ*'),
  card(330, 'ПОДПИШИСЬ:|ПРО ЭТИКЕТКИ|!*ПРОСТО*', {top: 1130}),
];
export const DevushkaReel2: React.FC = () => (
  <SerijaReel folder="r19" shots={R19B_SHOTS} cards={R19B_CARDS} total={R19B_FRAMES} flashes={[150, 180, 210, 240]} topBands={[[0, 45], [105, 150]]} />
);

// Рилс 20 «Мой нерабочий день: сырники» (07.11, видео Кати дома, tools/prepare_r20.py).
// Мужа в кадре нет (решение Кати); марки не видны; цифры завтрака из приложения Кати (сам экран приложения не показываем).
const R20_SHOTS: Shot[] = [
  {src: 'line', from: 0, dur: 45}, // Катя идёт спиной вдоль печатной линии (из рилса 19, выбор Кати 07.11)
  {src: 'stretch', from: 45, dur: 54, punch: true},
  {src: 'water', from: 99, dur: 60, punch: true},
  {src: 'collagen', from: 159, dur: 72, punch: true},
  {src: 'airfryer', from: 231, dur: 75, punch: true},
  {src: 'plate_full.jpg', from: 306, dur: 60, punch: true, push: [1.0, 1.08, '55% 68%']}, // фото целиком (решение Кати)
  {src: 'plate', from: 366, dur: 54, punch: true},
  {src: 'appcard.jpg', from: 420, dur: 60, punch: true, push: [1.0, 1.05, '50% 35%']},
  {src: 'wink', from: 480, dur: 100},
];
export const R20_FRAMES = 580;
const R20_CARDS: Card[] = [
  card(0, 'В БУДНИ Я|В *ТИПОГРАФИИ*', {full: true, top: 200}),
  card(45, 'А В *ВЫХОДНОЙ*...'),
  card(99, 'СНАЧАЛА|*СТАКАН ВОДЫ*'),
  card(159, 'КОЛЛАГЕН. И ДА,|СНАЧАЛА СМОТРЮ|НА *ЭТИКЕТКУ*'),
  card(231, 'СЫРНИКИ|В *АЭРОГРИЛЕ*'),
  card(306, 'ПИТАНИЕ ПО ПЛАНУ.|ЗАБОТА ОТ *МУЖА*', {top: 160}),
  card(366, 'СЕГОДНЯ У МЕНЯ|*100 Г УГЛЕВОДОВ*'),
  card(420, 'МОЙ ЗАВТРАК|В *ЦИФРАХ*', {top: 1000}),
  card(480, 'ПОДПИШИСЬ:|ПРО ЭТИКЕТКИ|И НЕ *ТОЛЬКО*', {top: 1130}),
];
export const VyhodnojReel: React.FC = () => (
  <SerijaReel folder="r20" shots={R20_SHOTS} cards={R20_CARDS} total={R20_FRAMES} flashes={[45]} topBands={[[0, 45], [306, 366]]} />
);

// Рилс 20, вариант в брюках-зебре (видео 3, просьба Кати 07.11): одно видео плюс фото тарелки и цифры из приложения
const R20Z_SHOTS: Shot[] = [
  // хук (07.11, Катя: «не забудь про хук сильный»): контраст, тарелка крупно
  {src: 'plate_full.jpg', from: 0, dur: 48, push: [1.3, 1.45, '55% 70%']},
  {src: 'line', from: 48, dur: 45, punch: true},
  {src: 'z_pour', from: 93, dur: 54, punch: true},
  {src: 'z_drink', from: 147, dur: 60, punch: true},
  {src: 'z_collagen', from: 207, dur: 72, punch: true},
  {src: 'plate_full.jpg', from: 279, dur: 60, punch: true, push: [1.0, 1.08, '55% 68%']}, // фото целиком (решение Кати)
  {src: 'z_eat1', from: 339, dur: 60, punch: true},
  {src: 'z_eat2', from: 399, dur: 54, punch: true},
  {src: 'appcard.jpg', from: 453, dur: 60, punch: true, push: [1.0, 1.05, '50% 35%']},
  {src: 'z_wink', from: 513, dur: 105},
];
export const R20Z_FRAMES = 618;
// весь текст на красной плашке (просьба Кати 07.11)
const R20Z_CARDS: Card[] = [
  card(0, 'СЧИТАЮ КАЛОРИИ.|И ЕМ СЫРНИКИ|С *ШОКОЛАДОМ*', {full: true, top: 200, all: true}),
  card(48, 'В БУДНИ Я|В *ТИПОГРАФИИ*', {top: 200, all: true}),
  card(93, 'А В *ВЫХОДНОЙ*...', {all: true}),
  card(147, 'СНАЧАЛА|*СТАКАН ВОДЫ*', {all: true}),
  card(207, 'КОЛЛАГЕН. И ДА,|СНАЧАЛА СМОТРЮ|НА *ЭТИКЕТКУ*', {all: true}),
  card(279, 'СЫРНИКИ|В *АЭРОГРИЛЕ*', {top: 160, all: true}),
  card(339, 'ПИТАНИЕ|ПО *ПЛАНУ*', {all: true}), // «забота от мужа» убрано (решение Кати 07.11)
  card(399, 'СЕГОДНЯ У МЕНЯ|*100 Г УГЛЕВОДОВ*', {all: true}),
  card(453, 'МОЙ ЗАВТРАК|В *ЦИФРАХ*', {top: 1000, all: true}),
  card(513, 'ПОДПИШИСЬ:|ПРО ЭТИКЕТКИ|И НЕ *ТОЛЬКО*', {top: 1130, all: true}),
];
export const VyhodnojZebra: React.FC = () => (
  <SerijaReel folder="r20" shots={R20Z_SHOTS} cards={R20Z_CARDS} total={R20Z_FRAMES} flashes={[48, 93]} topBands={[[0, 93], [279, 339]]} />
);
