import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {card, RED, SerijaReel, Shot} from './SerijaReel';
import {SANS, useMontserrat} from './WordCaptions';
import type {Card} from './WordCaptions';

// Рилс 23 «Угадай продукт по кусочку этикетки» (10.11): видео Кати из магазина, формат серии про этикетки
// (красная плашка). Сначала 6 загадок (кусочек этикетки крупно), «ПРОВЕРИМ?», ответы, финал с Катей.
// Названия продуктов от Кати (10.11). Без звука: музыку Катя добавит сама.

const ANSWERS = ['СЫВОРОТОЧНЫЙ НАПИТОК', 'КИСЕЛЬ', 'САЛО', 'ТОМАТНЫЙ СОУС', 'СОЕВЫЙ СОУС', 'ГЕЛЬ ДЛЯ ДУША'];
// Катя назвала 6-й «жидкое мыло»; на этикетке написано «Гель для душа» (10.11), в ответе по этикетке
const G = 36; // загадка, кадры
const A = 42; // ответ, кадры
const CHECK = 6 * G; // «ПРОВЕРИМ?»
const REV = CHECK + 24;
const END = REV + 6 * A;
export const UGADAJ_FRAMES = END + 108;

const SHOTS: Shot[] = [
  ...ANSWERS.map((_, i) => ({src: `g${i + 1}`, from: i * G, dur: G, punch: true, push: [1.0, 1.06, '50% 50%'] as [number, number, string]})),
  {src: 'end', from: CHECK, dur: 24},
  ...ANSWERS.map((_, i) => ({src: `a${i + 1}`, from: REV + i * A, dur: A, punch: true})),
  {src: 'end', from: END, dur: 108, start: 24},
];

const CARDS: Card[] = [
  card(0, 'УГАДАЕШЬ ПРОДУКТ|ПО КУСОЧКУ|ЭТИКЕТКИ?|!1', {full: true, all: true, top: 1040}),
  ...ANSWERS.slice(1).map((_, i) => card((i + 1) * G, `!${i + 2}`, {full: true, all: true, top: 1180})),
  card(CHECK, '!ПРОВЕРИМ?', {full: true, all: true}),
  ...ANSWERS.map((t, i) => card(REV + i * A, `!${i + 1}|${t}`, {full: true, all: true, top: 1130})),
  card(END, 'СКОЛЬКО УГАДАЛ?|ПИШИ|В КОММЕНТАРИЯХ', {all: true, top: 1080}),
];

export const UgadajReel: React.FC = () => (
  <SerijaReel folder="r23" shots={SHOTS} cards={CARDS} total={UGADAJ_FRAMES} flashes={[CHECK, REV]} />
);

// ---------------------------------------------------------------------------
// Версия 2 «моушен» (Катя 10.11: крутые хуки, переходы, плавный зум без рывков).
// Хук-вызов, таймер на загадках, переходы «пролёт» (плавный зум и размытие), ответы с плавным отъездом.
// Резких «рывков» зума нет: все приближения идут по плавным кривым.

const XT = 9; // длина перехода, кадры
type Seg = {src: string; from: number; dur: number; rate?: number; zoom?: [number, number]; reveal?: boolean};

const smooth = Easing.bezier(0.45, 0, 0.2, 1);

const MClip: React.FC<{s: Seg; first: boolean; last: boolean}> = ({s, first, last}) => {
  const f = useCurrentFrame();
  const len = s.dur + (last ? 0 : XT);
  const [z0, z1] = s.zoom ?? [1.0, 1.08];
  // ответ: плавный отъезд 1.45 -> 1.0 за первые 26 кадров, дальше едва заметное приближение
  const base = s.reveal
    ? interpolate(f, [0, 26], [1.45, 1.0], {extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)}) *
      interpolate(f, [26, len], [1.0, 1.03], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : interpolate(f, [0, len], [z0, z1], {easing: smooth});
  const enter = first ? 1 : interpolate(f, [0, XT], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const enterZ = first ? 1 : interpolate(f, [0, XT], [1.18, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const exitZ = last ? 1 : interpolate(f, [s.dur, len], [1, 1.22], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const blur = (1 - enter) * 14 + (last ? 0 : interpolate(f, [s.dur, len], [0, 14], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <AbsoluteFill style={{overflow: 'hidden', opacity: enter}}>
      <OffthreadVideo
        src={staticFile(`r23/${s.src}.mp4`)}
        muted
        playbackRate={s.rate ?? 1}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${base * enterZ * exitZ})`,
          filter: `blur(${blur.toFixed(2)}px) contrast(1.05) saturate(1.08)`,
        }}
      />
    </AbsoluteFill>
  );
};

// красная плашка с белым текстом (как в серии), выскакивает пружиной
const RPlate: React.FC<{t: string; size: number; delay?: number; dur: number; instant?: boolean; dark?: boolean}> = ({t, size, delay = 0, dur, instant, dark}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = instant ? 1 : spring({frame: f - delay, fps, config: {damping: 13, stiffness: 220, mass: 0.55}});
  const out = interpolate(f, [dur - 5, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{display: 'flex', justifyContent: 'center', margin: '10px 0', opacity: Math.min(1, p * 1.5) * out, transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})`}}>
      <span
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.12,
          color: dark ? RED : '#fff',
          background: dark ? '#fff' : RED,
          padding: '0.08em 0.32em 0.1em',
          borderRadius: '0.16em',
          boxShadow: '0 10px 30px rgba(0,0,0,0.38)',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {t}
      </span>
    </div>
  );
};

const Block: React.FC<{top: number; children: React.ReactNode}> = ({top, children}) => (
  <AbsoluteFill>
    <div style={{position: 'absolute', top, left: 0, right: 0}}>{children}</div>
  </AbsoluteFill>
);

// номер загадки в белом круге и полоска таймера
const Badge: React.FC<{n: number; dur: number}> = ({n, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f, fps, config: {damping: 12, stiffness: 230, mass: 0.5}});
  const t = interpolate(f, [0, dur], [1, 0], {extrapolateRight: 'clamp'});
  const out = interpolate(f, [dur - 4, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', top: 1150, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div
          style={{
            width: 170,
            height: 170,
            borderRadius: 85,
            background: '#fff',
            color: RED,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 120,
            lineHeight: '170px',
            textAlign: 'center',
            boxShadow: '0 12px 34px rgba(0,0,0,0.4)',
            transform: `scale(${0.4 + 0.6 * p}) rotate(${(1 - p) * -25}deg)`,
          }}
        >
          {n}
        </div>
        <div style={{marginTop: 28, width: 460, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.35)', overflow: 'hidden'}}>
          <div style={{width: `${t * 100}%`, height: '100%', background: RED, borderRadius: 8}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{backgroundColor: '#fff', opacity: interpolate(f, [0, 2, 9], [0, 0.75, 0], {extrapolateRight: 'clamp'})}} />;
};

// тайминг
const HOOK = 72; // загадка 1 с хуком
const GD = 36;
const RD = 45;
const M_CHECK = HOOK + 5 * GD;
const M_REV = M_CHECK + 30;
const M_END = M_REV + 6 * RD;
export const UGADAJ_M_FRAMES = M_END + 105;

const RATE_G = [0.58, 0.95, 0.95, 0.8, 0.95, 0.95];
const RATE_A = [0.88, 1, 1, 0.88, 1, 0.95];
const SEGS: Seg[] = [
  {src: 'g1', from: 0, dur: HOOK, rate: RATE_G[0], zoom: [1.0, 1.12]},
  ...[2, 3, 4, 5, 6].map((n, i) => ({src: `g${n}`, from: HOOK + i * GD, dur: GD, rate: RATE_G[n - 1], zoom: [1.0, 1.1] as [number, number]})),
  {src: 'end', from: M_CHECK, dur: 30, zoom: [1.0, 1.06]},
  ...ANSWERS.map((_, i) => ({src: `a${i + 1}`, from: M_REV + i * RD, dur: RD, rate: RATE_A[i], reveal: true})),
  {src: 'end', from: M_END, dur: 105, rate: 0.95, zoom: [1.0, 1.07]},
];

export const UgadajMotion: React.FC = () => {
  useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SEGS.map((s, i) => (
        <Sequence key={`v${i}`} from={s.from} durationInFrames={s.dur + (i + 1 < SEGS.length ? XT : 0)}>
          <MClip s={s} first={i === 0} last={i + 1 === SEGS.length} />
        </Sequence>
      ))}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.32) 100%)'}} />
      {/* хук */}
      <Sequence from={0} durationInFrames={HOOK}>
        <Block top={400}>
          <RPlate t="СПОРИМ," size={104} dur={HOOK} instant />
          <RPlate t="НЕ УГАДАЕШЬ" size={104} dur={HOOK} instant />
          <RPlate t="ВСЕ 6?" size={128} dur={HOOK} instant />
          <RPlate t="ПО КУСОЧКУ ЭТИКЕТКИ" size={58} dur={HOOK} delay={10} dark />
        </Block>
      </Sequence>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const from = i === 0 ? 30 : HOOK + (i - 1) * GD;
        const dur = i === 0 ? HOOK - 30 : GD;
        return (
          <Sequence key={`b${i}`} from={from} durationInFrames={dur}>
            <Badge n={i + 1} dur={dur} />
          </Sequence>
        );
      })}
      {/* проверка */}
      <Sequence from={M_CHECK} durationInFrames={30}>
        <Block top={820}>
          <RPlate t="ПРОВЕРИМ?" size={120} dur={30} />
        </Block>
      </Sequence>
      {/* ответы */}
      {ANSWERS.map((a, i) => (
        <Sequence key={`a${i}`} from={M_REV + i * RD} durationInFrames={RD}>
          <Block top={1120}>
            <RPlate t={`${i + 1}`} size={110} dur={RD} delay={6} dark />
            <RPlate t={a} size={a.length > 16 ? 62 : a.length > 12 ? 76 : 92} dur={RD} delay={10} />
          </Block>
        </Sequence>
      ))}
      {/* финал */}
      <Sequence from={M_END} durationInFrames={105}>
        <Block top={980}>
          <RPlate t="СКОЛЬКО УГАДАЛ?" size={82} dur={120} delay={4} />
          <RPlate t="ПИШИ ЦИФРУ" size={80} dur={120} delay={14} dark />
          <RPlate t="В КОММЕНТАРИЯХ" size={80} dur={120} delay={20} dark />
        </Block>
      </Sequence>
      {[M_CHECK, M_REV].map((fr) => (
        <Sequence key={`f${fr}`} from={fr} durationInFrames={10}>
          <Flash />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
