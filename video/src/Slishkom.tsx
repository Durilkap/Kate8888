import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Segment, Seg} from './BestAngle';

// Рилс «Слишком» с голосом Кати. Титры идут в такт озвучке:
// starts[i] = кадр (30 fps), с которого звучит фраза CAPS[i]. Тайминги берутся из озвучки (audio/sync_voice.py).

type Line = {text: string; gold?: boolean; size?: number};
type Cap = {lines: Line[]; size: number; rule?: boolean};

export const CAPS: Cap[] = [
  {size: 112, lines: [{text: 'Тебе говорили:'}, {text: '«Ты слишком»?', gold: true}]},
  {size: 104, lines: [{text: 'Слишком'}, {text: 'яркая.', size: 168}]},
  {size: 104, lines: [{text: 'Слишком'}, {text: 'уверенная.', size: 136}]},
  {size: 104, lines: [{text: 'Слишком'}, {text: 'смелая.', size: 168}]},
  {size: 176, lines: [{text: 'Мне тоже.', gold: true}]},
  {size: 100, lines: [{text: 'И ты начинаешь'}, {text: 'уменьшаться,'}]},
  {size: 112, lines: [{text: 'чтобы всем'}, {text: 'было удобно.'}]},
  {size: 108, lines: [{text: 'А знаешь, что'}, {text: 'я сделала?', gold: true}]},
  {size: 128, lines: [{text: 'Я перестала.', gold: true}]},
  {size: 96, lines: [{text: 'Не прогибаюсь.'}]},
  {size: 96, lines: [{text: 'Не оправдываюсь.'}]},
  {size: 96, lines: [{text: 'Чужое «слишком»'}, {text: 'мне не указ.', gold: true}]},
  {size: 118, rule: true, lines: [{text: 'Я Екатерина.'}]},
];

// Тайминги для предпросмотра без голоса (прикидка по слогам); с озвучкой заменяются.
export const DEFAULT_STARTS = [0, 63, 102, 153, 192, 219, 288, 345, 408, 447, 486, 531, 594];
export const SLISHKOM_FRAMES = 669;

type Shot = {cap: number; file: Seg['file']; src: number; s0: number; s1: number; ox: number; oy: number};

// Смена плана на каждой смысловой точке. cap: с какой фразы начинается план. src: кадр исходника.
// План на «И ты начинаешь уменьшаться» отъезжает назад: картинка «уменьшается» вместе со словом.
const SHOTS: Shot[] = [
  {cap: 0, file: 'source.mp4', src: 120, s0: 1.15, s1: 1.45, ox: 55, oy: 46},
  {cap: 1, file: 'source.mp4', src: 180, s0: 1.5, s1: 1.2, ox: 50, oy: 55},
  {cap: 2, file: 'source.mp4', src: 240, s0: 1.25, s1: 1.6, ox: 50, oy: 58},
  {cap: 3, file: 'source.mp4', src: 291, s0: 1.6, s1: 1.3, ox: 50, oy: 55},
  {cap: 4, file: 'source.mp4', src: 339, s0: 1.3, s1: 1.75, ox: 48, oy: 58},
  {cap: 5, file: 'source.mp4', src: 300, s0: 1.7, s1: 1.0, ox: 50, oy: 50},
  {cap: 7, file: 'source.mp4', src: 150, s0: 1.2, s1: 1.38, ox: 50, oy: 48},
  {cap: 8, file: 'source.mp4', src: 210, s0: 1.0, s1: 1.55, ox: 50, oy: 52},
  {cap: 9, file: 'source.mp4', src: 306, s0: 1.25, s1: 1.65, ox: 50, oy: 56},
  {cap: 11, file: 'source.mp4', src: 360, s0: 1.55, s1: 1.25, ox: 45, oy: 62},
  {cap: 12, file: 'slow.mp4', src: 0, s0: 1.0, s1: 1.38, ox: 50, oy: 40},
];

const SRC_FRAMES: Record<Seg['file'], number> = {'source.mp4': 496, 'slow.mp4': 101};

export const buildSegments = (starts: number[], total: number): Seg[] => {
  const out: Seg[] = [];
  SHOTS.forEach((sh, i) => {
    const from = starts[sh.cap];
    const to = i + 1 < SHOTS.length ? starts[SHOTS[i + 1].cap] : total;
    const dur = to - from;
    if (dur <= 0) return;
    const avail = SRC_FRAMES[sh.file];
    const play = Math.min(dur, avail - 1);
    const start = Math.max(0, Math.min(sh.src, avail - play - 1));
    out.push({from, dur: play, file: sh.file, start, s0: sh.s0, s1: sh.s1, ox: sh.ox, oy: sh.oy});
    if (dur > play) {
      // Исходник кончился: последний кадр держим и чуть доводим зум (без вспышки).
      out.push({
        from: from + play,
        dur: dur - play,
        file: sh.file,
        start,
        freezeAt: play - 1,
        calm: true,
        s0: sh.s1,
        s1: sh.s1 + 0.08,
        ox: sh.ox,
        oy: sh.oy,
      });
    }
  });
  return out;
};

export type Mode = 'overlay' | 'bar';
const BAR_H = 560;

const Caption: React.FC<{cap: Cap; mode: Mode}> = ({cap, mode}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bar = mode === 'bar';
  const rule = cap.rule
    ? interpolate(f, [6, 24], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 0;
  return (
    <AbsoluteFill
      style={{
        height: bar ? BAR_H : undefined,
        alignItems: 'center',
        justifyContent: bar ? 'center' : 'flex-start',
        // Безопасная зона Reels: верх ~14% и низ ~35% кадра закрывает интерфейс, поэтому в плашке текст чуть ниже центра.
        boxSizing: 'border-box',
        paddingTop: bar ? 100 : 200,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        color: '#fff',
        textShadow: bar ? 'none' : '0 4px 30px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{lineHeight: 1.06, position: 'relative'}}>
        {cap.rule ? (
          <div style={{width: 300 * rule, height: 3, backgroundColor: '#f6dca4', margin: '0 auto 26px'}} />
        ) : null}
        {cap.lines.map((l, i) => {
          const p = spring({frame: f - i * 3, fps, config: {damping: 13, stiffness: 190, mass: 0.55}});
          return (
            <div
              key={l.text}
              style={{
                fontSize: l.size ?? cap.size,
                fontWeight: 800,
                whiteSpace: 'nowrap',
                color: l.gold ? '#f6dca4' : '#ffffff',
                opacity: Math.min(1, p * 1.4),
                transform: `translateY(${(1 - p) * 40}px) scale(${0.88 + 0.12 * p})`,
              }}
            >
              {l.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export type SlishkomProps = {
  mode: Mode;
  starts: number[];
  total: number;
  voice?: string; // файл озвучки в public/
  music?: string; // необязательная тихая музыка в public/
};

export const DEFAULT_PROPS: SlishkomProps = {mode: 'bar', starts: DEFAULT_STARTS, total: SLISHKOM_FRAMES};

export const Slishkom: React.FC<SlishkomProps> = ({mode, starts, total, voice, music}) => {
  const bar = mode === 'bar';
  const segs = buildSegments(starts, total);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: bar ? BAR_H : 0,
          width: 1080,
          height: bar ? 1920 - BAR_H : 1920,
          overflow: 'hidden',
        }}
      >
        {segs.map((seg) => (
          <Sequence key={seg.from} from={seg.from} durationInFrames={seg.dur}>
            <Segment seg={seg} />
          </Sequence>
        ))}
      </div>
      {bar ? null : (
        <AbsoluteFill
          style={{background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.22) 28%, rgba(0,0,0,0) 46%)'}}
        />
      )}
      {CAPS.map((cap, i) => {
        const from = starts[i];
        const to = i + 1 < CAPS.length ? starts[i + 1] : total;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)}>
            <Caption cap={cap} mode={mode} />
          </Sequence>
        );
      })}
      {voice ? <Audio src={staticFile(voice)} /> : null}
      {music ? <Audio src={staticFile(music)} volume={0.2} /> : null}
    </AbsoluteFill>
  );
};
