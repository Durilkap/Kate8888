import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useMontserrat} from './WordCaptions';

// Рилс 41 «Леди или спортсменка?» (21.11): из готовых видео Кати (tools/prepare_r41.py), без голоса, музыку Катя
// ставит в Instagram. Хук Кати «Знаете, что самое сложное...», «Леди?» / «Или спортсменка?», быстрая смена образов
// под бит, в конце экран пополам: 1 леди, 2 спортсменка, «Решите за меня».

const GRADE = 'contrast(1.05) saturate(1.06) brightness(1.03)';
type Seg = {src: string; dur: number; z?: [number, number]; o?: string; flash?: boolean};
const SEGS: Seg[] = [
  {src: 'l1', dur: 66, z: [1.0, 1.05], o: '50% 30%'},
  {src: 's1', dur: 45, z: [1.02, 1.07], o: '50% 30%'},
  {src: 'l2', dur: 54, z: [1.0, 1.05], o: '50% 40%'},
  {src: 'l3', dur: 54, z: [1.02, 1.06], o: '50% 40%', flash: true},
  {src: 's2', dur: 48, z: [1.0, 1.05], o: '50% 40%', flash: true},
  {src: 'q1', dur: 15}, {src: 'q2', dur: 15}, {src: 'q3', dur: 15},
  {src: 'q4', dur: 15}, {src: 'q5', dur: 15}, {src: 'q6', dur: 15},
];
const STARTS = SEGS.map((_, i) => SEGS.slice(0, i).reduce((a, x) => a + x.dur, 0));
const SPLIT_FROM = SEGS.reduce((a, x) => a + x.dur, 0);
const SPLIT_DUR = 72;
export const VIBOR_FRAMES = SPLIT_FROM + SPLIT_DUR;

const TEXTS: {from: number; to: number; lines: string[]}[] = [
  {from: 0, to: 66, lines: ['Знаете, что самое сложное', 'в моих выходных?']},
  {from: 66, to: 111, lines: ['Не уборка.', 'Не готовка.']},
  {from: 111, to: 165, lines: ['Выбрать, кто я сегодня 😅']},
  {from: 165, to: 219, lines: ['Леди?']},
  {from: 219, to: 267, lines: ['Или спортсменка?']},
  {from: SPLIT_FROM, to: VIBOR_FRAMES, lines: ['Решите за меня:', '1 или 2? 👇']},
];
const FONT = 'Montserrat, "Noto Color Emoji", "DejaVu Sans", sans-serif';

const Shot: React.FC<{s: Seg; first: boolean}> = ({s, first}) => {
  const f = useCurrentFrame();
  const z = s.z ?? [1.03, 1.06];
  const punch = first ? 0 : interpolate(f, [0, 4], [0.05, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const sc = interpolate(f, [0, s.dur], z, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) + punch;
  const fl = s.flash ? interpolate(f, [0, 4], [0.7, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile(`r41/${s.src}.mp4`)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${sc.toFixed(4)})`, transformOrigin: s.o ?? '50% 40%', filter: GRADE}} />
      {fl > 0 ? <AbsoluteFill style={{backgroundColor: '#fff', opacity: fl}} /> : null}
    </AbsoluteFill>
  );
};

const Plate: React.FC<{lines: string[]; f: number; from: number; size?: number}> = ({lines, f, from, size = 60}) => {
  const a = interpolate(f, [from, from + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', top: 1250, left: 30, right: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: a, transform: `translateY(${(1 - a) * 18}px)`}}>
      {lines.map((l) => (
        <div key={l} style={{fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.12, letterSpacing: '-0.015em', color: '#111', background: '#fff', padding: '0.08em 0.36em 0.12em', borderRadius: '0.28em', boxShadow: '0 8px 24px rgba(0,0,0,0.28)', whiteSpace: 'nowrap'}}>
          {l}
        </div>
      ))}
    </div>
  );
};

const Half: React.FC<{src: string; left: boolean; label: string; from?: number; still?: boolean; x?: number; corner?: boolean}> = ({src, left, label, from = 0, still = false, x = -271, corner = false}) => {
  const f = useCurrentFrame();
  const a = still ? 1 : interpolate(f, [0, 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <div style={{position: 'absolute', top: 0, bottom: 0, left: left ? 0 : 543, width: 537, overflow: 'hidden', transform: `translateX(${(1 - a) * (left ? -120 : 120)}px)`}}>
      <OffthreadVideo src={staticFile(`r41/${src}.mp4`)} startFrom={from} muted style={{position: 'absolute', left: x, width: 1080, height: 1920, objectFit: 'cover', filter: GRADE}} />
      <div style={corner ? {position: 'absolute', top: 40, left: 36, fontFamily: FONT, fontWeight: 800, fontSize: 120, color: '#fff', textShadow: '0 6px 24px rgba(0,0,0,0.55)'} : {position: 'absolute', top: 240, width: '100%', textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 150, color: '#fff', textShadow: '0 6px 24px rgba(0,0,0,0.55)', opacity: a}}>{label}</div>
    </div>
  );
};

export const ViborReel: React.FC = () => {
  useMontserrat();
  const f = useCurrentFrame();
  const t = TEXTS.find((x) => f >= x.from && f < x.to);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SEGS.map((s, i) => (
        <Sequence key={i} from={STARTS[i]} durationInFrames={s.dur}>
          <Shot s={s} first={i === 0} />
        </Sequence>
      ))}
      <Sequence from={SPLIT_FROM} durationInFrames={SPLIT_DUR}>
        <AbsoluteFill style={{backgroundColor: '#fff'}}>
          <Half src="sl" left label="1" x={-200} corner />
          <Half src="sr" left={false} label="2" corner />
        </AbsoluteFill>
      </Sequence>
      {t ? <Plate key={t.from} lines={t.lines} f={f} from={t.from} size={t.lines[0].length > 22 ? 54 : 60} /> : null}
    </AbsoluteFill>
  );
};

// обложка (Катя 21.11): слева Катя в белом пиджаке (не со спины), справа кепка и очки, внизу вопрос
export const ViborCover: React.FC = () => {
  useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#fff'}}>
      <Half src="l1" left label="1" from={40} still x={-200} corner />
      <Half src="sr" left={false} label="2" from={30} still corner />
      <Plate lines={['Леди или спортсменка?']} f={10} from={0} size={60} />
    </AbsoluteFill>
  );
};
