import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import chat from './syn_chat.json';

// Рилс про сына (15 лет) по референсу Кати (08.11): тихие белые титры по центру без плашки,
// тёплый приглушённый цвет. Дверь с букетом, переписка (сообщения появляются по одному),
// фото, замедленное кружение с шарами «15». Без звука: музыку Катя добавит сама.

const FONT = 'Inter, "DejaVu Sans", sans-serif';
const FOLDER = 'r21';

const useInter = () => {
  const [handle] = useState(() => delayRender('inter'));
  useEffect(() => {
    const cyr = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
    const lat = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD';
    const f = (file: string, range: string) =>
      new FontFace('Inter', `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight: '600', style: 'normal', unicodeRange: range});
    const faces = [f('inter-cyrillic-600-normal.woff2', cyr), f('inter-latin-600-normal.woff2', lat)];
    Promise.all(faces.map((x) => x.load()))
      .then((loaded) => {
        loaded.forEach((x) => document.fonts.add(x));
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
};

type Line = {t: string; at: number};

// Белый текст по центру, строки проявляются мягко
const Quiet: React.FC<{lines: Line[]; dur: number; y: number; size?: number}> = ({lines, dur, y, size = 52}) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [dur - 6, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', top: y, left: 50, right: 50, textAlign: 'center'}}>
        {lines.map((l, i) => {
          const p = interpolate(f, [l.at, l.at + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
          return (
            <div
              key={i}
              style={{
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: size,
                lineHeight: 1.28,
                color: '#fff',
                textShadow: '0 2px 6px rgba(0,0,0,0.45), 0 4px 22px rgba(0,0,0,0.5)',
                opacity: p,
                transform: `translateY(${(1 - p) * 12}px)`,
                textWrap: 'balance',
              } as React.CSSProperties}
            >
              {l.t}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

type Shot = {src: string; from: number; dur: number; push?: [number, number, string]; fade?: number};

const Clip: React.FC<{s: Shot}> = ({s}) => {
  const f = useCurrentFrame();
  const [z0, z1, origin] = s.push ?? [1, 1.04, '50% 45%'];
  const z = interpolate(f, [0, s.dur], [z0, z1]);
  const o = s.fade ? interpolate(f, [0, s.fade], [0, 1], {extrapolateRight: 'clamp'}) : 1;
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${z})`,
    transformOrigin: origin,
    filter: 'contrast(1.03) saturate(0.9) brightness(0.97) sepia(0.06)',
  };
  return (
    <AbsoluteFill style={{overflow: 'hidden', opacity: o}}>
      {s.src.endsWith('.jpg') ? (
        <Img src={staticFile(`${FOLDER}/${s.src}`)} style={style} />
      ) : (
        <OffthreadVideo src={staticFile(`${FOLDER}/${s.src}.mp4`)} muted style={style} />
      )}
    </AbsoluteFill>
  );
};

// Переписка: карточка растёт вниз, сообщения появляются по одному
type ChatData = {w: number; h: number; bubbles: number[][]};
const CARD_W = 1050;
const read = (b: number[]) => 9 + Math.round(Math.max(0, (b[1] - b[0]) / 98 - 1) * 16); // время на прочтение сообщения, кадры
const HOLD = 26;
const chatTimes = (c: ChatData) => {
  const at: number[] = [];
  let t = 3;
  c.bubbles.forEach((b) => {
    at.push(t);
    t += read(b);
  });
  return {at, dur: t + HOLD};
};

const ChatCard: React.FC<{name: keyof typeof chat; dur: number; title?: string}> = ({name, dur, title}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = chat[name] as ChatData;
  const k = CARD_W / c.w;
  const fullH = c.h * k;
  const {at} = chatTimes(c);
  // видимая высота: до низа последнего появившегося сообщения, с пружиной
  let vis = 0;
  c.bubbles.forEach((b, i) => {
    const target = (i + 1 < c.bubbles.length ? (b[1] + c.bubbles[i + 1][0]) / 2 : c.h) * k;
    const prev = vis;
    const p = spring({frame: f - at[i], fps, config: {damping: 18, stiffness: 220, mass: 0.6}});
    vis = prev + (target - prev) * p;
  });
  const enter = spring({frame: f, fps, config: {damping: 16, stiffness: 180, mass: 0.7}});
  const out = interpolate(f, [dur - 4, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const top = 960 - fullH / 2 + (title ? 50 : 0);
  return (
    <AbsoluteFill style={{opacity: out}}>
      {title ? (
        <div
          style={{
            position: 'absolute',
            top: top - 120,
            left: 60,
            right: 60,
            textAlign: 'center',
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 56,
            color: '#fff',
            textShadow: '0 2px 6px rgba(0,0,0,0.45), 0 4px 22px rgba(0,0,0,0.5)',
            opacity: interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp'}),
          }}
        >
          {title}
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          top,
          left: (1080 - CARD_W) / 2,
          width: CARD_W,
          height: fullH,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 50}px)`,
          clipPath: `inset(0 0 ${Math.max(0, fullH - vis)}px 0 round 30px)`,
          filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.45))',
        }}
      >
        <Img src={staticFile(`${FOLDER}/${name}.jpg`)} style={{width: CARD_W, height: fullH, display: 'block'}} />
      </div>
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)'}} />
);

// Таймлайн (30 к/с)
const DOOR: Shot[] = [
  {src: 'door_open', from: 0, dur: 33},
  {src: 'door_son', from: 33, dur: 84},
  {src: 'door_roses', from: 117, dur: 30, push: [1.04, 1.1, '50% 50%']},
  {src: 'door_smile', from: 147, dur: 29},
];
const CHAT_START = 176;
const CHATS: (keyof typeof chat)[] = ['chat_ruga', 'chat_grust', 'chat_prosti', 'chat_mamochka'];
const chatSeq = (() => {
  let t = CHAT_START;
  return CHATS.map((n) => {
    const d = chatTimes(chat[n] as ChatData).dur;
    const s = {name: n, from: t, dur: d};
    t += d;
    return s;
  });
})();
const CHAT_END = chatSeq[chatSeq.length - 1].from + chatSeq[chatSeq.length - 1].dur;
const PHOTOS: Shot[] = [
  {src: 'photo_flowers.jpg', from: CHAT_END, dur: 54, push: [1.0, 1.07, '50% 40%'], fade: 8},
  {src: 'photo_selfie.jpg', from: CHAT_END + 54, dur: 54, push: [1.0, 1.07, '45% 35%'], fade: 6},
];
const SPIN: Shot = {src: 'spin', from: CHAT_END + 108, dur: 276, push: [1.0, 1.05, '45% 55%'], fade: 8};
export const SYN_FRAMES = SPIN.from + SPIN.dur;

export const SynReel: React.FC = () => {
  useInter();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {DOOR.map((s, i) => (
        <Sequence key={`d${i}`} from={s.from} durationInFrames={s.dur}>
          <Clip s={s} />
        </Sequence>
      ))}
      <Sequence from={CHAT_START} durationInFrames={CHAT_END - CHAT_START}>
        <Img src={staticFile(`${FOLDER}/chat_bg.jpg`)} style={{width: 1080, height: 1920}} />
      </Sequence>
      {chatSeq.map((c, i) => (
        <Sequence key={c.name} from={c.from} durationInFrames={c.dur}>
          <ChatCard name={c.name} dur={c.dur} title={i === 0 ? 'А он пишет мне вот это' : undefined} />
        </Sequence>
      ))}
      {[...PHOTOS, SPIN].map((s, i) => (
        <Sequence key={`p${i}`} from={s.from} durationInFrames={s.dur}>
          <Clip s={s} />
        </Sequence>
      ))}
      <Vignette />
      <Sequence from={0} durationInFrames={CHAT_START}>
        <Quiet
          dur={CHAT_START}
          y={1290}
          lines={[
            {t: 'Ему 15.', at: 6},
            {t: 'Возраст, когда всё отвергают', at: 20},
          ]}
        />
      </Sequence>
      <Sequence from={SPIN.from} durationInFrames={SPIN.dur}>
        <Quiet
          dur={SPIN.dur + 30}
          y={1430}
          lines={[
            {t: 'Однажды он уйдёт в свою жизнь.', at: 24},
            {t: 'А этот день останется со мной навсегда', at: 100},
          ]}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
