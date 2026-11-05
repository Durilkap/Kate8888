import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Card, useMontserrat, WordCaptions} from './WordCaptions';

// Рилс 18 «Видишь всё, что есть в холодильнике?» по сценарию Кати (05.11), вариант без рекламы:
// без «наше направление» и «хочешь узнать цену». Кадры готовит tools/prepare_etiketki.py (public/r18/).
// Размытия нет по решению Кати («Не размывай», 05.11). Звука нет: Катя добавит музыку.

type Shot = {src: string; from: number; dur: number; start?: number; punch?: boolean; push?: [number, number, string]};

const SHOTS: Shot[] = [
  {src: 'hook', from: 0, dur: 42, start: 3},
  {src: 'hook', from: 42, dur: 42, start: 45, push: [1.0, 1.14, '35% 30%']},
  {src: 'machine', from: 84, dur: 42, punch: true},
  {src: 'line', from: 126, dur: 39, punch: true},
  // динамичные кадры производства и рулонов
  {src: 'rolls', from: 165, dur: 24, punch: true},
  {src: 'machine', from: 189, dur: 22, start: 90, punch: true},
  {src: 'p1.jpg', from: 211, dur: 26, punch: true, push: [1.0, 1.12, '50% 40%']},
  {src: 'line', from: 237, dur: 22, start: 120, punch: true},
  {src: 'rolls', from: 259, dur: 22, start: 50, punch: true},
  {src: 'machine', from: 281, dur: 18, start: 150, punch: true},
  {src: 'line', from: 299, dur: 16, start: 200, punch: true},
  // компьютер: размер, цветность, материал, тираж
  {src: 'type1', from: 315, dur: 48},
  {src: 'type2', from: 363, dur: 18},
  {src: 'screen', from: 381, dur: 42, punch: true},
  // финал: подмигивание (около кадра 445)
  {src: 'final', from: 423, dur: 106},
];
export const ETIKETKI_FRAMES = 529;

// Экран титров: строки через «|», *слово* жёлтое, «!» крупная строка; слова появляются друг за другом
const card = (from: number, text: string, opts: {full?: boolean; top?: number; at?: number[]} = {}): Card => {
  let k = 0;
  const lines = text
    ? text.split('|').map((line, li) => {
        const big = line.startsWith('!');
        return {
          big,
          words: line
            .replace(/^!/, '')
            .split(' ')
            .map((t) => ({t: t.replace(/\*/g, ''), a: t.includes('*'), at: opts.at ? opts.at[li] : from + 3 + 3 * k++})),
        };
      })
    : [];
  return {from, full: !!opts.full, lines, top: opts.top};
};

const TOP = 170; // над холодильником (лицо Кати ниже)
const RED = '#E8202A'; // ключевые слова белыми буквами на красной плашке (просьба Кати 05.11), в тон «ЦЕНА ЭТИКЕТКИ» на экране
const CARDS: Card[] = [
  card(0, 'ВИДИШЬ ВСЁ,|ЧТО ЕСТЬ|В *ХОЛОДИЛЬНИКЕ?*', {full: true, top: TOP}),
  card(42, 'ПОЧТИ НА ВСЁМ|ЕСТЬ *ЭТИКЕТКА*', {top: TOP}),
  card(84, 'А Я ЗНАЮ,|КАК ИХ *ПЕЧАТАЮТ*'),
  card(126, 'ИЗ ЧЕГО|СКЛАДЫВАЕТСЯ|ИХ *ЦЕНА?*'),
  card(165, '!*ФЛЕКСОПЕЧАТЬ*'),
  card(240, 'САМОКЛЕЯЩИЕСЯ|*ЭТИКЕТКИ*'),
  // компьютер: экран крупно, список «размер, цветность, материал, тираж» появляется сам по мере набора
  card(315, ''),
  card(423, 'ПОДПИШИСЬ:|ПРО ЭТИКЕТКИ|!*ПРОСТО*', {top: 1130}),
];

const Clip: React.FC<{s: Shot}> = ({s}) => {
  const f = useCurrentFrame();
  const punch = s.punch ? interpolate(f, [0, 6], [1.12, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}) : 1;
  const [z0, z1, origin] = s.push ?? [1, 1.03, '50% 50%'];
  const z = punch * interpolate(f, [0, s.dur], [z0, z1], {easing: Easing.inOut(Easing.sin)});
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, transformOrigin: origin};
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      {s.src.endsWith('.jpg') ? (
        <Img src={staticFile(`r18/${s.src}`)} style={style} />
      ) : (
        <OffthreadVideo src={staticFile(`r18/${s.src}.mp4`)} startFrom={s.start ?? 0} muted style={{...style, filter: 'contrast(1.05) saturate(1.08)'}} />
      )}
    </AbsoluteFill>
  );
};

const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{backgroundColor: '#fff', opacity: interpolate(f, [0, 2, 6], [0, 0.55, 0], {extrapolateRight: 'clamp'})}} />;
};

export const EtiketkiReel: React.FC = () => {
  const ready = useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur}>
          <Clip s={s} />
        </Sequence>
      ))}
      <Sequence from={165} durationInFrames={8}>
        <Flash />
      </Sequence>
      <Sequence from={0} durationInFrames={84}>
        <AbsoluteFill style={{background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.42) 22%, rgba(0,0,0,0) 38%)'}} />
      </Sequence>
      {[
        [84, 315],
        [423, ETIKETKI_FRAMES],
      ].map(([a, b]) => (
        <Sequence key={`g${a}`} from={a} durationInFrames={b - a}>
          <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(0,0,0,0) 10%, rgba(0,0,0,0.45) 20%, rgba(0,0,0,0.45) 43%, rgba(0,0,0,0) 55%)'}} />
        </Sequence>
      ))}
      <WordCaptions cards={CARDS} total={ETIKETKI_FRAMES} ready={ready} accent={RED} plate />
    </AbsoluteFill>
  );
};
