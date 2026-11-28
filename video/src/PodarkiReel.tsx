import React from 'react';
import {AbsoluteFill, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {RED} from './SerijaReel';
import {useMontserrat} from './WordCaptions';

// Рилс 47 (челлендж Лилии, день 11, 28.11): видео около 7 с без голоса, хук по центру, смысл в описании (5 правил + ПРОШУ).
// Кадры Кати: она с цветами в начале и в конце, между ними цветы и подарки (tools/prepare_r47.py). Музыку Катя ставит в Instagram.

const FONT = 'Montserrat, "Noto Color Emoji", sans-serif';
const SHOTS: {src: string; kind: 'img' | 'vid'; len: number}[] = [
  {src: 'r47/roses_car.jpg', kind: 'img', len: 42},
  {src: 'r47/roses.mp4', kind: 'vid', len: 24},
  {src: 'r47/ring.mp4', kind: 'vid', len: 27},
  {src: 'r47/white.jpg', kind: 'img', len: 21},
  {src: 'r47/heart.mp4', kind: 'vid', len: 27},
  {src: 'r47/box.jpg', kind: 'img', len: 18},
  {src: 'r47/bears.jpg', kind: 'img', len: 18},
  {src: 'r47/tulips.jpg', kind: 'img', len: 42},
];
export const PODARKI_FRAMES = SHOTS.reduce((s, x) => s + x.len, 0);

const Shot: React.FC<{src: string; kind: 'img' | 'vid'; len: number}> = ({src, kind, len}) => {
  const f = useCurrentFrame();
  const sc = interpolate(f, [0, len], [1.0, 1.06]); // лёгкий наезд, чтобы фото жили
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${sc.toFixed(4)})`};
  return kind === 'img' ? <Img src={staticFile(src)} style={style} /> : <OffthreadVideo src={staticFile(src)} muted style={style} />;
};

export const PodarkiReel: React.FC = () => {
  useMontserrat();
  let at = 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      {SHOTS.map((s, i) => {
        const from = at;
        at += s.len;
        return (
          <Sequence key={i} from={from} durationInFrames={s.len}>
            <Shot {...s} />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.35) 62%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0.1) 100%)'}} />
      <div style={{position: 'absolute', top: 1110, left: 70, right: 70, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 56, lineHeight: 1.18,
        color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.7), 0 0 3px rgba(0,0,0,0.85)', textWrap: 'balance'} as React.CSSProperties}>
        Мне дарят цветы и подарки <span style={{background: RED, padding: '0 12px', borderRadius: 10}}>без повода</span> не потому, что повезло с мужем, а потому что я поняла эти 5 правил 👇
      </div>
    </AbsoluteFill>
  );
};
