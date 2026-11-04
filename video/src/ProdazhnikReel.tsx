import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import DA from './prodazhnik_a.json';
import DB from './prodazhnik_b.json';
import {Card, useMontserrat, WordCaptions} from './WordCaptions';

// Рилс 16 «Хороший продажник сейчас это роскошь»: Катя говорит на камеру в машине (стоянка).
// Монтаж и титры по её словам готовит tools/prepare_prodazhnik.py: вариант a (первый дубль) и b (второй дубль),
// src/prodazhnik_a.json, src/prodazhnik_b.json, public/r16/.
// Фото с корпоратива (tools/prepare_corporate_photos.py): логотип, значок, текст грамоты кроме слова «ГРАМОТА», гости размыты.

type Clip = {take: string; from: number; len: number; at: number};
type Photo = {src: string; from: number; to: number};
type Data = {total: number; clips: Clip[]; cards: Card[]; photos: Photo[]; levels: number[]; capTop: number; voice: string};
export const PRODAZHNIK_A_FRAMES = DA.total;
export const PRODAZHNIK_B_FRAMES = DB.total;

// Крупность лица меняется рывком на каждом втором экране титров (живой монтаж разговорного видео)
const zoomAt = (d: Data, f: number) => {
  const cards = d.cards;
  let i = 0;
  while (i + 1 < cards.length && cards[i + 1].from <= f) i++;
  const k = Math.floor(i / 2);
  const prevStart = cards[k * 2].from;
  const cur = d.levels[k % d.levels.length];
  const prev = k > 0 ? d.levels[(k - 1) % d.levels.length] : cur;
  return interpolate(f, [prevStart, prevStart + 4], [prev, cur], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
};

const Talk: React.FC<{c: Clip; d: Data}> = ({c, d}) => {
  const f = useCurrentFrame();
  const z = zoomAt(d, c.at + f) * interpolate(f, [0, c.len], [1, 1.02]);
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

const PhotoInsert: React.FC<{p: Photo; total: number}> = ({p, total}) => {
  const f = useCurrentFrame();
  const dur = p.to - p.from;
  const o = interpolate(f, [0, 4, dur - 4, dur], [0, 1, 1, p.to >= total ? 1 : 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // грамота: плавно приближаемся, чтобы читалось слово «ГРАМОТА»
  const [z0, z1, origin]: [number, number, string] = p.src.endsWith('k3.jpg') ? [1.0, 1.45, '55% 39%'] : p.src.endsWith('k1.jpg') ? [1.0, 1.08, '45% 50%'] : [1.0, 1.08, '50% 30%'];
  const s = interpolate(f, [0, dur], [z0, z1], {easing: Easing.inOut(Easing.sin)});
  return (
    <AbsoluteFill style={{opacity: o, overflow: 'hidden', backgroundColor: '#000'}}>
      <Img src={staticFile(p.src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})`, transformOrigin: origin}} />
    </AbsoluteFill>
  );
};

const Reel: React.FC<{d: Data}> = ({d}) => {
  const ready = useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {d.clips.map((c, i) => (
        <Sequence key={i} from={c.at} durationInFrames={i + 1 < d.clips.length ? c.len : d.total - c.at}>
          <Talk c={c} d={d} />
        </Sequence>
      ))}
      {d.photos.map((p, i) => (
        <Sequence key={`p${i}`} from={p.from} durationInFrames={p.to - p.from}>
          <PhotoInsert p={p} total={d.total} />
        </Sequence>
      ))}
      <AbsoluteFill
        style={{background: 'linear-gradient(to top, rgba(0,0,0,0) 10%, rgba(0,0,0,0.45) 20%, rgba(0,0,0,0.45) 43%, rgba(0,0,0,0) 55%)'}}
      />
      <WordCaptions cards={d.cards} total={d.total} ready={ready} top={d.capTop} />
      <Audio src={staticFile(d.voice)} />
    </AbsoluteFill>
  );
};

export const ProdazhnikA: React.FC = () => <Reel d={DA as Data} />;
export const ProdazhnikB: React.FC = () => <Reel d={DB as Data} />;
