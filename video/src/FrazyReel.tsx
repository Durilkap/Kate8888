import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {RED} from './SerijaReel';
import {SANS, useMontserrat, WordCaptions} from './WordCaptions';
import {FRAZY_CARDS, FRAZY_CUTS, FRAZY_FRAMES, FRAZY_HEADS} from './FrazyCards';

// Рилс 40 (челлендж Лилии, день 5, 21.11): «Фразы, после которых я обхожу человека за километр».
// Один дубль Кати дома (говорит и собирается), паузы убраны (tools/prepare_r40.py). На склейках смена крупности
// и короткий толчок. Сверху заголовок типажа «1/ ...» (как в примерах), снизу титры по словам (tools/cards_r40.py).

const GRADE = 'contrast(1.02) saturate(1.02)'; // основной свет и цвет в tools/prepare_r40.py (LIGHT)
export {FRAZY_FRAMES};

export const FrazyReel: React.FC = () => {
  const ready = useMontserrat();
  const f = useCurrentFrame();
  let i = 0;
  while (i < FRAZY_CUTS.length - 2 && f >= FRAZY_CUTS[i + 1]) i++;
  // чётные куски почти без приближения (голова у верха кадра), нечётные крупнее
  const base = i % 2 === 0 ? 1.0 : 1.12;
  const push = interpolate(f, [FRAZY_CUTS[i], FRAZY_CUTS[i + 1]], [0, 0.02], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const punch = i === 0 ? 0 : interpolate(f, [FRAZY_CUTS[i], FRAZY_CUTS[i] + 5], [0.04, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const z = base + push + punch;
  const head = FRAZY_HEADS.find((h) => f >= h.from && f < h.to);
  const hIn = head ? interpolate(f, [head.from, head.from + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile('r40/talk.mp4')}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z.toFixed(4)})`, transformOrigin: '50% 12%', filter: GRADE}}
      />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 75%, rgba(0,0,0,0.05) 100%)'}} />
      {head ? (
        <div style={{position: 'absolute', top: 150, left: 40, right: 40, display: 'flex', justifyContent: 'center', opacity: hIn, transform: `translateY(${(1 - hIn) * -14}px)`}}>
          <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 52, lineHeight: 1.15, color: '#111', background: '#fff', padding: '0.12em 0.45em 0.16em', borderRadius: '0.3em', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', whiteSpace: 'nowrap'}}>
            {head.t}
          </div>
        </div>
      ) : null}
      <WordCaptions cards={FRAZY_CARDS} total={FRAZY_FRAMES} ready={ready} accent={RED} plate top={1230} size={66} />
    </AbsoluteFill>
  );
};
