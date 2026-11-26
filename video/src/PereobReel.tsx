import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {RED} from './SerijaReel';
import {SANS, useMontserrat, WordCaptions} from './WordCaptions';
import {PER_CARDS, PER_CUTS, PER_FRAMES, PER_HEADTOP} from './PereobCards';

// Рилс 45 (челлендж Лилии, день 9, 26.11): «В чём я переобулась, когда у меня сформировались лобные доли».
// Один дубль в горчичном лонге (выбор Кати), tools/prepare_r45.py. Вверху у головы: хук с приписка «Версия охуевшей»
// (с первой секунды), затем номер и суть пункта, в конце вопрос; внизу титры по словам (tools/cards_r45.py).

export {PER_FRAMES};
const SHADOW = '0 2px 10px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.7)';
const FONT = 'Montserrat, "Noto Color Emoji", sans-serif';
export const PER_HOOK = 'В чём я переобулась, когда у меня сформировались лобные доли';
export const PER_TAG = 'Версия охуевшей 😏';
const POINTS = ['Не жду, что догадается', 'Не оправдываюсь', 'Не готовлю и не убираюсь', 'Знать себе цену не стыдно'];
const FINAL = 'С каким пунктом вы согласны, а с каким готовы спорить? 👇';

const Tag: React.FC<{size?: number}> = ({size = 34}) => (
  <div style={{display: 'inline-block', background: RED, color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.2,
    padding: `${Math.round(size * 0.22)}px ${Math.round(size * 0.6)}px`, borderRadius: size, boxShadow: '0 4px 14px rgba(0,0,0,0.3)'}}>
    {PER_TAG}
  </div>
);

export const PereobReel: React.FC = () => {
  const ready = useMontserrat();
  const f = useCurrentFrame();
  let i = 0;
  while (i < PER_CUTS.length - 2 && f >= PER_CUTS[i + 1]) i++;
  // смена пункта: короткий толчок приближения (на месте склейки перед «Третье» он же прячет стык) и медленный наезд внутри пункта
  const punch = i === 0 ? 0 : interpolate(f, [PER_CUTS[i], PER_CUTS[i] + 5], [0.035, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const push = interpolate(f, [PER_CUTS[i], PER_CUTS[i + 1]], [0, 0.02], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sc = 1 + push + punch;
  // текст вплотную над головой (как просила куратор 25.11), с учётом приближения
  const headY = 768 + (PER_HEADTOP[i] - 768) * sc;
  const textBottom = headY + 6;
  const tIn = interpolate(f, [PER_CUTS[i], PER_CUTS[i] + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5))});
  const appear = i === 0 ? 1 : tIn;
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile('r45/talk.mp4')} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${sc.toFixed(4)})`, transformOrigin: '50% 40%'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.22) 80%, rgba(0,0,0,0.05) 100%)'}} />
      <div style={{position: 'absolute', top: textBottom, left: 40, right: 40, transform: `translateY(-100%) scale(${(0.9 + 0.1 * appear).toFixed(3)})`, transformOrigin: '50% 100%',
        opacity: Math.min(1, appear * 1.5), textAlign: 'center', fontFamily: FONT, fontWeight: 800, color: '#fff', textShadow: SHADOW}}>
        {i === 0 ? (
          <>
            <div style={{marginBottom: 12}}><Tag /></div>
            <div style={{fontSize: 46, lineHeight: 1.16}}>{PER_HOOK}</div>
          </>
        ) : i <= POINTS.length ? (
          <div style={{fontSize: 54, lineHeight: 1.15}}><span style={{color: RED}}>{i}.</span> {POINTS[i - 1]}</div>
        ) : (
          <div style={{fontSize: 48, lineHeight: 1.16}}>{FINAL}</div>
        )}
      </div>
      <WordCaptions cards={PER_CARDS} total={PER_FRAMES} ready={ready} accent={RED} plate top={1330} size={60} />
    </AbsoluteFill>
  );
};

// обложка: спокойное лицо, губы сомкнуты, взгляд в камеру (кадр выбирается в tools/prepare_r45.py), хук внизу
export const PereobCover: React.FC<{img?: string}> = ({img = 'r45/cover.jpg'}) => {
  useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Img src={staticFile(img)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 52%, rgba(0,0,0,0.45) 78%, rgba(0,0,0,0.3) 100%)'}} />
      <div style={{position: 'absolute', top: 1250, left: 60, right: 60, textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 62, lineHeight: 1.16, color: '#fff', textShadow: SHADOW}}>
        <div style={{marginBottom: 18}}><Tag size={40} /></div>
        {PER_HOOK}
      </div>
    </AbsoluteFill>
  );
};
