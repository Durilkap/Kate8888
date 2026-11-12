import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {RED} from './SerijaReel';
import {useInter} from './SynReel';
import {useOswald2} from './UgadajReel';

// Рилс 26 «Спешка» (12.11): видео Кати из машины (снег, дорога, деревня), снято 240 к/с.
// Суета: дорога несётся в 5 раз быстрее с размытием движения, лёгкая тряска, холодный цвет, всплывают уведомления.
// Затем время плавно замедляется (speed ramp, tools/prepare_r26.py), снег парит, цвет теплеет, уведомления улетают
// вверх, как снежинки. Спокойный текст: Cormorant курсивом, проявляется по буквам. Дворник медленно «стирает» фразу.
// Финал на светлом: «Притормози.» Без звука: музыку Катя добавит сама.

const SERIF = '"Cormorant Garamond", Georgia, serif';
const OSW = 'Oswald, "DejaVu Sans Condensed", sans-serif';
const SANS = 'Inter, "DejaVu Sans", sans-serif';

const useCormorant = () => {
  const [handle] = useState(() => delayRender('cormorant'));
  useEffect(() => {
    const cyr = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
    const lat = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD';
    const f = (file: string, range: string) =>
      new FontFace('Cormorant Garamond', `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight: '500', style: 'italic', unicodeRange: range});
    Promise.all([f('cormorant-garamond-cyrillic-500-italic.woff2', cyr), f('cormorant-garamond-latin-500-italic.woff2', lat)].map((x) => x.load()))
      .then((l) => {
        l.forEach((x) => document.fonts.add(x));
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
};

// ---------- тайминг (30 к/с) ----------
const R1 = 282; // ramp1.mp4
const X2 = 264; // начало slow2 (наплыв 18 кадров)
const S2 = 354; // slow2.mp4
export const SPESHKA_FRAMES = X2 + S2;
const RAMP_A = 72; // начало торможения (2,4 с)
const RAMP_B = 117; // конец торможения (3,9 с)

// «спокойствие» от 0 (суета) до 1 (тишина)
const calmAt = (f: number) => interpolate(f, [RAMP_A - 6, RAMP_B + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});

const Footage: React.FC = () => {
  const f = useCurrentFrame();
  const calm = calmAt(f);
  // тряска в суете, затихает при торможении
  const amp = (1 - calm) * 7;
  const jx = amp * Math.sin(f * 2.3) * Math.cos(f * 0.7);
  const jy = amp * Math.sin(f * 1.7 + 1.3);
  const rot = (1 - calm) * 0.35 * Math.sin(f * 1.1);
  const zoom = interpolate(f, [0, RAMP_B, SPESHKA_FRAMES], [1.1, 1.05, 1.0]);
  const filter = `contrast(${1.12 - 0.1 * calm}) saturate(${0.72 + 0.33 * calm}) brightness(${0.94 + 0.08 * calm}) sepia(${0.12 * calm}) hue-rotate(${-10 * (1 - calm)}deg)`;
  const x = interpolate(f, [X2, X2 + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const style: React.CSSProperties = {position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter};
  return (
    <AbsoluteFill style={{overflow: 'hidden', transform: `translate(${jx}px, ${jy}px) rotate(${rot}deg) scale(${zoom})`}}>
      <Sequence from={0} durationInFrames={R1}>
        <OffthreadVideo src={staticFile('r26/ramp1.mp4')} muted style={style} />
      </Sequence>
      <Sequence from={X2} durationInFrames={S2}>
        <AbsoluteFill style={{opacity: x}}>
          <OffthreadVideo src={staticFile('r26/slow2.mp4')} muted style={style} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------- хук на красных плашках ----------
const HookPlate: React.FC<{t: string; size: number; at: number; dur: number}> = ({t, size, at, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = at <= 0 ? 1 : spring({frame: f - at, fps, config: {damping: 11, stiffness: 260, mass: 0.45}});
  const out = interpolate(f, [dur - 6, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{display: 'flex', justifyContent: 'center', margin: '12px 0', opacity: Math.min(1, p * 1.4) * out, transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -6}deg)`}}>
      <span
        style={{
          fontFamily: OSW,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.05,
          color: '#fff',
          background: RED,
          padding: '0.06em 0.3em 0.1em',
          borderRadius: '0.12em',
          textTransform: 'uppercase',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}
      >
        {t}
      </span>
    </div>
  );
};

// ---------- уведомления: сыплются в суете, улетают вверх при замедлении ----------
const NOTES: {t: string; s: string; x: number; y: number; r: number}[] = [
  {t: 'Напоминание', s: 'Успеть всё до вечера', x: -40, y: 300, r: -2},
  {t: 'Пропущенные вызовы', s: '3 пропущенных', x: 50, y: 470, r: 1.5},
  {t: 'Сообщение', s: 'Ты где? Все уже собрались', x: -30, y: 640, r: -1},
  {t: 'Календарь', s: 'Через 5 минут: встреча', x: 40, y: 810, r: 2},
  {t: 'Сообщение', s: 'Срочно перезвони!', x: -50, y: 980, r: -1.5},
];
const NOTE_AT = [44, 52, 60, 67, 74];

const Bell: React.FC = () => (
  <svg width={64} height={64} viewBox="0 0 64 64">
    <rect width={64} height={64} rx={16} fill={RED} />
    <path d="M32 14c-7 0-12 5-12 12v9l-4 6h32l-4-6v-9c0-7-5-12-12-12z" fill="#fff" />
    <circle cx={32} cy={47} r={4.5} fill="#fff" />
  </svg>
);

const Notes: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      {NOTES.map((n, i) => {
        const p = spring({frame: f - NOTE_AT[i], fps, config: {damping: 13, stiffness: 240, mass: 0.5}});
        // улетают вверх медленно, растворяются и размываются
        const fly = interpolate(f, [RAMP_B - 10 + i * 4, RAMP_B + 50 + i * 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
        const o = Math.min(1, p * 1.4) * (1 - fly);
        if (o <= 0.001) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 90 + n.x,
              right: 90 - n.x,
              top: n.y,
              opacity: o,
              transform: `translateY(${(1 - p) * -70 - fly * 260}px) scale(${(0.85 + 0.15 * p) * (1 - 0.15 * fly)}) rotate(${n.r + fly * n.r * 4}deg)`,
              filter: `blur(${(fly * 10).toFixed(2)}px)`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                background: 'rgba(250,250,250,0.92)',
                borderRadius: 34,
                padding: '22px 28px',
                boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
                fontFamily: SANS,
              }}
            >
              <Bell />
              <div style={{flex: 1}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 600, color: '#1a1a1a'}}>
                  <span>{n.t}</span>
                  <span style={{color: '#8a8a8a', fontWeight: 600, fontSize: 26}}>сейчас</span>
                </div>
                <div style={{fontSize: 34, fontWeight: 600, color: '#333', marginTop: 4}}>{n.s}</div>
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- спокойный текст: буквы проявляются из размытия ----------
const SoftLine: React.FC<{t: string; at: number; size: number; color?: string; out?: number; outDur?: number}> = ({t, at, size, color = '#fff', out, outDur = 18}) => {
  const f = useCurrentFrame();
  const fade = out === undefined ? 1 : interpolate(f, [out, out + outDur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dark = color !== '#fff';
  return (
    <div
      style={{
        fontFamily: SERIF,
        fontStyle: 'italic',
        fontWeight: 500,
        fontSize: size,
        lineHeight: 1.12,
        color,
        textAlign: 'center',
        textShadow: dark ? '0 2px 18px rgba(255,255,255,0.6)' : '0 2px 6px rgba(0,0,0,0.5), 0 6px 26px rgba(0,0,0,0.55)',
        opacity: fade,
        whiteSpace: 'nowrap',
      }}
    >
      {Array.from(t).map((ch, i) => {
        const p = interpolate(f, [at + i * 1.4, at + i * 1.4 + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
        return (
          <span key={i} style={{display: 'inline-block', opacity: p, filter: `blur(${((1 - p) * 8).toFixed(2)}px)`, transform: `translateY(${(1 - p) * 14}px)`, whiteSpace: 'pre'}}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// дворник «стирает» фразу слева направо
const WiperWipe: React.FC<{children: React.ReactNode; a: number; b: number}> = ({children, a, b}) => {
  const f = useCurrentFrame();
  const x = interpolate(f, [a, b], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
  return (
    <div style={{WebkitMaskImage: `linear-gradient(90deg, transparent ${x - 8}%, black ${x + 8}%)`, maskImage: `linear-gradient(90deg, transparent ${x - 8}%, black ${x + 8}%)`} as React.CSSProperties}>
      {children}
    </div>
  );
};

const DarkBand: React.FC<{a: number; b: number}> = ({a, b}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [a, a + 20, b - 20, b], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o, background: 'linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.35) 72%, rgba(0,0,0,0.35) 84%, rgba(0,0,0,0) 94%)'}} />;
};

// финал: светлая дымка
const END = 500;
const Haze: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [END - 10, END + 30], [0, 0.62], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
  return <AbsoluteFill style={{background: '#f4f1ec', opacity: o}} />;
};

export const SpeshkaReel: React.FC = () => {
  useOswald2();
  useInter();
  useCormorant();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Footage />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.38) 100%)'}} />
      <Haze />

      {/* хук */}
      <Sequence from={0} durationInFrames={56}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 560, left: 0, right: 0}}>
            <HookPlate t="Куда ты" size={150} at={0} dur={56} />
            <HookPlate t="так спешишь?" size={130} at={0} dur={56} />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={0} durationInFrames={200}>
        <Notes />
      </Sequence>

      {/* спокойная часть 1 */}
      <DarkBand a={130} b={280} />
      <Sequence from={0} durationInFrames={290}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1340, left: 0, right: 0}}>
            <SoftLine t="Мы так спешим доехать," at={140} size={78} out={250} />
            <SoftLine t="что не замечаем дорогу." at={180} size={78} out={256} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* спокойная часть 2: дворник стирает фразу */}
      <DarkBand a={278} b={490} />
      <Sequence from={0} durationInFrames={420}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1340, left: 0, right: 0}}>
            <WiperWipe a={352} b={396}>
              <SoftLine t="А жизнь не там," at={290} size={82} />
              <SoftLine t="куда мы спешим." at={316} size={82} />
            </WiperWipe>
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={0} durationInFrames={500}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1340, left: 0, right: 0}}>
            <SoftLine t="Она здесь." at={410} size={88} out={480} />
            <SoftLine t="Сейчас." at={440} size={110} out={480} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* финал */}
      <Sequence from={END}>
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{marginTop: -80}}>
            <SoftLine t="Притормози." at={14} size={150} color="#1e1e1e" />
            <div style={{height: 40}} />
            <SoftLine t="Отправь тому, кто всё время спешит" at={40} size={60} color="#3a3a3a" />
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Версия 2 (Катя 12.11, лучшее из её второго варианта): тексты глубже, бегущие «БЫСТРЕЕ» и «УСПЕТЬ»,
// строка состояния «08:17 · РЕЖИМ: СПЕШКА» с бегущими часами (в финале «РЕЖИМ: ЖИЗНЬ»), «СТОП.» с разрезом
// кадра на полосы в момент торможения. Длинные тире из её варианта заменены (правило Кати).

const S2B = 306;
export const SPESHKA2_FRAMES = X2 + S2B;
const END2 = 420;
const STOP = 92;

// бегущая строка из повторов слова
const Ticker: React.FC<{word: string; y: number; dir: 1 | -1; rot: number; size: number; a: number; b: number}> = ({word, y, dir, rot, size, a, b}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [a, a + 4, b - 6, b], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const x = dir * (f - a) * 22 - (dir > 0 ? 900 : 200);
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: 0,
        whiteSpace: 'nowrap',
        transform: `translateX(${x}px) rotate(${rot}deg)`,
        opacity: o,
        fontFamily: OSW,
        fontWeight: 700,
        fontSize: size,
        color: '#fff',
        textShadow: '0 4px 16px rgba(0,0,0,0.55)',
        letterSpacing: '0.02em',
      }}
    >
      {Array(8).fill(word).join('   ')}
    </div>
  );
};

// строка состояния: часы бегут в суете, замирают при замедлении
const StatusBar: React.FC = () => {
  const f = useCurrentFrame();
  const calm = calmAt(f);
  const mins = 17 + Math.floor(Math.min(f, RAMP_A) / 3) + Math.floor(Math.max(0, Math.min(f, RAMP_B) - RAMP_A) / 12);
  const hh = 8 + Math.floor(mins / 60);
  const mm = mins % 60;
  const life = f >= END2 + 20;
  const blink = Math.floor(f / 8) % 2 === 0;
  const o = interpolate(f, [0, 3], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 120, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontFamily: OSW,
            fontWeight: 700,
            fontSize: 40,
            letterSpacing: '0.08em',
            color: life ? '#1e1e1e' : '#fff',
            background: life ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.38)',
            padding: '6px 24px 8px',
            borderRadius: 40,
          }}
        >
          <span style={{width: 18, height: 18, borderRadius: 9, background: life ? '#3a9d5d' : RED, opacity: calm > 0.5 || blink ? 1 : 0.25}} />
          <span>{`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · РЕЖИМ: ${life ? 'ЖИЗНЬ' : 'СПЕШКА'}`}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// «СТОП.»: кадр режется на полосы, полосы смещаются и возвращаются
const SLICES = 5;
const SliceStop: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const local = f - STOP;
  if (local < 0 || local > 22) return <>{children}</>;
  return (
    <AbsoluteFill>
      {Array.from({length: SLICES}).map((_, i) => {
        const p = interpolate(local, [i * 1.5, i * 1.5 + 5, 14 + i, 22], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
        const dy = (i % 2 === 0 ? -1 : 1) * 45 * p;
        const l = (i * 100) / SLICES;
        const r = 100 - ((i + 1) * 100) / SLICES;
        return (
          <AbsoluteFill key={i} style={{clipPath: `inset(0 ${r}% 0 ${l}%)`, transform: `translateY(${dy}px)`}}>
            {children}
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.0) 100%)'}} />
    </AbsoluteFill>
  );
};

const Footage2: React.FC = () => {
  const f = useCurrentFrame();
  const calm = calmAt(f);
  const amp = (1 - calm) * 7;
  const jx = amp * Math.sin(f * 2.3) * Math.cos(f * 0.7);
  const jy = amp * Math.sin(f * 1.7 + 1.3);
  const rot = (1 - calm) * 0.35 * Math.sin(f * 1.1);
  const zoom = interpolate(f, [0, RAMP_B, SPESHKA2_FRAMES], [1.1, 1.05, 1.0]);
  const filter = `contrast(${1.12 - 0.1 * calm}) saturate(${0.72 + 0.33 * calm}) brightness(${0.94 + 0.08 * calm}) sepia(${0.12 * calm}) hue-rotate(${-10 * (1 - calm)}deg)`;
  const x = interpolate(f, [X2, X2 + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const style: React.CSSProperties = {position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter};
  return (
    <AbsoluteFill style={{overflow: 'hidden', transform: `translate(${jx}px, ${jy}px) rotate(${rot}deg) scale(${zoom})`}}>
      <Sequence from={0} durationInFrames={R1}>
        <OffthreadVideo src={staticFile('r26/ramp1.mp4')} muted style={style} />
      </Sequence>
      <Sequence from={X2} durationInFrames={S2B}>
        <AbsoluteFill style={{opacity: x}}>
          <OffthreadVideo src={staticFile('r26/slow2.mp4')} muted style={style} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

const Haze2: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [END2 - 10, END2 + 30], [0, 0.62], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
  return <AbsoluteFill style={{background: '#f4f1ec', opacity: o}} />;
};

export const SpeshkaReel2: React.FC = () => {
  useOswald2();
  useInter();
  useCormorant();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <SliceStop>
        <Footage2 />
      </SliceStop>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.38) 100%)'}} />
      <Haze2 />
      <StatusBar />

      {/* суета: бегущие слова и хук */}
      <Ticker word="БЫСТРЕЕ" y={300} dir={-1} rot={-6} size={92} a={0} b={52} />
      <Ticker word="УСПЕТЬ" y={1240} dir={1} rot={-6} size={92} a={0} b={52} />
      <Sequence from={0} durationInFrames={54}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 580, left: 0, right: 0}}>
            <HookPlate t="Ты не устала" size={130} at={0} dur={54} />
            <HookPlate t="жить на" size={110} at={0} dur={54} />
            <HookPlate t="скорости ×2?" size={130} at={0} dur={54} />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={0} durationInFrames={200}>
        <Notes />
      </Sequence>

      {/* СТОП. */}
      <Sequence from={STOP} durationInFrames={30}>
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <HookPlate t="Стоп." size={200} at={1} dur={30} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={STOP} durationInFrames={10}>
        <AbsoluteFill style={{backgroundColor: '#fff', opacity: 0.35}} />
      </Sequence>

      {/* спокойная часть 1 */}
      <DarkBand a={130} b={280} />
      <Sequence from={0} durationInFrames={290}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1290, left: 0, right: 0}}>
            <SoftLine t="Спешка не всегда про дела." at={135} size={76} out={250} />
            <SoftLine t="Иногда это способ" at={185} size={76} out={254} />
            <SoftLine t="не чувствовать." at={205} size={84} out={258} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* спокойная часть 2: дворник стирает фразу */}
      <DarkBand a={278} b={420} />
      <Sequence from={0} durationInFrames={420}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1340, left: 0, right: 0}}>
            <WiperWipe a={352} b={396}>
              <SoftLine t="Пока ты гонишься за жизнью," at={286} size={74} />
              <SoftLine t="она идёт мимо." at={316} size={84} />
            </WiperWipe>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* финал */}
      <Sequence from={END2}>
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{marginTop: -80}}>
            <SoftLine t="Притормози." at={14} size={150} color="#1e1e1e" />
            <SoftLine t="Ты уже живёшь." at={44} size={92} color="#1e1e1e" />
            <div style={{height: 40}} />
            <SoftLine t="Отправь тому, кто всё время спешит" at={80} size={60} color="#3a3a3a" />
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
