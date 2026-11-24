import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
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

// обложка (Катя 24.11: «я же просила лучшие кадры, посмотри на лицо»): кадр дубля 1 на 0,4 с, лицо спокойное,
// губы сомкнуты, взгляд в камеру (выбран по крупной сетке лиц из обоих дублей)
export const TopCover: React.FC = () => {
  useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Img src={staticFile('r43/cover.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: GRADE, transform: 'scale(1.22)', transformOrigin: '45% 22%'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 26%)'}} />
      <div style={{position: 'absolute', top: 110, left: 60, right: 60, textAlign: 'center', fontFamily: SANS, color: '#fff', textShadow: SHADOW}}>
        <div style={{fontWeight: 800, fontSize: 54, lineHeight: 1.16}}>{TOP_HEAD}</div>
        <div style={{fontWeight: 600, fontSize: 38, marginTop: 10, fontFamily: 'Montserrat, "Noto Color Emoji", sans-serif'}}>{TOP_TRIG}</div>
      </div>
    </AbsoluteFill>
  );
};

// обложка из фото Кати 24.11 (офис, белая рубашка, брошь): документы на столе срезаны кадрированием
// (public/r43/cover_photo.jpg; цвет лица теплее и розовее: colortemperature 5300, colorbalance, eq, по просьбе Кати), заголовок внизу, чтобы не закрывать лицо; в сетке профиля (3:4) текст остаётся виден
export const TopCoverPhoto: React.FC = () => {
  useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Img src={staticFile('r43/cover_photo.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.02)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 78%, rgba(0,0,0,0.25) 100%)'}} />
      <div style={{position: 'absolute', top: 1270, left: 60, right: 60, textAlign: 'center', fontFamily: SANS, color: '#fff', textShadow: SHADOW}}>
        <div style={{fontWeight: 800, fontSize: 58, lineHeight: 1.16}}>{TOP_HEAD}</div>
        <div style={{fontWeight: 600, fontSize: 40, marginTop: 12, fontFamily: 'Montserrat, "Noto Color Emoji", sans-serif'}}>{TOP_TRIG}</div>
      </div>
    </AbsoluteFill>
  );
};
