import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {RED} from './SerijaReel';
import {SANS, useMontserrat, WordCaptions} from './WordCaptions';
import {KOMM_CARDS, KOMM_CUTS, KOMM_FRAMES, KOMM_HEAD, KOMM_HEAD_TO, KOMM_HEADTOP, KOMM_SCHED} from './KommCards';

// Рилс 44 (челлендж Лилии, день 8, формат «Threads» на своих комментариях, 25.11): Катя в машине читает комментарии
// под «Мужчины, выбирайте». Лучшие куски из дублей 1 и 3 (tools/prepare_r44.py). Вверху вопрос (только во вступлении),
// затем карточка читаемого комментария (ники и аватарки закрыты), внизу титры по словам (tools/cards_r44.py).

export {KOMM_FRAMES};
const SHADOW = '0 2px 10px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.6)';

export const KommReel: React.FC = () => {
  const ready = useMontserrat();
  const f = useCurrentFrame();
  let i = 0;
  while (i < KOMM_CUTS.length - 2 && f >= KOMM_CUTS[i + 1]) i++;
  const punch = i === 0 ? 0 : interpolate(f, [KOMM_CUTS[i], KOMM_CUTS[i] + 5], [0.035, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const push = interpolate(f, [KOMM_CUTS[i], KOMM_CUTS[i + 1]], [0, 0.02], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const headA = interpolate(f, [KOMM_HEAD_TO - 8, KOMM_HEAD_TO], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const card = KOMM_SCHED.find((c) => f >= c.from && f < c.to);
  // куратор 25.11: текст сверху вплотную к голове (низ текста на 22 px выше макушки куска), с учётом приближения кадра
  const sc = 1 + push + punch;
  const headY = 768 + (KOMM_HEADTOP[i] - 768) * sc;
  const textBottom = headY + 22;
  const cIn = card ? interpolate(f, [card.from, card.from + 7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))}) : 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile('r44/talk.mp4')} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${sc.toFixed(4)})`, transformOrigin: '50% 40%'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.25) 78%, rgba(0,0,0,0.05) 100%)'}} />
      {headA > 0 ? (
        <div style={{position: 'absolute', top: textBottom, left: 70, right: 70, transform: 'translateY(-100%)', textAlign: 'center', fontFamily: 'Montserrat, "Noto Color Emoji", sans-serif', fontWeight: 800, fontSize: 52, lineHeight: 1.18, color: '#fff', textShadow: SHADOW, opacity: headA}}>
          {KOMM_HEAD}
        </div>
      ) : null}
      {card ? (
        <div style={{position: 'absolute', top: textBottom, left: 40, width: 1000, transform: `translateY(-100%) scale(${(0.85 + 0.15 * cIn).toFixed(3)})`, transformOrigin: '50% 100%', opacity: Math.min(1, cIn * 1.5), filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.35))'}}>
          <Img src={staticFile(`r44/c${card.n}.png`)} style={{width: '100%', display: 'block'}} />
        </div>
      ) : null}
      <WordCaptions cards={KOMM_CARDS} total={KOMM_FRAMES} ready={ready} accent={RED} plate top={1300} size={60} />
    </AbsoluteFill>
  );
};

// обложка: дубль 2 на 0,3 с (спокойное лицо, губы сомкнуты, взгляд в камеру), приближено; вопрос внизу на мехе
export const KommCover: React.FC = () => {
  useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Img src={staticFile('r44/cover.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.3) 100%)'}} />
      <div style={{position: 'absolute', top: 1330, left: 60, right: 60, textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 62, lineHeight: 1.16, color: '#fff', textShadow: SHADOW}}>
        {KOMM_HEAD}
      </div>
    </AbsoluteFill>
  );
};
