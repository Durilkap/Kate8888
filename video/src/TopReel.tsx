import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {RED} from './SerijaReel';
import {SANS, useMontserrat, WordCaptions} from './WordCaptions';
import {TOP_CARDS, TOP_CUTS, TOP_FRAMES, TOP_HEAD, TOP_ITEMS, TOP_TRIG} from './TopCards';

// Рилс 43 (челлендж Лилии, день 7 «Мой ТОП...», 24.11): «Мой топ мужских фраз, после которых я понимаю: это не мой
// мужчина». Два дубля Кати, лучшие куски по фразам (tools/prepare_r43.py). Заголовок с триггером сверху всё видео,
// под ним счётчик «1/4» (как в примерах), снизу титры по словам (tools/cards_r43.py).

const GRADE = 'contrast(1.04) saturate(1.04) sepia(0.05) brightness(1.03)';
export {TOP_FRAMES};
const SHADOW = '0 2px 10px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.6)';

export const TopReel: React.FC = () => {
  const ready = useMontserrat();
  const f = useCurrentFrame();
  let i = 0;
  while (i < TOP_CUTS.length - 2 && f >= TOP_CUTS[i + 1]) i++;
  const base = i % 2 === 0 ? 1.0 : 1.1;
  const push = interpolate(f, [TOP_CUTS[i], TOP_CUTS[i + 1]], [0, 0.02], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const punch = i === 0 ? 0 : interpolate(f, [TOP_CUTS[i], TOP_CUTS[i] + 5], [0.04, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const item = TOP_ITEMS.find((x) => f >= x.from && f < x.to);
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile('r43/talk.mp4')} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${(base + push + punch).toFixed(4)})`, transformOrigin: '50% 28%', filter: GRADE}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0.05) 100%)'}} />
      <div style={{position: 'absolute', top: 120, left: 70, right: 70, textAlign: 'center', fontFamily: SANS, color: '#fff', textShadow: SHADOW}}>
        <div style={{fontWeight: 800, fontSize: 46, lineHeight: 1.18}}>{TOP_HEAD}</div>
        <div style={{fontWeight: 600, fontSize: 34, marginTop: 8, fontFamily: 'Montserrat, "Noto Color Emoji", sans-serif'}}>{TOP_TRIG}</div>
        <div style={{fontWeight: 800, fontSize: 40, marginTop: 10, opacity: item ? 1 : 0}}>{item ? item.t : ''}</div>
      </div>
      <WordCaptions cards={TOP_CARDS} total={TOP_FRAMES} ready={ready} accent={RED} plate top={1250} size={60} />
    </AbsoluteFill>
  );
};
