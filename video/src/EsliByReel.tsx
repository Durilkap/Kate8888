import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';

// Стиль текста по референсу челленджа Лилии (ролик «Если бы мне нужно было...», Катя 17.11): маленький белый
// шрифт без плашки по центру кадра чуть ниже середины, мягкая тень, стрелка ⬇️. Шрифт Instagram «Классический»
// недоступен, ближайший свободный: Inter Regular (OFL). Строки и место подобраны по кадру референса.

export const useInter400 = () => {
  const [handle] = useState(() => delayRender('inter400'));
  useEffect(() => {
    const cyr = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
    const lat = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD';
    const f = (file: string, range: string) =>
      new FontFace('InterReg', `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight: '400', style: 'normal', unicodeRange: range});
    Promise.all([f('inter-cyrillic-400-normal.woff2', cyr), f('inter-latin-400-normal.woff2', lat)].map((x) => x.load()))
      .then((l) => {
        l.forEach((x) => document.fonts.add(x));
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
};

export const IgText: React.FC<{lines: string[]; top?: number; size?: number}> = ({lines, top = 1095, size = 37}) => (
  <div
    style={{
      position: 'absolute',
      top,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontFamily: 'InterReg, "DejaVu Sans", sans-serif',
      fontWeight: 400,
      fontSize: size,
      lineHeight: 1.38,
      letterSpacing: '-0.005em',
      color: '#fff',
      textShadow: '0 1px 2px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)',
    }}
  >
    {lines.map((l, i) => (
      <div key={i}>{l}</div>
    ))}
  </div>
);

// проверка совпадения: наш текст поверх кадра референса (только для сравнения, не для публикации)
export const EsliByRefTest: React.FC = () => {
  useInter400();
  return (
    <AbsoluteFill>
      <Img src={staticFile('ref1/f15.png')} style={{width: '100%', height: '100%', opacity: 0.55}} />
      <IgText lines={['Если бы мне нужно', 'было увеличить густоту волос -', 'я бы сделала это ⬇️']} />
    </AbsoluteFill>
  );
};

export const EsliByReel: React.FC<{src?: string}> = ({src = 'r36/main.mp4'}) => {
  useInter400();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <IgText lines={['Если бы мне нужно', 'было не пускать в себя негатив -', 'я бы сделала это ⬇️']} />
    </AbsoluteFill>
  );
};

// Рилс 36, челлендж Лилии, день 1 (17.11): видео Кати на кухне + настоящие комментарии из-под рилса 34
// (ники и аватарки закрыты, tools/prepare_r36.py). Комментарии сыплются стопкой, пока Катя не кладёт телефон
// экраном вниз, тогда исчезают. Текст в стиле референса (IgText). 7 с, без звука: музыку Катя ставит в Instagram.

// кадрирование по просьбе Кати «ракурс максимально красивый»: ближе, от головы до талии, лёгкий наезд
const R36 = [
  {src: 'a', dur: 54, z: [1.2, 1.26], o: '50% 30%'},
  {src: 'b', dur: 60, z: [1.18, 1.24], o: '50% 32%'},
  {src: 'c', dur: 60, z: [1.24, 1.3], o: '52% 30%'},
  {src: 'd', dur: 36, z: [1.16, 1.2], o: '55% 26%'},
];
const R36_START = R36.map((_, i) => R36.slice(0, i).reduce((a, x) => a + x.dur, 0));
export const DEN1_FRAMES = R36.reduce((a, x) => a + x.dur, 0);
const GRADE36 = 'contrast(1.03) saturate(1.05) brightness(1.02)';
const POP = [4, 20, 36, 52, 68, 84];
const GONE = 96; // Катя кладёт телефон экраном вниз
const CARD_H = [140, 135, 135, 215, 112, 132].map((h) => (h * 880) / 1150);
const CARD_Y: number[] = [];
// новая карточка закрывает у предыдущей только строку с ником (её низ в пикселях карточки)
const NAME_BOTTOM = [68, 66, 66, 52, 46, 68].map((h) => (h * 880) / 1150 - 4);
CARD_H.forEach((h, i) => CARD_Y.push(i === 0 ? 1850 - h : CARD_Y[i - 1] + NAME_BOTTOM[i - 1] - h));
const CARD_X = [-10, 8, -6, 10, -8, 6];
const CARD_R = [-1, 0.8, -0.6, 1, -0.8, 0.6];

const Card: React.FC<{i: number}> = ({i}) => {
  const f = useCurrentFrame();
  const at = POP[i];
  if (f < at) return null;
  const p = interpolate(f, [at, at + 6], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.8))});
  const g = interpolate(f, [GONE + i, GONE + i + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  return (
    <Img
      src={staticFile(`r36/c${i + 1}.png`)}
      style={{
        position: 'absolute',
        left: 540 - 440 + CARD_X[i],
        top: CARD_Y[i],
        width: 880,
        transform: `translateY(${(g * 900).toFixed(1)}px) scale(${(0.6 + 0.4 * p) * (1 - 0.15 * g)}) rotate(${CARD_R[i] + g * (i % 2 ? 12 : -12)}deg)`,
        transformOrigin: '50% 100%',
        opacity: Math.min(1, p * 1.5) * (1 - g),
        filter: `blur(${(g * 8).toFixed(1)}px) drop-shadow(0 10px 24px rgba(0,0,0,0.35))`,
      }}
    />
  );
};

const Shot36: React.FC<{src: string; dur: number; z: [number, number]; o: string}> = ({src, dur, z, o}) => {
  const f = useCurrentFrame();
  const sc = interpolate(f, [0, dur], z, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile(`r36/${src}.mp4`)}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${sc.toFixed(4)})`, transformOrigin: o, filter: GRADE36}}
      />
    </AbsoluteFill>
  );
};

export const Den1Reel: React.FC = () => {
  useInter400();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {R36.map((s, i) => (
        <Sequence key={s.src} from={R36_START[i]} durationInFrames={s.dur}>
          <Shot36 src={s.src} dur={s.dur} z={s.z as [number, number]} o={s.o} />
        </Sequence>
      ))}
      {POP.map((_, i) => (
        <Card key={i} i={i} />
      ))}
      <IgText lines={['Если бы мне нужно', 'было не пускать в себя негатив -', 'я бы сделала это ⬇️']} />
    </AbsoluteFill>
  );
};
