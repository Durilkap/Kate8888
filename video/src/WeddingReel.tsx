import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill,
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

// Рилс 14 «Как я стала девочкой. Часть пути к себе настоящей»: свадебные фото Кати (свадьба год назад).
// Муж, гости, ведущий, фотографы и свидетельство о браке размыты заранее (tools/prepare_wedding_photos.py).
// В конце вопрос «Сколько стоил этот образ? Пишите свою цифру». Звука нет: музыку Катя добавит из библиотеки Instagram.

const GOLD = '#f3dfb2';
const SERIF = 'Cormorant, "DejaVu Serif", serif';
const FADE = 8;

type Shot = {src: string; dur: number; z?: [number, number]; origin?: string; pos?: string; label?: string; video?: boolean};

const W = (n: number) => `wed/w${String(n).padStart(2, '0')}.jpg`;

const M = (n: number) => `wed/m${n}.mp4`; // куски видео видеографа (без чужих лиц и марок)

const SHOTS: Shot[] = [
  {src: M(1), video: true, dur: 45, z: [1.0, 1.05]},
  {src: W(1), dur: 30, z: [1.0, 1.08], origin: '45% 40%'},
  {src: M(2), video: true, dur: 42, z: [1.0, 1.04]},
  {src: M(3), video: true, dur: 30, z: [1.04, 1.0]},
  {src: M(4), video: true, dur: 36, z: [1.0, 1.05]},
  {src: W(5), dur: 30, z: [1.7, 1.95], origin: '33% 38%'},
  {src: 'wed/v1.mp4', video: true, dur: 75, z: [1.0, 1.05]},
  {src: M(5), video: true, dur: 23, z: [1.04, 1.0]},
  {src: W(30), dur: 27, z: [1.0, 1.07]},
  {src: M(6), video: true, dur: 23, z: [1.0, 1.05]},
  {src: M(7), video: true, dur: 33, z: [1.04, 1.0]},
  {src: W(27), dur: 30, z: [1.0, 1.07]},
  {src: M(8), video: true, dur: 20, z: [1.04, 1.0]},
  {src: W(29), dur: 30, z: [1.06, 1.0]},
  {src: 'wed/v2.mp4', video: true, dur: 66, z: [1.0, 1.05]},
  {src: W(8), dur: 30, z: [1.0, 1.07], origin: '50% 35%'},
  {src: W(31), dur: 27, z: [1.06, 1.0]},
  {src: W(14), dur: 28, z: [1.0, 1.06]},
  {src: W(17), dur: 28, z: [1.0, 1.08], origin: '50% 30%'},
  {src: W(19), dur: 33, z: [1.0, 1.1], origin: '50% 80%'},
  {src: W(13), dur: 27, z: [1.0, 1.08]},
  {src: W(25), dur: 33, z: [1.06, 1.0]},
  {src: W(22), dur: 28, z: [1.0, 1.06]},
  {src: W(24), dur: 126, z: [1.0, 1.12], origin: '50% 45%'},
];
const STARTS = SHOTS.reduce<number[]>((a, s, i) => [...a, i === 0 ? 0 : a[i - 1] + SHOTS[i - 1].dur], []);
export const WEDDING_FRAMES = STARTS[STARTS.length - 1] + SHOTS[SHOTS.length - 1].dur;
const HOOK = SHOTS[0].dur + SHOTS[1].dur; // хук держится на двух первых кадрах

// Титры по сценарию «Мой путь к моей Девочке» (scenarii/rils-15-put-k-devochke.md): кадр начала и строки
type CapLine = {t: string; gold?: boolean; it?: boolean; big?: boolean};
const CAPS: {from: number; lines: CapLine[]}[] = [
  {from: 0, lines: [{t: 'Когда ты в последний раз'}, {t: 'была не сильной,'}, {t: 'а девочкой?', gold: true, it: true, big: true}]},
  {from: 96, lines: [{t: 'Работа, дом, решения.'}]},
  {from: 150, lines: [{t: 'Всё на тебе.', big: true}]},
  {from: 198, lines: [{t: 'И все говорят:'}, {t: '«Ты же сильная, справишься».', it: true}]},
  {from: 276, lines: [{t: 'И ты справляешься.'}]},
  {from: 324, lines: [{t: 'Только устаёшь так,'}, {t: 'что забываешь, какая ты.'}]},
  {from: 400, lines: [{t: 'Я тоже долго была'}, {t: 'только сильной.'}]},
  {from: 462, lines: [{t: 'Пока не разрешила'}, {t: 'себе другое:'}]},
  {from: 516, lines: [{t: 'просить помощи,', gold: true, it: true, big: true}]},
  {from: 560, lines: [{t: 'принимать заботу,', gold: true, it: true, big: true}]},
  {from: 604, lines: [{t: 'быть мягкой рядом'}, {t: 'со своим мужчиной.', gold: true, it: true}]},
  {from: 676, lines: [{t: 'Это не слабость.'}, {t: 'Это лёгкость.', gold: true, it: true, big: true}]},
  {from: 746, lines: [{t: 'Так я стала'}, {t: 'девочкой.', gold: true, it: true, big: true}]},
  {from: 800, lines: [{t: 'И это только часть пути'}, {t: 'к себе настоящей.', it: true}]},
  {from: 862, lines: [{t: 'Я Екатерина.', big: true}]},
];

const Caption: React.FC<{lines: CapLine[]; dur: number}> = ({lines, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(f, [dur - 6, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', top: 1110, left: 50, right: 50, textAlign: 'center', fontFamily: SERIF, color: '#fff', textShadow: '0 3px 22px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.5)'}}>
        {lines.map((l, i) => {
          const p = spring({frame: f - 2 - i * 5, fps, config: {damping: 18, stiffness: 120, mass: 0.7}});
          const size = Math.min(l.big ? 118 : 84, Math.floor(980 / (l.t.length * 0.47)));
          return (
            <div
              key={i}
              style={{
                fontSize: size,
                lineHeight: 1.08,
                fontStyle: l.it ? 'italic' : 'normal',
                color: l.gold ? GOLD : '#fff',
                whiteSpace: 'nowrap',
                opacity: p,
                transform: `translateY(${(1 - p) * 18}px)`,
              }}
            >
              {l.t}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const cyr = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
    const lat = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD';
    const f = (file: string, style: string, range: string) =>
      new FontFace('Cormorant', `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight: '500', style, unicodeRange: range});
    const faces = [
      f('cormorant-garamond-cyrillic-500-normal.woff2', 'normal', cyr),
      f('cormorant-garamond-latin-500-normal.woff2', 'normal', lat),
      f('cormorant-garamond-cyrillic-500-italic.woff2', 'italic', cyr),
      f('cormorant-garamond-latin-500-italic.woff2', 'italic', lat),
    ];
    Promise.all(faces.map((x) => x.load()))
      .then((loaded) => {
        loaded.forEach((x) => document.fonts.add(x));
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
};

const Photo: React.FC<{s: Shot; dur: number; first: boolean}> = ({s, dur, first}) => {
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

const Label: React.FC<{text: string; dur: number}> = ({text, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - 4, fps, config: {damping: 18, stiffness: 120, mass: 0.7}});
  const out = interpolate(f, [dur - 6, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const line = interpolate(f, [6, 20], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <AbsoluteFill style={{background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.12) 20%, rgba(0,0,0,0) 32%)'}} />
      <div style={{position: 'absolute', top: 300, width: '100%', textAlign: 'center', fontFamily: SERIF, color: '#fff', textShadow: '0 3px 22px rgba(0,0,0,0.55)'}}>
        <div style={{fontSize: 92, fontStyle: 'italic', opacity: p, transform: `translateY(${(1 - p) * 20}px)`, letterSpacing: '0.02em'}}>{text}</div>
        <div style={{width: 220 * line, height: 2, background: GOLD, margin: '14px auto 0'}} />
      </div>
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p1 = spring({frame: f + 12, fps, config: {damping: 18, stiffness: 110, mass: 0.8}});
  const p2 = spring({frame: f - 10, fps, config: {damping: 18, stiffness: 110, mass: 0.8}});
  const out = interpolate(f, [HOOK - 8, HOOK], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(0,0,0,0.05) 14%, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0) 50%)'}} />
      <div style={{position: 'absolute', top: 1060, width: '100%', textAlign: 'center', fontFamily: SERIF, color: '#fff', textShadow: '0 4px 28px rgba(0,0,0,0.7)'}}>
        <div style={{fontSize: 116, lineHeight: 1.0, opacity: p1, transform: `translateY(${(1 - p1) * 24}px)`}}>Как я стала</div>
        <div style={{fontSize: 136, lineHeight: 1.0, fontStyle: 'italic', color: GOLD, opacity: p1, transform: `translateY(${(1 - p1) * 30}px)`}}>девочкой</div>
        <div style={{fontSize: 70, fontStyle: 'italic', marginTop: 16, opacity: p2, letterSpacing: '0.02em'}}>часть пути к себе настоящей</div>
      </div>
    </AbsoluteFill>
  );
};

const Final: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p1 = spring({frame: f - 14, fps, config: {damping: 18, stiffness: 110, mass: 0.8}});
  const p2 = spring({frame: f - 34, fps, config: {damping: 16, stiffness: 120, mass: 0.7}});
  const flash = interpolate(f, [0, 3, 14], [0, 0.5, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{backgroundColor: '#fff', opacity: flash}} />
      <AbsoluteFill style={{background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 30%, rgba(0,0,0,0) 48%)'}} />
      <div style={{position: 'absolute', top: 260, width: '100%', textAlign: 'center', fontFamily: SERIF, color: '#fff', textShadow: '0 3px 20px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.6)'}}>
        <div style={{fontSize: 98, lineHeight: 1.05, opacity: p1, transform: `translateY(${(1 - p1) * 24}px)`}}>Сколько стоил</div>
        <div style={{fontSize: 98, lineHeight: 1.05, opacity: p1, transform: `translateY(${(1 - p1) * 24}px)`}}>этот образ?</div>
        <div style={{fontSize: 74, fontStyle: 'italic', color: GOLD, marginTop: 22, opacity: p2, transform: `scale(${0.9 + 0.1 * p2})`}}>Пишите свою цифру</div>
      </div>
    </AbsoluteFill>
  );
};

export const WeddingReel: React.FC = () => {
  useFonts();
  const last = SHOTS.length - 1;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={STARTS[i]} durationInFrames={s.dur + (i < last ? FADE : 0)}>
          <Photo s={s} dur={s.dur} first={i === 0} />
          {s.label ? <Label text={s.label} dur={s.dur} /> : null}
        </Sequence>
      ))}
      <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(0,0,0,0.05) 12%, rgba(0,0,0,0.5) 28%, rgba(0,0,0,0.15) 42%, rgba(0,0,0,0) 52%)'}} />
      {CAPS.map((c, i) => {
        const to = i + 1 < CAPS.length ? CAPS[i + 1].from : WEDDING_FRAMES;
        return (
          <Sequence key={`c${i}`} from={c.from} durationInFrames={to - c.from}>
            <Caption lines={c.lines} dur={i + 1 < CAPS.length ? to - c.from : to - c.from + 12} />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.35) 100%)'}} />
    </AbsoluteFill>
  );
};
