import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  continueRender,
  delayRender,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import VOICE from './weddingVoice.json';

// Рилс 14 «Как я стала девочкой. Часть пути к себе настоящей»: свадебные фото Кати (свадьба год назад).
// Муж, гости, ведущий, фотографы и свидетельство о браке размыты заранее (tools/prepare_wedding_photos.py).
// Голос Кати (запись 03.11) без длинных пауз, титры по её словам. Музыку Катя может добавить из библиотеки Instagram тихо под голос.

const YELLOW = '#FFD60A';
const SANS = 'Montserrat, "DejaVu Sans", sans-serif';
const FADE = 8;

// dur - длина кадра в старом 30-секундном монтаже, под голос растягивается по опорным точкам из weddingVoice.json;
// frames - длина видеокуска (кадров): если кадр стал длиннее, видео идёт чуть медленнее (не медленнее 0,6)
type Shot = {src: string; dur: number; z?: [number, number]; origin?: string; pos?: string; video?: boolean; frames?: number};

const W = (n: number) => `wed/w${String(n).padStart(2, '0')}.jpg`;

const M = (n: number) => `wed/m${n}.mp4`; // куски видео видеографа (без чужих лиц и марок)

const SHOTS: Shot[] = [
  {src: M(1), video: true, frames: 53, dur: 45, z: [1.0, 1.05]},
  {src: W(1), dur: 30, z: [1.0, 1.08], origin: '45% 40%'},
  {src: M(2), video: true, frames: 51, dur: 42, z: [1.0, 1.04]},
  {src: M(3), video: true, frames: 38, dur: 30, z: [1.04, 1.0]},
  {src: M(4), video: true, frames: 45, dur: 36, z: [1.0, 1.05]},
  {src: W(5), dur: 30, z: [1.7, 1.95], origin: '33% 38%'},
  {src: 'wed/v1.mp4', video: true, frames: 91, dur: 75, z: [1.0, 1.05]},
  {src: M(5), video: true, frames: 31, dur: 23, z: [1.04, 1.0]},
  {src: W(30), dur: 27, z: [1.0, 1.07]},
  {src: M(6), video: true, frames: 31, dur: 23, z: [1.0, 1.05]},
  {src: M(7), video: true, frames: 43, dur: 33, z: [1.04, 1.0]},
  {src: W(27), dur: 30, z: [1.0, 1.07]},
  {src: M(8), video: true, frames: 28, dur: 20, z: [1.04, 1.0]},
  {src: W(29), dur: 30, z: [1.06, 1.0]},
  {src: 'wed/v2.mp4', video: true, frames: 85, dur: 66, z: [1.0, 1.05]},
  {src: W(8), dur: 30, z: [1.0, 1.07], origin: '50% 35%'},
  {src: W(31), dur: 27, z: [1.06, 1.0]},
  {src: W(14), dur: 28, z: [1.0, 1.06]},
  {src: W(17), dur: 28, z: [1.0, 1.08], origin: '50% 30%'},
  {src: W(19), dur: 33, z: [1.0, 1.1], origin: '50% 80%'},
  {src: W(13), dur: 27, z: [1.0, 1.08]},
  {src: W(25), dur: 33, z: [1.06, 1.0]},
  {src: W(22), dur: 28, z: [1.0, 1.06]},
  {src: W(24), dur: 38, z: [1.0, 1.1], origin: '50% 45%'}, // салют: «девочкой»
  {src: W(18), dur: 50, z: [1.0, 1.08], origin: '50% 70%'}, // туфли, шаг: «часть пути»
  {src: W(7), dur: 38, z: [1.06, 1.0], origin: '50% 40%'}, // в платье в полный рост: «Я Екатерина»
];
const OLD = SHOTS.reduce<number[]>((a, s, i) => [...a, i === 0 ? 0 : a[i - 1] + SHOTS[i - 1].dur], []);
export const WEDDING_FRAMES = VOICE.total;
const warp = (x: number) =>
  Math.round(interpolate(x, VOICE.anchors.map((a) => a[0]), VOICE.anchors.map((a) => a[1]), {extrapolateRight: 'clamp'}));
const STARTS = OLD.map(warp);
const DURS = STARTS.map((st, i) => (i + 1 < STARTS.length ? STARTS[i + 1] : WEDDING_FRAMES) - st);
const SLOW = 0.6; // замедленные копии видео (tools/slow_wedding_clips.py)
const RATES = SHOTS.map((s, i) => (s.frames ? Math.min(1, Math.max(SLOW, (s.frames - 1) / (DURS[i] + FADE))) : 1));
// видео, которому не хватает длины, берём из плавной копии 0,6 и играем быстрее на rate / 0,6
const SRC = SHOTS.map((s, i) => (RATES[i] < 0.97 ? s.src.replace('.mp4', '_slow.mp4') : s.src));
const PLAY = RATES.map((r) => (r < 0.97 ? r / SLOW : 1));

// Титры: слова Кати по её записи (scenarii/rils-15-put-k-devochke.md), каждое слово появляется, когда она его произносит.
// Тайминги и голос готовит tools/prepare_wedding_voice.py (src/weddingVoice.json, public/wed/voice.wav).
type Word = {t: string; at: number; a: boolean};
type Card = {from: number; full: boolean; lines: {big: boolean; words: Word[]}[]};
const CARDS = VOICE.cards as Card[];
const MAXW = 880;
const BASE = 94;
const BIG = 132;
const SHADOW = '0 4px 10px rgba(0,0,0,0.55), 0 8px 34px rgba(0,0,0,0.6)';

let ctx: CanvasRenderingContext2D | null = null;
const fit = (text: string, base: number) => {
  if (typeof document === 'undefined') return base;
  ctx = ctx ?? document.createElement('canvas').getContext('2d');
  if (!ctx) return base;
  ctx.font = `800 ${base}px ${SANS}`;
  const w = ctx.measureText(text).width;
  return w > MAXW ? Math.floor((base * MAXW) / w) : base;
};

const Caption: React.FC<{c: Card; dur: number; ready: boolean}> = ({c, dur, ready}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(f, [dur - 4, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div
        style={{
          position: 'absolute',
          top: 1030,
          height: 470,
          left: 60,
          right: 110,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: SANS,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          textAlign: 'center',
        }}
      >
        {c.lines.map((l, i) => {
          const base = l.big ? BIG : BASE;
          const size = ready ? fit(l.words.map((w) => w.t).join(' '), base) : base;
          return (
            <div key={i} style={{fontSize: size, lineHeight: 1.1, whiteSpace: 'nowrap'}}>
              {l.words.map((w, j) => {
                const rel = w.at - c.from;
                const p = c.full ? 1 : spring({frame: f - rel + 2, fps, config: {damping: 13, stiffness: 190, mass: 0.6}});
                const o = c.full ? 1 : interpolate(f, [rel - 2, rel + 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
                return (
                  <span
                    key={j}
                    style={{
                      display: 'inline-block',
                      marginRight: j + 1 < l.words.length ? '0.24em' : 0,
                      color: w.a ? YELLOW : '#fff',
                      WebkitTextStroke: '5px rgba(0,0,0,0.78)',
                      paintOrder: 'stroke fill',
                      textShadow: SHADOW,
                      opacity: o,
                      transform: `translateY(${(1 - p) * 16}px) scale(${0.72 + 0.28 * p})`,
                    }}
                  >
                    {w.t}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const cyr = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
    const lat = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD';
    const f = (file: string, range: string) =>
      new FontFace('Montserrat', `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight: '800', style: 'normal', unicodeRange: range});
    const faces = [f('montserrat-cyrillic-800-normal.woff2', cyr), f('montserrat-latin-800-normal.woff2', lat)];
    Promise.all(faces.map((x) => x.load()))
      .then((loaded) => {
        loaded.forEach((x) => document.fonts.add(x));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  return ready;
};

const Photo: React.FC<{s: Shot; dur: number; first: boolean; rate: number}> = ({s, dur, first, rate}) => {
  const f = useCurrentFrame();
  const [z0, z1] = s.z ?? [1, 1.06];
  const scale = interpolate(f, [0, dur + FADE], [z0, z1], {easing: Easing.inOut(Easing.sin)});
  const fadeIn = first ? 1 : interpolate(f, [0, FADE], [0, 1], {extrapolateRight: 'clamp'});
  const blur = first ? 0 : interpolate(f, [0, FADE], [6, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: fadeIn, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${scale})`, transformOrigin: s.origin ?? '50% 50%', filter: `blur(${blur}px)`}}>
        {s.video ? (
          <OffthreadVideo
            src={staticFile(s.src)}
            muted
            playbackRate={rate}
            style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.04) saturate(1.04) sepia(0.06) brightness(1.02)'}}
          />
        ) : (
          <Img
            src={staticFile(s.src)}
            style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: s.pos ?? '50% 50%', filter: 'contrast(1.04) saturate(1.04) sepia(0.06) brightness(1.02)'}}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const WeddingReel: React.FC = () => {
  const ready = useFonts();
  const last = SHOTS.length - 1;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={STARTS[i]} durationInFrames={DURS[i] + (i < last ? FADE : 0)}>
          <Photo s={{...s, src: SRC[i]}} dur={DURS[i]} first={i === 0} rate={PLAY[i]} />
        </Sequence>
      ))}
      <AbsoluteFill
        style={{background: 'linear-gradient(to top, rgba(0,0,0,0) 12%, rgba(0,0,0,0.5) 22%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0) 57%)'}}
      />
      {CARDS.map((c, i) => {
        const to = i + 1 < CARDS.length ? CARDS[i + 1].from : WEDDING_FRAMES;
        return (
          <Sequence key={`c${i}`} from={c.from} durationInFrames={to - c.from}>
            <Caption c={c} dur={i + 1 < CARDS.length ? to - c.from : to - c.from + 12} ready={ready} />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.35) 100%)'}} />
      <Audio src={staticFile('wed/voice.wav')} />
    </AbsoluteFill>
  );
};
