import React from 'react';
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {RED} from './SerijaReel';
import {useMontserrat, WordCaptions} from './WordCaptions';
import {VYBIRAYTE_CARDS} from './VybirayteCards';

// Рилс 34 «Мужчины, выбирайте» (16.11): «Разговоры в машине», дубль 3 Кати (договорён до конца, со словами Кати
// про «уровень жизни»). Паузы ужаты, на каждой склейке смена крупности, потолок машины срезан, громкость выровнена
// (tools/prepare_r34.py -> public/r34/talk.mp4, cuts.json). Титры по словам на красных плашках (src/VybirayteCards.ts).

const GRADE = 'contrast(1.05) saturate(1.04) sepia(0.05) brightness(1.02)';
// склейки talk.mp4 (кадры, public/r34/cuts.json)
const CUTS = [0, 61, 146, 280, 326, 439, 585, 689, 719, 767, 807, 832, 889, 940, 980, 1126, 1171];
const Z = [1.24, 1.38];
export const VYBIRAYTE_FRAMES = 1171;

export const VybirayteReel: React.FC = () => {
  const ready = useMontserrat();
  const f = useCurrentFrame();
  const i = Math.max(0, CUTS.findIndex((c, k) => f >= c && f < CUTS[k + 1]));
  const base = Z[i % 2];
  const z = interpolate(f, [CUTS[i], CUTS[i + 1] ?? CUTS[i] + 1], [base, base + 0.04], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile('r34/talk.mp4')}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z.toFixed(4)})`, transformOrigin: '50% 60%', filter: GRADE}}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.3) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.3) 78%, rgba(0,0,0,0.1) 100%)'}} />
      <WordCaptions cards={VYBIRAYTE_CARDS} total={VYBIRAYTE_FRAMES} ready={ready} accent={RED} plate top={1250} />
    </AbsoluteFill>
  );
};
