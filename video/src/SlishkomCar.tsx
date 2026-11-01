import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import data from './slishkomCar.json';

// Рилс 12 «Слишком» в машине: Катя говорит на камеру. Монтаж без пауз (tools/prepare_slishkom_car.py),
// зумы в лицо, субтитры по словам, хук сверху, засвеченные куски заменены крупным текстом.

type Word = {text: string; gold: boolean; f: number};
type Piece = {from: number; to: number; kind: 'hook' | 'video' | 'card'; chunks: Word[][]; sizes?: number[]};

const PIECES = data.pieces as Piece[];
const EDIT = data.editFrames as number;
const HOLD = 39;
export const SLISHKOM_CAR_FRAMES = EDIT + HOLD;

const GOLD = '#f6dca4';
// Лицо в кадре 1080x1920 (по кадрам исходника) и куда его ставить при зуме.
const FACE = {x: 724, y: 998};
const TARGET = {x: 540, y: 790};

type Z = {s0: number; s1: number; bump?: number[]; inout?: boolean};
const ZOOM: (Z | null)[] = [
  {s0: 1.22, s1: 1.3}, // А вам говорили когда-нибудь о том,
  {s0: 1.36, s1: 1.44, bump: [2]}, // что вы «слишком»?
  {s0: 1.55, s1: 1.6}, // Мне говорили.
  {s0: 1.22, s1: 1.3},
  {s0: 1.52, s1: 1.58},
  {s0: 1.26, s1: 1.34, bump: [7]},
  {s0: 1.1, s1: 1.18},
  {s0: 1.4, s1: 1.46, bump: [3]},
  {s0: 1.62, s1: 1.66},
  {s0: 1.22, s1: 1.3, bump: [5]},
  {s0: 1.62, s1: 1.06, inout: true}, // «я уменьшалась»: кадр уменьшается вместе со словом
  {s0: 1.26, s1: 1.4},
  null,
  {s0: 1.5, s1: 1.58, bump: [2]},
  null,
  null,
  {s0: 1.16, s1: 1.34, bump: [4]},
  null,
  null,
  {s0: 1.3, s1: 1.48, bump: [2]}, // шлите таких людей...
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const pieceAt = (f: number) => {
  for (let i = 0; i < PIECES.length; i++) if (f >= PIECES[i].from && f < PIECES[i].to) return i;
  return PIECES.length - 1;
};

// Доля «карточки» (размытие и затемнение видео): въезд 5 кадров, выезд 8 кадров в следующий кусок.
const cardMix = (f: number) => {
  let m = 0;
  PIECES.forEach((p, i) => {
    if (p.kind !== 'card') return;
    const nextCard = PIECES[i + 1]?.kind === 'card';
    const prevCard = PIECES[i - 1]?.kind === 'card';
    let v = 0;
    if (i === PIECES.length - 1 && f >= p.to) v = 1; // последняя карточка держится до конца (подпись)
    else if (f >= p.from && f < p.to) v = prevCard ? 1 : Math.min(1, (f - p.from + 1) / 5);
    else if (!nextCard && f >= p.to && f < p.to + 8) v = 1 - (f - p.to + 1) / 8;
    m = Math.max(m, v);
  });
  return clamp(m, 0, 1);
};

const videoScale = (f: number) => {
  if (f >= EDIT) {
    return interpolate(f, [EDIT, EDIT + HOLD], [1.5, 1.57], {extrapolateRight: 'clamp'});
  }
  const i = pieceAt(f);
  const p = PIECES[i];
  const z = ZOOM[i];
  const lf = f - p.from;
  const dur = p.to - p.from;
  if (!z) {
    return interpolate(f, [p.from, p.to], [1.32, 1.4]);
  }
  let s = interpolate(lf, [0, dur], [z.s0, z.s1], {
    easing: z.inout ? Easing.inOut(Easing.cubic) : Easing.bezier(0.22, 0.61, 0.36, 1),
    extrapolateRight: 'clamp',
  });
  if (i === 0) s += 0.32 * Math.pow(Math.max(0, 1 - lf / 14), 3); // въезд в первый кадр
  else s *= 1 + 0.06 * Math.pow(Math.max(0, 1 - lf / 7), 2); // толчок на склейке
  for (const wi of z.bump ?? []) {
    const d = f - p.chunks.flat()[wi].f;
    const k = d < 0 ? 0 : d < 4 ? d / 4 : Math.exp(-(d - 4) / 7);
    s *= 1 + 0.07 * k;
  }
  return s;
};

const Video: React.FC = () => {
  const f = useCurrentFrame();
  const s = videoScale(f);
  const dx = clamp(TARGET.x - FACE.x * s, 1080 - 1080 * s, 0);
  const dy = clamp(TARGET.y - FACE.y * s, 1920 - 1920 * s, 0);
  const i = pieceAt(f);
  const lf = f - PIECES[i].from;
  const cutBlur = i > 0 && PIECES[i].kind !== 'card' && f < EDIT ? 3 * Math.pow(Math.max(0, 1 - lf / 6), 2) : 0;
  const m = cardMix(f);
  const end = f >= EDIT ? (f - EDIT) / HOLD : 0;
  const blur = cutBlur + 18 * m + 6 * end;
  const bright = 1.02 - 0.58 * m - 0.12 * end;
  const v = <OffthreadVideo src={staticFile('car/edit.mp4')} muted style={{width: 1080, height: 1920}} />;
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          transformOrigin: '0 0',
          transform: `translate(${dx}px, ${dy}px) scale(${s})`,
          filter: `blur(${blur}px) brightness(${bright}) contrast(1.07) saturate(${1.08 + 0.15 * m})`,
        }}
      >
        {f < EDIT ? v : <Freeze frame={EDIT - 1}>{v}</Freeze>}
      </div>
    </AbsoluteFill>
  );
};

// Слово хука: весь вопрос виден с первого кадра, сказанное слово ярче и чуть «подпрыгивает».
const HookWord: React.FC<{w: Word; size: number; weight: number; delay: number; big?: boolean}> = ({w, size, weight, delay, big}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: f + 14 - delay, fps, config: {damping: 14, stiffness: 170, mass: 0.6}});
  const said = f >= w.f;
  const pop = said ? Math.pow(Math.max(0, 1 - (f - w.f) / 9), 2) : 0;
  return (
    <span
      style={{
        display: 'inline-block',
        margin: '0 0.14em',
        fontSize: size,
        fontWeight: weight,
        color: w.gold ? GOLD : '#fff',
        opacity: enter * (said || big ? 1 : 0.7),
        transform: `translateY(${(1 - enter) * -24}px) scale(${1 + (big ? 0.14 : 0.1) * pop})`,
      }}
    >
      {w.text}
    </span>
  );
};

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const end = PIECES[3].from + 10;
  if (f >= end) return null;
  const out = interpolate(f, [end - 10, end], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rule = interpolate(f, [PIECES[1].chunks[1][0].f, PIECES[1].chunks[1][0].f + 14], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const w0 = PIECES[0].chunks.flat();
  const [l2b, l3] = PIECES[1].chunks;
  const lines = [w0.slice(0, 4), [...w0.slice(4), ...l2b]];
  return (
    <AbsoluteFill style={{opacity: out, transform: `translateY(${(1 - out) * -40}px)`}}>
      <AbsoluteFill
        style={{background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 24%, rgba(0,0,0,0) 40%)'}}
      />
      <div
        style={{
          position: 'absolute',
          top: 190,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.12,
          textShadow: '0 4px 26px rgba(0,0,0,0.55)',
        }}
      >
        {lines.map((ln, li) => (
          <div key={li} style={{whiteSpace: 'nowrap'}}>
            {ln.map((w, k) => (
              <HookWord key={k} w={w} size={58} weight={700} delay={li * 3} />
            ))}
          </div>
        ))}
        <div style={{whiteSpace: 'nowrap'}}>
          {l3.map((w, k) => (
            <HookWord key={k} w={{...w, text: w.text.toUpperCase()}} size={118} weight={900} delay={6} big />
          ))}
        </div>
        <div style={{width: 380 * rule, height: 4, background: GOLD, margin: '14px auto 0', borderRadius: 2}} />
      </div>
    </AbsoluteFill>
  );
};

const WordPop: React.FC<{w: Word; size: number; weight: number; color?: string}> = ({w, size, weight, color}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = f < w.f ? 0 : spring({frame: f - w.f, fps, config: {damping: 14, stiffness: 230, mass: 0.5}});
  return (
    <span
      style={{
        display: 'inline-block',
        margin: '0 0.14em',
        fontSize: size,
        fontWeight: weight,
        color: color ?? (w.gold ? GOLD : '#fff'),
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * 26}px) scale(${0.72 + 0.28 * p})`,
      }}
    >
      {w.text}
    </span>
  );
};

// Субтитры к кускам с лицом: фраза держится до следующей фразы (но не дольше конца куска плюс 10 кадров).
type Sub = {words: Word[]; from: number; to: number};
const SUBS: Sub[] = [];
PIECES.forEach((p, i) => {
  if (p.kind !== 'video') return;
  p.chunks.forEach((ch, c) => {
    const nextInPiece = p.chunks[c + 1]?.[0]?.f;
    const next = PIECES[i + 1];
    let to = nextInPiece ?? (next ? (next.kind === 'card' ? p.to : Math.min(next.chunks[0][0].f, p.to + 10)) : p.to);
    if (!next && nextInPiece === undefined) to = EDIT;
    SUBS.push({words: ch, from: ch[0].f - 1, to});
  });
});

const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const sub = SUBS.find((s) => f >= s.from && f < s.to);
  if (!sub) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 1250,
        left: 90,
        right: 90,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        lineHeight: 1.14,
        fontFamily: 'Inter, sans-serif',
        textShadow: '0 3px 18px rgba(0,0,0,0.7), 0 0 3px rgba(0,0,0,0.6)',
      }}
    >
      {sub.words.map((w, k) => (
        <WordPop key={`${sub.from}-${k}`} w={w} size={78} weight={800} />
      ))}
    </div>
  );
};

const fit = (text: string, size: number) => Math.min(size, Math.floor(940 / (text.length * 0.72)));

const Card: React.FC = () => {
  const f = useCurrentFrame();
  const tail = (k: number) => (k === PIECES.length - 1 ? HOLD : PIECES[k + 1].kind === 'card' ? 0 : 8);
  const i = PIECES.findIndex((p, k) => p.kind === 'card' && f >= p.from && f < p.to + tail(k));
  if (i < 0) return null;
  const p = PIECES[i];
  const last = i === PIECES.length - 1;
  const [small, big, wrap] = p.sizes ?? [96, 170, 0];
  const out = f >= p.to && !last ? 1 - (f - p.to + 1) / 8 : 1;
  const flash = PIECES[i - 1]?.kind === 'card' ? 0.18 : 0.38;
  const lf = f - p.from;
  const [line1, line2] = p.chunks;
  return (
    <AbsoluteFill style={{opacity: out}}>
      <AbsoluteFill style={{backgroundColor: '#fff', opacity: flash * Math.pow(Math.max(0, 1 - lf / 6), 2)}} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          textShadow: '0 6px 40px rgba(0,0,0,0.45)',
          transform: `scale(${interpolate(lf, [0, p.to - p.from], [1, 1.05])})`,
        }}
      >
        <div style={{lineHeight: 1.08}}>
          <div>
            {line1.map((w, k) => (
              <WordPop key={k} w={w} size={small} weight={700} color="#fff" />
            ))}
          </div>
          {wrap ? (
            <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 940, margin: '0 auto'}}>
              {line2.map((w, k) => (
                <WordPop key={k} w={{...w, text: w.text.toUpperCase()}} size={big} weight={900} color={GOLD} />
              ))}
            </div>
          ) : (
            line2.map((w, k) => (
              <div key={k}>
                <WordPop w={w} size={fit(w.text, big)} weight={900} color={GOLD} />
              </div>
            ))
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const NameCard: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < EDIT) return null;
  const lf = f - EDIT;
  const p = spring({frame: lf - 2, fps, config: {damping: 16, stiffness: 120, mass: 0.7}});
  const line = interpolate(lf, [4, 20], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingTop: 640, fontFamily: 'Inter, sans-serif', color: '#fff'}}>
      <div style={{width: 320 * line, height: 3, backgroundColor: GOLD, marginBottom: 30}} />
      <div style={{fontSize: 72, fontWeight: 300, letterSpacing: '0.2em', opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>
        Екатерина
      </div>
    </AbsoluteFill>
  );
};

export const SlishkomCar: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <Video />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.42) 100%)'}} />
    <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(0,0,0,0) 16%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0) 46%)'}} />
    <Hook />
    <Subtitles />
    <Card />
    <NameCard />
    <Audio src={staticFile('car/voice.wav')} />
  </AbsoluteFill>
);
