import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {RED} from './SerijaReel';
import {useMontserrat, WordCaptions} from './WordCaptions';
import {NAYM_CARDS, NAYM_CUTS, NAYM_FRAMES, NAYM_HEADTOP, NAYM_JUMPS, NAYM_QUESTION} from './NaymCards';

// Рилс 46 (челлендж Лилии, день 10, 27.11): «Мне 42, и я до сих пор в найме».
// Два дубля в машине, крупный и средний план чередуются по блокам речи, паузы вырезаны (tools/prepare_r46.py).
// Вверху у головы: хук с первой секунды (внизу его не дублируем, куратор 26.11), в конце вопрос; внизу титры по словам
// (tools/cards_r46.py). Склейки внутри блока прячет смена крупности.

export {NAYM_FRAMES};
const GLOW = '0 2px 10px rgba(0,0,0,0.7), 0 0 3px rgba(0,0,0,0.85), 0 0 28px rgba(0,0,0,0.45)';
const FONT = 'Montserrat, "Noto Color Emoji", sans-serif';
export const NAYM_HOOK = 'Мне 42, и я до сих пор в найме';
const QUESTION = 'А вы в найме или на себя? И сколько вам лет? 👇';
const ALT = 0.06;
const HOOK_TO = 78; // хук держим 2,6 с, чтобы успели прочитать

export const NaymReel: React.FC = () => {
  const ready = useMontserrat();
  const f = useCurrentFrame();
  let i = 0;
  while (i < NAYM_CUTS.length - 2 && f >= NAYM_CUTS[i + 1]) i++;
  const punch = i === 0 ? 0 : interpolate(f, [NAYM_CUTS[i], NAYM_CUTS[i] + 5], [0.035, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const push = interpolate(f, [NAYM_CUTS[i], NAYM_CUTS[i + 1]], [0, 0.02], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const alt = NAYM_JUMPS.filter((j) => j > NAYM_CUTS[i] && j <= f).length % 2 === 1 ? ALT : 0;
  const sc = 1 + push + punch + alt;
  // текст над головой с зазором (куратор 26.11: не на лбу), по самому крупному плану блока
  const textBottom = 768 + (NAYM_HEADTOP[i] - 768) * (1.02 + ALT) - 26;
  const hookA = interpolate(f, [HOOK_TO - 8, HOOK_TO], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const qA = interpolate(f, [NAYM_QUESTION - 2, NAYM_QUESTION + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5))});
  const head = f < HOOK_TO ? {text: NAYM_HOOK, a: hookA, size: 62} : f >= NAYM_QUESTION - 2 ? {text: QUESTION, a: qA, size: 52} : null;
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile('r46/talk.mp4')} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${sc.toFixed(4)})`, transformOrigin: '50% 40%'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.22) 80%, rgba(0,0,0,0.05) 100%)'}} />
      {head ? (
        <div style={{position: 'absolute', top: textBottom, left: 50, right: 50, transform: `translateY(-100%) scale(${(0.9 + 0.1 * Math.min(1, head.a)).toFixed(3)})`, transformOrigin: '50% 100%',
          opacity: Math.min(1, head.a * 1.5), textAlign: 'center', fontFamily: FONT, fontWeight: 800, color: '#fff', textShadow: GLOW,
          fontSize: head.size, lineHeight: 1.15, textWrap: 'balance'} as React.CSSProperties}>
          {head.text === NAYM_HOOK ? (<>Мне 42,<br />и я до сих пор в найме</>) : head.text}
        </div>
      ) : null}
      <WordCaptions cards={NAYM_CARDS} total={NAYM_FRAMES} ready={ready} accent={RED} plate top={1330} size={60} />
    </AbsoluteFill>
  );
};

// обложка: спокойное лицо, губы сомкнуты, взгляд в камеру (кадры из пауз дублей t1 и t4), хук внизу на шубе
export const NaymCover: React.FC<{img?: string}> = ({img = 'r46/cover.jpg'}) => {
  useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Img src={staticFile(img)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 78%, rgba(0,0,0,0.25) 100%)'}} />
      <div style={{position: 'absolute', top: 1230, left: 60, right: 60, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 76, lineHeight: 1.12, color: '#fff', textShadow: GLOW}}>
        Мне 42,<br />и я до сих пор<br /><span style={{color: '#fff', background: RED, padding: '0 18px', borderRadius: 14, boxDecorationBreak: 'clone'} as React.CSSProperties}>в найме</span>
      </div>
    </AbsoluteFill>
  );
};
