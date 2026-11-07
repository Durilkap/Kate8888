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

// Стиль титров по образцу Кати (07.11, её правка рилса 20): светлая карточка у левого края с красной полосой,
// узкий жирный шрифт Oswald (OFL), строки тёмные и красные курсивом. Карточка въезжает слева, кадры с рывком приближения.

const RED = '#E3202A';
const INK = '#161616';
const FONT = 'Oswald, "DejaVu Sans Condensed", sans-serif';

export type BoxLine = {t: string; red?: boolean; size?: number};
export type BoxCard = {from: number; to: number; lines: BoxLine[]; pos?: 'top' | 'bottom'; y?: number};
export type BoxShot = {src: string; from: number; dur: number; start?: number; push?: [number, number, string]; punch?: boolean};

const useOswald = () => {
  const [handle] = useState(() => delayRender('oswald'));
  useEffect(() => {
    const cyr = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
    const lat = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD';
    const f = (file: string, range: string) =>
      new FontFace('Oswald', `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight: '700', style: 'normal', unicodeRange: range});
    const faces = [f('oswald-cyrillic-700-normal.woff2', cyr), f('oswald-latin-700-normal.woff2', lat)];
    Promise.all(faces.map((x) => x.load()))
      .then((loaded) => {
        loaded.forEach((x) => document.fonts.add(x));
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
};

const Card: React.FC<{c: BoxCard}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = c.to - c.from;
  const inP = spring({frame: f, fps, config: {damping: 15, stiffness: 210, mass: 0.6}});
  const out = interpolate(f, [dur - 5, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const x = (1 - inP) * -1100 + out * -1100;
  const y = c.y ?? (c.pos === 'top' ? 190 : 1180);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 48, top: y, transform: `translateX(${x}px)`}}>
        <div
          style={{
            background: 'rgba(250,247,243,0.93)',
            borderLeft: `14px solid ${RED}`,
            padding: '22px 40px 26px 30px',
            boxShadow: '0 14px 40px rgba(0,0,0,0.28)',
            maxWidth: 960,
          }}
        >
          {c.lines.map((l, i) => {
            const p = spring({frame: f - 4 - i * 4, fps, config: {damping: 16, stiffness: 200, mass: 0.5}});
            return (
              <div
                key={i}
                style={{
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: l.size ?? (l.red ? 112 : 76),
                  lineHeight: 1.08,
                  color: l.red ? RED : INK,
                  fontStyle: l.red ? 'italic' : 'normal',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.005em',
                  opacity: p,
                  transform: `translateX(${(1 - p) * -40}px)`,
                }}
              >
                {l.t}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Clip: React.FC<{s: BoxShot; folder: string}> = ({s, folder}) => {
  const f = useCurrentFrame();
  const punch = s.punch === false ? 1 : interpolate(f, [0, 5], [1.16, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const [z0, z1, origin] = s.push ?? [1, 1.06, '50% 45%'];
  const z = punch * interpolate(f, [0, s.dur], [z0, z1]);
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, transformOrigin: origin};
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      {s.src.endsWith('.jpg') ? (
        <Img src={staticFile(`${folder}/${s.src}`)} style={style} />
      ) : (
        <OffthreadVideo src={staticFile(`${folder}/${s.src}.mp4`)} startFrom={s.start ?? 0} muted style={{...style, filter: 'contrast(1.06) saturate(1.1)'}} />
      )}
    </AbsoluteFill>
  );
};

const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{backgroundColor: '#fff', opacity: interpolate(f, [0, 1, 5], [0, 0.6, 0], {extrapolateRight: 'clamp'})}} />;
};

export const BoxReel: React.FC<{folder: string; shots: BoxShot[]; cards: BoxCard[]; flashes?: number[]}> = ({folder, shots, cards, flashes = []}) => {
  useOswald();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {shots.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur}>
          <Clip s={s} folder={folder} />
        </Sequence>
      ))}
      {flashes.map((fr) => (
        <Sequence key={`f${fr}`} from={fr} durationInFrames={6}>
          <Flash />
        </Sequence>
      ))}
      {cards.map((c, i) => (
        <Sequence key={`c${i}`} from={c.from} durationInFrames={c.to - c.from}>
          <Card c={c} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Рилс 20 в стиле Кати: брюки-зебра, около 15 секунд, быстрые склейки. Тексты по её правке (07.11),
// длинные тире заменены переносом строки (правило Кати).
const R20K_SHOTS: BoxShot[] = [
  {src: 'z_pour', from: 0, dur: 42, punch: false},
  {src: 'line', from: 42, dur: 24},
  {src: 'line', from: 66, dur: 21, start: 24, push: [1.1, 1.16, '50% 40%']},
  {src: 'z_drink', from: 87, dur: 42},
  {src: 'z_collagen', from: 129, dur: 30},
  {src: 'z_collagen', from: 159, dur: 30, start: 36, push: [1.12, 1.18, '50% 40%']},
  {src: 'plate_full.jpg', from: 189, dur: 45, push: [1.0, 1.1, '55% 70%']},
  {src: 'z_eat1', from: 234, dur: 40},
  {src: 'z_eat2', from: 274, dur: 40},
  {src: 'appcard.jpg', from: 314, dur: 45, push: [1.0, 1.06, '50% 35%']},
  {src: 'z_wink', from: 359, dur: 99},
];
export const R20K_FRAMES = 458;
const R20K_CARDS: BoxCard[] = [
  {from: 0, to: 42, pos: 'bottom', lines: [{t: 'Мой выходной'}, {t: 'не с кофе', red: true}]},
  {from: 42, to: 87, pos: 'top', lines: [{t: 'В будни'}, {t: 'типография', red: true}]},
  {from: 87, to: 129, pos: 'bottom', lines: [{t: 'А в выходной'}, {t: 'стакан воды', red: true}]},
  {from: 129, to: 189, pos: 'bottom', lines: [{t: 'Коллаген. И да...'}, {t: 'сначала этикетка', red: true, size: 100}]},
  {from: 189, to: 234, pos: 'top', lines: [{t: 'Сырники'}, {t: 'в аэрогриле', red: true}]},
  {from: 234, to: 314, pos: 'bottom', lines: [{t: 'Питание'}, {t: 'по плану', red: true}]}, // «забота от мужа» убрано (Катя 07.11)
  {from: 314, to: 359, pos: 'bottom', y: 1100, lines: [{t: '100 г углеводов за день'}, {t: 'завтрак 488 ккал', red: true}]},
  {from: 359, to: 458, pos: 'bottom', y: 1120, lines: [{t: 'Подпишись', red: true, size: 118}, {t: 'Этикетки, деньги', size: 70}, {t: 'и жизнь без фильтров', size: 62}]},
];
export const VyhodnojKatya: React.FC = () => <BoxReel folder="r20" shots={R20K_SHOTS} cards={R20K_CARDS} flashes={[42, 189, 359]} />;
