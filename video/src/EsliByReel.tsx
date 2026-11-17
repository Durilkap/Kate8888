import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {RED} from './SerijaReel';
import {useOswald2} from './UgadajReel';
import {useMontserrat} from './WordCaptions';

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
      <HookBold style={hook} />
    </AbsoluteFill>
  );
};

// Рилс 36, челлендж Лилии, день 1 (17.11): видео Кати на кухне + настоящие комментарии из-под рилса 34
// (ники и аватарки закрыты, tools/prepare_r36.py). Комментарии крупно, по одному: появился, улетел, следующий;
// последние 1,6 с без комментариев. Текст в стиле референса (IgText). 7 с, без звука: музыку Катя ставит в Instagram.

// кадрирование по просьбе Кати «ракурс максимально красивый»: ближе, от головы до талии, лёгкий наезд
const R36 = [
  {src: 'a', dur: 54, z: [1.2, 1.26], o: '50% 30%'},
  {src: 'b', dur: 60, z: [1.18, 1.24], o: '50% 32%'},
  {src: 'c', dur: 60, z: [1.24, 1.3], o: '52% 30%'},
  {src: 'd', dur: 30, z: [1.16, 1.2], o: '55% 26%'}, // без шага к камере (Катя 17.11)
];
const R36_START = R36.map((_, i) => R36.slice(0, i).reduce((a, x) => a + x.dur, 0));
export const DEN1_FRAMES = R36.reduce((a, x) => a + x.dur, 0);
const GRADE36 = 'contrast(1.03) saturate(1.05) brightness(1.02)';
// Катя 17.11: комментарии крупнее и по одному: появился, исчез, следующий. Каждый в своём месте кадра.
const SLOT = 26; // 0,87 с на комментарий: 6 кадров появление, 14 держится, 6 улетает
const POP = [6, 32, 58, 84, 110, 136];
const CARD_W = 1040;
const CARD_Y = [1330, 1470, 1350, 1420, 1500, 1380];
const CARD_X = [-6, 8, -10, 4, -4, 10];
const CARD_R = [-2.5, 2, -1.5, 2.5, -2, 1.5];

const Card: React.FC<{i: number}> = ({i}) => {
  const f = useCurrentFrame();
  const at = POP[i];
  if (f < at || f >= at + SLOT) return null;
  const p = interpolate(f, [at, at + 6], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))});
  const g = interpolate(f, [at + SLOT - 6, at + SLOT], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const dir = i % 2 ? 1 : -1;
  return (
    <Img
      src={staticFile(`r36/c${i + 1}.png`)}
      style={{
        position: 'absolute',
        left: 540 - CARD_W / 2 + CARD_X[i],
        top: CARD_Y[i],
        width: CARD_W,
        transform: `translateX(${(g * dir * 700).toFixed(1)}px) scale(${(0.72 + 0.28 * p) * (1 - 0.1 * g)}) rotate(${CARD_R[i] + g * dir * 10}deg)`,
        opacity: Math.min(1, p * 1.6) * (1 - g),
        filter: `blur(${(g * 10).toFixed(1)}px) drop-shadow(0 12px 28px rgba(0,0,0,0.4))`,
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

// Хук пожирнее и заметнее (наставник Кати 18.11): три варианта на выбор, по умолчанию «plate».
// plate: чёрный Montserrat ExtraBold на белых плашках по строкам; stroke: белый Montserrat с обводкой и красным словом;
// oswald: Oswald заглавными, белый с тенью и красным словом.
type HookStyle = 'plate' | 'stroke' | 'oswald';
const HOOK_LINES: {t: string; a?: boolean}[][] = [
  [{t: 'Если бы мне нужно было'}],
  [{t: 'не пускать в себя'}, {t: 'негатив,', a: true}],
  [{t: 'я бы сделала это ⬇️'}],
];

const HookBold: React.FC<{style: HookStyle}> = ({style}) => {
  const osw = style === 'oswald';
  const size = osw ? 76 : 64;
  return (
    <div style={{position: 'absolute', top: osw ? 960 : 990, left: 40, right: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: style === 'plate' ? 10 : 2}}>
      {HOOK_LINES.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily: osw ? 'Oswald, "DejaVu Sans Condensed", sans-serif' : 'Montserrat, "DejaVu Sans", sans-serif',
            fontWeight: osw ? 700 : 800,
            fontSize: size,
            lineHeight: style === 'plate' ? 1.12 : 1.1,
            letterSpacing: osw ? '0.01em' : '-0.015em',
            textTransform: osw ? 'uppercase' : 'none',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            color: style === 'plate' ? '#111' : '#fff',
            background: style === 'plate' ? '#fff' : 'none',
            padding: style === 'plate' ? '0.08em 0.36em 0.12em' : 0,
            borderRadius: style === 'plate' ? '0.28em' : 0,
            boxShadow: style === 'plate' ? '0 8px 24px rgba(0,0,0,0.28)' : 'none',
            WebkitTextStroke: style === 'stroke' ? '7px rgba(0,0,0,0.85)' : '0px',
            paintOrder: 'stroke fill',
            textShadow: style === 'plate' ? 'none' : '0 4px 10px rgba(0,0,0,0.55), 0 10px 34px rgba(0,0,0,0.5)',
          } as React.CSSProperties}
        >
          {l.map((w, j) => (
            <span key={j} style={{color: w.a ? RED : undefined, marginLeft: j ? '0.25em' : 0}}>
              {w.t}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Den1Reel: React.FC<{hook?: HookStyle}> = ({hook = 'plate'}) => {
  useInter400();
  useMontserrat();
  useOswald2();
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
      <HookBold style={hook} />
    </AbsoluteFill>
  );
};
