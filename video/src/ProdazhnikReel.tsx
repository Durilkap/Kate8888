import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import D from './prodazhnik.json';
import {Card, useMontserrat, WordCaptions} from './WordCaptions';

// Рилс 16 «Хороший продажник сейчас это роскошь»: Катя говорит на камеру в машине (стоянка).
// Монтаж и титры по её словам готовит tools/prepare_prodazhnik.py (src/prodazhnik.json, public/r16/).
// Фото с корпоратива (tools/prepare_corporate_photos.py): логотип, значок, текст грамоты кроме слова «ГРАМОТА», гости размыты.

type Clip = {take: string; from: number; len: number; at: number; zoom: number};
type Photo = {src: string; from: number; to: number};
const CLIPS = D.clips as Clip[];
const CARDS = D.cards as Card[];
const PHOTOS = D.photos as Photo[];
export const PRODAZHNIK_FRAMES = D.total;

// Крупность лица меняется рывком на каждом втором экране титров (живой монтаж разговорного видео)
const LEVELS = [1.22, 1.34, 1.26, 1.38];
const zoomAt = (f: number) => {
  let i = 0;
  while (i + 1 < CARDS.length && CARDS[i + 1].from <= f) i++;
  const k = Math.floor(i / 2);
  const prevStart = CARDS[k * 2].from;
  const cur = LEVELS[k % LEVELS.length];
  const prev = k > 0 ? LEVELS[(k - 1) % LEVELS.length] : cur;
  return interpolate(f, [prevStart, prevStart + 4], [prev, cur], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
};

const Talk: React.FC<{c: Clip}> = ({c}) => {
  const f = useCurrentFrame();
  const z = zoomAt(c.at + f) * interpolate(f, [0, c.len], [1, 1.02]);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile(`r16/${c.take}.mp4`)}
        startFrom={c.from}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, transformOrigin: '50% 100%', filter: 'contrast(1.04) saturate(1.05)'}}
      />
    </AbsoluteFill>
  );
};

const PhotoInsert: React.FC<{p: Photo}> = ({p}) => {
  const f = useCurrentFrame();
  const dur = p.to - p.from;
  const o = interpolate(f, [0, 4, dur - 4, dur], [0, 1, 1, p.to >= PRODAZHNIK_FRAMES ? 1 : 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // грамота: плавно приближаемся, чтобы читалось слово «ГРАМОТА»
  const [z0, z1, origin]: [number, number, string] = p.src.endsWith('k3.jpg') ? [1.0, 1.45, '55% 39%'] : p.src.endsWith('k1.jpg') ? [1.0, 1.08, '45% 50%'] : [1.0, 1.08, '50% 30%'];
  const s = interpolate(f, [0, dur], [z0, z1], {easing: Easing.inOut(Easing.sin)});
  return (
    <AbsoluteFill style={{opacity: o, overflow: 'hidden', backgroundColor: '#000'}}>
      <Img src={staticFile(p.src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})`, transformOrigin: origin}} />
    </AbsoluteFill>
  );
};

export const ProdazhnikReel: React.FC = () => {
  const ready = useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {CLIPS.map((c, i) => (
        <Sequence key={i} from={c.at} durationInFrames={i + 1 < CLIPS.length ? c.len : PRODAZHNIK_FRAMES - c.at}>
          <Talk c={c} />
        </Sequence>
      ))}
      {PHOTOS.map((p, i) => (
        <Sequence key={`p${i}`} from={p.from} durationInFrames={p.to - p.from}>
          <PhotoInsert p={p} />
        </Sequence>
      ))}
      <AbsoluteFill
        style={{background: 'linear-gradient(to top, rgba(0,0,0,0) 12%, rgba(0,0,0,0.45) 22%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 57%)'}}
      />
      <WordCaptions cards={CARDS} total={PRODAZHNIK_FRAMES} ready={ready} />
      <Audio src={staticFile('r16/voice.wav')} />
    </AbsoluteFill>
  );
};
