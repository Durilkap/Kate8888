import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Img, OffthreadVideo, staticFile} from 'remotion';

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
