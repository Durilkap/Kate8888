import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {RED} from './SerijaReel';
import {useMontserrat, WordCaptions} from './WordCaptions';
import {PROSHU_CARDS} from './ProshuCards';

// Рилс 37 «ПРОШУ» (челлендж Лилии, день 2, 18.11): три полных дубля Кати, по фразам с чередованием дублей
// (tools/prepare_r37.py), паузы между фразами убраны. На каждой склейке смена крупности и короткий толчок,
// кадр приближен (меньше потолка, Катя крупнее). Титры по словам на красных плашках (tools/cards_r37.py).

const GRADE = 'contrast(1.05) saturate(1.05) sepia(0.04) brightness(1.02)';
const CUTS = [0, 134, 267, 331, 452, 597, 657, 722, 844, 1038, 1221, 1313, 1443];
// дубли по кускам (для справки)
export const PROSHU_TAKES = ["t2", "t1", "t2", "t3", "t1", "t3", "t2", "t1", "t3", "t2", "t1", "t3"];
// крупность по куску: где Катя подходит к камере (0, 2, 5, 11), почти без приближения и с опорой на верх кадра,
// чтобы не резать голову; где стоит дальше, крупнее (меньше потолка)
const Z = [1.04, 1.22, 1.03, 1.28, 1.22, 1.0, 1.25, 1.2, 1.06, 1.25, 1.2, 1.0];
const ORIGIN = ['50% 5%', '50% 28%', '50% 5%', '50% 25%', '50% 28%', '50% 0%', '50% 25%', '50% 28%', '50% 5%', '50% 25%', '50% 28%', '50% 0%'];
export const PROSHU_FRAMES = 1443;

export const ProshuReel: React.FC = () => {
  const ready = useMontserrat();
  const f = useCurrentFrame();
  let i = 0;
  while (i < CUTS.length - 2 && f >= CUTS[i + 1]) i++;
  const base = Z[i];
  const push = Z[i] <= 1.04 ? 0 : interpolate(f, [CUTS[i], CUTS[i + 1]], [0, 0.03], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const punch = i === 0 ? 0 : interpolate(f, [CUTS[i], CUTS[i] + 5], [0.05, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const z = base + push + punch;
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile('r37/talk.mp4')}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z.toFixed(4)})`, transformOrigin: ORIGIN[i], filter: GRADE}}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.28) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 75%, rgba(0,0,0,0.05) 100%)'}} />
      <WordCaptions cards={PROSHU_CARDS} total={PROSHU_FRAMES} ready={ready} accent={RED} plate top={1180} />
    </AbsoluteFill>
  );
};
