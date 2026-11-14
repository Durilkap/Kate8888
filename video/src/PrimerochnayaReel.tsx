import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Flash, KWord, useOswald2} from './UgadajReel';
import {RED} from './SerijaReel';
import {Plate} from './NoyabrReel';

// Рилс 31 «Зашла просто посмотреть» (14.11): ТЦ и примерочная, видео Кати.
// Хук на развороте в проходе, проход к камере, три образа через шторку примерочной (ускорение и замедление,
// клипы готовит tools/prepare_r31.py), вспышки ещё трёх образов, финал: три образа рядом и вопрос.
// Вывески магазинов в проходе размыты при подготовке клипов. Без звука.

const OSW = 'Oswald, "DejaVu Sans Condensed", sans-serif';
const GRADE = 'contrast(1.05) saturate(1.08)';

const HOOK = 30;
const WALK = 75;
const O1 = 93;
const O1X = 26;
const O2 = 93;
const O2X = 27;
const O3 = 138;
const FL = 12;
const FIN = 108;

const S_WALK = HOOK;
const S_O1 = S_WALK + WALK;
const S_O1X = S_O1 + O1;
const S_O2 = S_O1X + O1X;
const S_O2X = S_O2 + O2;
const S_O3 = S_O2X + O2X;
const S_FL = S_O3 + O3;
const S_FIN = S_FL + 3 * FL;
export const PRIMEROCHNAYA_FRAMES = S_FIN + FIN;

type Fx = 'none' | 'whip' | 'punch' | 'zoom';

// клип на весь кадр с переходами на входе и выходе
const Clip: React.FC<{src: string; dur: number; fin?: Fx; fout?: Fx; zoom?: [number, number]; origin?: string}> = ({
  src,
  dur,
  fin = 'none',
  fout = 'none',
  zoom = [1, 1],
  origin = '50% 45%',
}) => {
  const f = useCurrentFrame();
  let s = interpolate(f, [0, dur], zoom, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  let x = 0;
  let blur = 0;
  if (fin === 'whip') {
    const u = interpolate(f, [0, 6], [1, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
    x += u * 320;
    blur += u * 22;
  }
  if (fin === 'punch') {
    const u = interpolate(f, [0, 7], [1, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
    s *= 1 + 0.3 * u;
    blur += u * 14;
  }
  if (fout === 'whip') {
    const u = interpolate(f, [dur - 5, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
    x -= u * 320;
    blur += u * 22;
  }
  if (fout === 'zoom') {
    const u = interpolate(f, [dur - 7, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
    s *= 1 + 0.7 * u;
    blur += u * 18;
  }
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <OffthreadVideo
        src={staticFile(`r31/${src}.mp4`)}
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translateX(${x.toFixed(1)}px) scale(${s.toFixed(4)})`,
          transformOrigin: origin,
          filter: `${GRADE} blur(${blur.toFixed(1)}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// номер образа: маленькое «образ» и большая цифра
const Num: React.FC<{n: number; at: number; dur: number}> = ({n, at, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - at, fps, config: {damping: 9, stiffness: 240, mass: 0.5}});
  const out = interpolate(f, [dur - 4, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (f < at) return null;
  return (
    <div style={{position: 'absolute', top: 150, left: 70, opacity: out, transform: `scale(${p}) rotate(${(1 - p) * -25}deg)`, transformOrigin: '30% 60%'}}>
      <div
        style={{
          fontFamily: OSW,
          fontWeight: 700,
          fontSize: 50,
          letterSpacing: 6,
          color: '#fff',
          textTransform: 'uppercase',
          textShadow: '0 3px 14px rgba(0,0,0,0.6)',
          marginLeft: 8,
        }}
      >
        образ
      </div>
      <div
        style={{
          fontFamily: OSW,
          fontWeight: 700,
          fontStyle: 'italic',
          fontSize: 300,
          lineHeight: 0.9,
          color: RED,
          WebkitTextStroke: '8px #fff',
          paintOrder: 'stroke fill',
          textShadow: '0 10px 40px rgba(0,0,0,0.45)',
        } as React.CSSProperties}
      >
        {n}
      </div>
    </div>
  );
};

// финал: три образа рядом
const Strip: React.FC<{src: string; i: number; cx: number}> = ({src, i, cx}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - i * 4, fps, config: {damping: 16, stiffness: 150, mass: 0.7}});
  const dir = i % 2 === 0 ? -1 : 1;
  const np = spring({frame: f - 14 - i * 5, fps, config: {damping: 9, stiffness: 240, mass: 0.5}});
  return (
    <div style={{position: 'absolute', left: i * 360, top: 0, width: 360, height: 1920, overflow: 'hidden', transform: `translateY(${((1 - p) * dir * 1920).toFixed(1)}px)`}}>
      <OffthreadVideo
        src={staticFile(`r31/${src}.mp4`)}
        muted
        style={{position: 'absolute', width: 1080, height: 1920, top: 0, left: -(cx * 1080 - 180), filter: GRADE}}
      />
      <div style={{position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div
          style={{
            fontFamily: OSW,
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 190,
            lineHeight: 1,
            color: RED,
            WebkitTextStroke: '6px #fff',
            paintOrder: 'stroke fill',
            textShadow: '0 8px 30px rgba(0,0,0,0.45)',
            transform: `scale(${np})`,
          } as React.CSSProperties}
        >
          {i + 1}
        </div>
      </div>
    </div>
  );
};

const Final: React.FC = () => {
  const f = useCurrentFrame();
  const line = interpolate(f, [8, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: '#fff'}}>
      <Strip src="h1" i={0} cx={0.5} />
      <Strip src="h2" i={1} cx={0.48} />
      <Strip src="h3" i={2} cx={0.5} />
      {[1, 2].map((k) => (
        <div key={k} style={{position: 'absolute', left: k * 360 - 4, top: 0, width: 8, height: 1920 * line, backgroundColor: '#fff'}} />
      ))}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)'}} />
      <div style={{position: 'absolute', top: 1330, left: 0, right: 0}}>
        <Plate t="Какой мне идёт?" size={104} at={16} dur={FIN + 20} />
        <Plate t="Пиши цифру 👇" size={84} at={24} dur={FIN + 20} />
      </div>
    </AbsoluteFill>
  );
};

export const PrimerochnayaReel: React.FC = () => {
  useOswald2();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Sequence from={0} durationInFrames={HOOK}>
        <Clip src="hook" dur={HOOK} fout="whip" zoom={[1.13, 1.18]} origin="50% 40%" />
      </Sequence>
      <Sequence from={S_WALK} durationInFrames={WALK}>
        <Clip src="walk" dur={WALK} fin="whip" fout="zoom" zoom={[1.0, 1.06]} />
      </Sequence>
      <Sequence from={S_O1} durationInFrames={O1}>
        <Clip src="o1" dur={O1} fin="punch" />
      </Sequence>
      <Sequence from={S_O1X} durationInFrames={O1X}>
        <Clip src="o1x" dur={O1X} />
      </Sequence>
      <Sequence from={S_O2} durationInFrames={O2}>
        <Clip src="o2" dur={O2} fin="punch" />
      </Sequence>
      <Sequence from={S_O2X} durationInFrames={O2X}>
        <Clip src="o2x" dur={O2X} />
      </Sequence>
      <Sequence from={S_O3} durationInFrames={O3}>
        <Clip src="o3" dur={O3} fin="punch" fout="zoom" />
      </Sequence>
      {['f1', 'f2', 'f3'].map((s, i) => (
        <Sequence key={s} from={S_FL + i * FL} durationInFrames={FL}>
          <Clip src={s} dur={FL} fin="punch" zoom={[1.0, 1.06]} />
        </Sequence>
      ))}
      <Sequence from={S_FIN} durationInFrames={FIN}>
        <Final />
      </Sequence>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.28) 100%)', pointerEvents: 'none'}} />

      {/* хук: плашки ниже лица (лицо в кадре с первых кадров) */}
      <Sequence from={0} durationInFrames={HOOK + 4}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1180, left: 0, right: 0}}>
            <Plate t="Зашла" size={120} at={0} dur={HOOK + 4} light />
            <Plate t="«просто посмотреть» 🙈" size={78} at={0} dur={HOOK + 4} light />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={S_WALK + 4} durationInFrames={WALK - 8}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 230, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <KWord t="спойлер:" at={1} size={96} from="left" dur={WALK - 8} />
            <KWord t="не просто 😅" at={10} size={130} red from="right" dur={WALK - 8} />
          </div>
        </AbsoluteFill>
      </Sequence>
      {/* номера образов */}
      <Sequence from={S_O1} durationInFrames={O1 + O1X}>
        <Num n={1} at={12} dur={O1 + O1X} />
      </Sequence>
      <Sequence from={S_O2} durationInFrames={O2 + O2X}>
        <Num n={2} at={12} dur={O2 + O2X} />
      </Sequence>
      <Sequence from={S_O3} durationInFrames={O3}>
        <Num n={3} at={12} dur={O3} />
      </Sequence>
      <Sequence from={S_FL} durationInFrames={3 * FL + 2}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1380, left: 0, right: 0}}>
            <Plate t="и ещё чуть-чуть 🙈" size={96} at={0} dur={3 * FL + 2} />
          </div>
        </AbsoluteFill>
      </Sequence>
      {/* вспышки на склейках */}
      {[S_O1, S_O2, S_O3, S_FL, S_FL + FL, S_FL + 2 * FL, S_FIN].map((s) => (
        <Sequence key={`fl${s}`} from={s} durationInFrames={10}>
          <Flash />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
