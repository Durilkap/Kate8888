import React from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
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

export const XT = 9; // длина перехода, кадры
// folder: папка в public (по умолчанию r23); start: с какого кадра клипа начинать
export type Seg = {src: string; from: number; dur: number; rate?: number; zoom?: [number, number]; reveal?: boolean; folder?: string; start?: number; origin?: string};

const smooth = Easing.bezier(0.45, 0, 0.2, 1);

export const MClip: React.FC<{s: Seg; first: boolean; last: boolean}> = ({s, first, last}) => {
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
        src={staticFile(`${s.folder ?? 'r23'}/${s.src}.mp4`)}
        startFrom={s.start ?? 0}
        muted
        playbackRate={s.rate ?? 1}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${base * enterZ * exitZ})`,
          transformOrigin: s.origin ?? '50% 50%',
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

export const Flash: React.FC = () => {
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

// ---------------------------------------------------------------------------
// Версия 3 «моушен 2» (Катя 10.11): вместо наклонов Катя идёт по залу; финал на подмигивании:
// стоп-кадр со вспышкой превращается в фотокарточку. Шкала прогресса из 6 точек, блик на плашках ответов,
// «смахивание» на «ПРОВЕРИМ?». Все движения по плавным кривым, без рывков.

const Dots: React.FC<{active: number; done: number}> = ({active, done}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f, fps, config: {damping: 14, stiffness: 200, mass: 0.5}});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 250, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 22}}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const isA = i === active;
          const isD = i < done;
          const s = isA ? 0.7 + 0.5 * p : 1;
          return (
            <div
              key={i}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                background: isA ? RED : isD ? '#fff' : 'rgba(0,0,0,0.45)',
                border: '4px solid #fff',
                boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                transform: `scale(${s})`,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// плашка ответа с бликом
const ShinePlate: React.FC<{t: string; size: number; delay: number; dur: number}> = ({t, size, delay, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - delay, fps, config: {damping: 13, stiffness: 210, mass: 0.55}});
  const out = interpolate(f, [dur - 5, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sh = interpolate(f, [delay + 6, delay + 22], [-60, 160], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
  return (
    <div style={{display: 'flex', justifyContent: 'center', margin: '10px 0', opacity: Math.min(1, p * 1.5) * out, transform: `translateX(${(1 - p) * -120}px) skewX(${(1 - p) * -12}deg)`}}>
      <span
        style={{
          position: 'relative',
          overflow: 'hidden',
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.12,
          color: '#fff',
          background: RED,
          padding: '0.08em 0.32em 0.1em',
          borderRadius: '0.16em',
          boxShadow: '0 10px 30px rgba(0,0,0,0.38)',
          whiteSpace: 'nowrap',
        }}
      >
        {t}
        <span
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${sh}%`,
            width: '35%',
            background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0) 100%)',
          }}
        />
      </span>
    </div>
  );
};

// «смахивание»: кадр въезжает сбоку с размытием
const Whip: React.FC<{src: string; dur: number; startFrom?: number}> = ({src, dur, startFrom = 0}) => {
  const f = useCurrentFrame();
  const e = interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const z = interpolate(f, [0, dur + XT], [1.0, 1.08], {easing: smooth});
  return (
    <AbsoluteFill style={{overflow: 'hidden', transform: `translateX(${(1 - e) * 100}%)`}}>
      <OffthreadVideo
        src={staticFile(`r23/${src}.mp4`)}
        startFrom={startFrom}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, filter: `blur(${((1 - e) * 22).toFixed(2)}px) contrast(1.05) saturate(1.08)`}}
      />
    </AbsoluteFill>
  );
};

// финал: Катя идёт к камере и подмигивает, стоп-кадр -> фотокарточка
// fr: кадр стоп-кадра в куске wink (wink_freeze.jpg = кадр fr - 1); lines: тексты финала
// clip/freeze/origin/start: свой финальный кадр (по умолчанию подмигивание из рилса 23)
export const Finale: React.FC<{dur: number; fr?: number; lines?: [string, string, string]; clip?: string; freeze?: string; origin?: string; start?: number}> = ({
  dur,
  fr = 43,
  lines = ['СКОЛЬКО УГАДАЛ?', 'ПИШИ ЦИФРУ', 'В КОММЕНТАРИЯХ'],
  clip = 'r23/wink.mp4',
  freeze = 'r23/wink_freeze.jpg',
  origin = '22% 36%', // лицо Кати (кадр сдвинут вправо 10.11)
  start = 0,
}) => {
  const FR = fr;
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const vz = interpolate(f, [0, FR], [1.0, 1.14], {extrapolateRight: 'clamp', easing: smooth});
  const enter = interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const p = spring({frame: f - FR, fps, config: {damping: 20, stiffness: 110, mass: 0.9}});
  const drift = interpolate(f, [FR + 24, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cardScale = interpolate(p, [0, 1], [1, 0.8]) * (1 + 0.025 * drift);
  const rot = interpolate(p, [0, 1], [0, -4]) + 1.2 * drift;
  const inner = interpolate(p, [0, 1], [1.14, 1.32]) * (1 + 0.04 * drift);
  const border = interpolate(p, [0, 1], [0, 22]);
  const flash = interpolate(f, [FR, FR + 2, FR + 12], [0, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const freezeSrc = staticFile(freeze);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {f < FR ? (
        <AbsoluteFill style={{overflow: 'hidden', transform: `translateX(${(1 - enter) * 100}%)`}}>
          <OffthreadVideo
            src={staticFile(clip)}
            startFrom={start}
            muted
            style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${vz})`, transformOrigin: origin, filter: `blur(${((1 - enter) * 22).toFixed(2)}px)`}}
          />
        </AbsoluteFill>
      ) : (
        <>
          <Img src={freezeSrc} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.25)', filter: 'blur(28px) brightness(0.5) saturate(1.2)'}} />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <div
              style={{
                width: 1080,
                height: 1920,
                background: '#fff',
                padding: border,
                boxSizing: 'border-box',
                transform: `scale(${cardScale}) rotate(${rot}deg)`,
                boxShadow: `0 30px 80px rgba(0,0,0,${0.55 * p})`,
                borderRadius: 18 * p,
              }}
            >
              <div style={{width: '100%', height: '100%', overflow: 'hidden', borderRadius: 10 * p}}>
                <Img src={freezeSrc} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${inner})`, transformOrigin: origin}} />
              </div>
            </div>
          </AbsoluteFill>
        </>
      )}
      <AbsoluteFill style={{backgroundColor: '#fff', opacity: flash}} />
      <Sequence from={FR + 8}>
        {lines[0] === '' ? null : <Block top={1260}>
          <RPlate t={lines[0]} size={84} dur={dur} delay={0} />
          <RPlate t={lines[1]} size={78} dur={dur} delay={8} dark />
          <RPlate t={lines[2]} size={78} dur={dur} delay={14} dark />
        </Block>}
      </Sequence>
    </AbsoluteFill>
  );
};

// хук: «ВСЕ 6?» пульсирует
const HookText: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const pulse = 1 + 0.12 * Math.sin(Math.PI * Math.min(1, Math.max(0, (f - 8) / 14)));
  const pulse2 = 1 + 0.08 * Math.sin(Math.PI * Math.min(1, Math.max(0, (f - 40) / 14)));
  return (
    <Block top={400}>
      <RPlate t="СПОРИМ," size={104} dur={dur} instant />
      <RPlate t="НЕ УГАДАЕШЬ" size={104} dur={dur} instant />
      <div style={{transform: `scale(${pulse * pulse2})`}}>
        <RPlate t="ВСЕ 6?" size={128} dur={dur} instant />
      </div>
      <RPlate t="ПО КУСОЧКУ ЭТИКЕТКИ" size={58} dur={dur} delay={10} dark />
    </Block>
  );
};

const M2_CHECK = HOOK + 5 * GD;
const M2_CHECKD = 36;
const M2_REV = M2_CHECK + M2_CHECKD;
const M2_END = M2_REV + 6 * RD;
const M2_FIN = 130;
export const UGADAJ_M2_FRAMES = M2_END + M2_FIN;

const SEGS2: Seg[] = [
  {src: 'g1', from: 0, dur: HOOK, rate: RATE_G[0], zoom: [1.0, 1.12]},
  ...[2, 3, 4, 5, 6].map((n, i) => ({src: `g${n}`, from: HOOK + i * GD, dur: GD, rate: RATE_G[n - 1], zoom: [1.0, 1.1] as [number, number]})),
];
const REV2: Seg[] = ANSWERS.map((_, i) => ({src: `a${i + 1}`, from: M2_REV + i * RD, dur: RD, rate: RATE_A[i], reveal: true}));

export const UgadajMotion2: React.FC = () => {
  useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SEGS2.map((s, i) => (
        <Sequence key={`g${i}`} from={s.from} durationInFrames={s.dur + XT}>
          <MClip s={s} first={i === 0} last={false} />
        </Sequence>
      ))}
      <Sequence from={M2_CHECK} durationInFrames={M2_CHECKD + XT}>
        <Whip src="walk" dur={M2_CHECKD} startFrom={6} />
      </Sequence>
      {REV2.map((s, i) => (
        <Sequence key={`r${i}`} from={s.from} durationInFrames={s.dur + XT}>
          <MClip s={s} first={false} last={false} />
        </Sequence>
      ))}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.32) 100%)'}} />
      <Sequence from={0} durationInFrames={HOOK}>
        <HookText dur={HOOK} />
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
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Sequence key={`dg${i}`} from={i === 0 ? 30 : HOOK + (i - 1) * GD} durationInFrames={i === 0 ? HOOK - 30 : GD}>
          <Dots active={i} done={i} />
        </Sequence>
      ))}
      <Sequence from={M2_CHECK} durationInFrames={M2_CHECKD}>
        <Block top={820}>
          <RPlate t="ПРОВЕРИМ?" size={124} dur={M2_CHECKD} delay={5} />
        </Block>
      </Sequence>
      {ANSWERS.map((a, i) => (
        <Sequence key={`a${i}`} from={M2_REV + i * RD} durationInFrames={RD}>
          <Dots active={i} done={i} />
          <Block top={1120}>
            <RPlate t={`${i + 1}`} size={110} dur={RD} delay={6} dark />
            <ShinePlate t={a} size={a.length > 16 ? 62 : a.length > 12 ? 76 : 92} dur={RD} delay={10} />
          </Block>
        </Sequence>
      ))}
      <Sequence from={M2_END} durationInFrames={M2_FIN}>
        <Finale dur={M2_FIN} />
      </Sequence>
      {[M2_CHECK + 2, M2_REV].map((fr) => (
        <Sequence key={`fl${fr}`} from={fr} durationInFrames={10}>
          <Flash />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Версия 4 (Катя 10.11): ответы не в ролике, а в комментариях; из кадров Кати только разворот и подмигивание.
// Хук, 6 загадок по 1,4 с (замедлены из 60 к/с, без повторов кадров), финал на подмигивании.
const G3 = 42;
const M3_END = HOOK + 5 * G3;
const M3_FIN = 132;
export const UGADAJ_M3_FRAMES = M3_END + M3_FIN;
const SEGS3: Seg[] = [
  {src: 'sg1', from: 0, dur: HOOK, zoom: [1.0, 1.12]},
  ...[2, 3, 4, 5, 6].map((n, i) => ({src: `sg${n}`, from: HOOK + i * G3, dur: G3, zoom: [1.0, 1.1] as [number, number]})),
];

export const UgadajMotion3: React.FC = () => {
  useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SEGS3.map((s, i) => (
        <Sequence key={`g${i}`} from={s.from} durationInFrames={s.dur + XT}>
          <MClip s={s} first={i === 0} last={false} />
        </Sequence>
      ))}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.32) 100%)'}} />
      <Sequence from={0} durationInFrames={HOOK}>
        <HookText dur={HOOK} />
      </Sequence>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const from = i === 0 ? 30 : HOOK + (i - 1) * G3;
        const dur = i === 0 ? HOOK - 30 : G3;
        return (
          <Sequence key={`b${i}`} from={from} durationInFrames={dur}>
            <Badge n={i + 1} dur={dur} />
            <Dots active={i} done={i} />
          </Sequence>
        );
      })}
      <Sequence from={M3_END} durationInFrames={M3_FIN}>
        <Finale dur={M3_FIN} fr={43} lines={['ПИШИ ВАРИАНТЫ', 'ОТВЕТЫ', 'В КОММЕНТАРИЯХ']} />
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Версия 5 (10.11): лучшее из ролика другого ИИ + наше. Тизер из кусочков этикеток в первые 0,5 с,
// хук на Кате в зале словами по одному (белые и красные курсивом, Oswald), счётчик «01 / 06» и отсчёт 3-2-1,
// плавные переходы-пролёты, финал на развороте и подмигивании со стоп-кадром. Без цен, марок и лиц покупателей.

const OSW = 'Oswald, "DejaVu Sans Condensed", sans-serif';
export const useOswald2 = () => {
  const [handle] = React.useState(() => delayRender('oswald2'));
  React.useEffect(() => {
    const cyr = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
    const lat = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD';
    const f = (file: string, range: string) =>
      new FontFace('Oswald', `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight: '700', style: 'normal', unicodeRange: range});
    Promise.all([f('oswald-cyrillic-700-normal.woff2', cyr), f('oswald-latin-700-normal.woff2', lat)].map((x) => x.load()))
      .then((l) => {
        l.forEach((x) => document.fonts.add(x));
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
};

const TSHADOW = '0 3px 0 rgba(0,0,0,0.35), 0 6px 22px rgba(0,0,0,0.55)';
// слово вылетает: сдвиг, наклон и проявление по плавной кривой
export const KWord: React.FC<{t: string; at: number; size: number; red?: boolean; from?: 'left' | 'right' | 'up'; dur: number}> = ({t, at, size, red, from = 'right', dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = at <= 0 ? 1 : spring({frame: f - at, fps, config: {damping: 15, stiffness: 190, mass: 0.6}});
  const out = interpolate(f, [dur - 5, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dx = from === 'right' ? 160 : from === 'left' ? -160 : 0;
  const dy = from === 'up' ? -60 : 0;
  return (
    <div
      style={{
        fontFamily: OSW,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.05,
        color: red ? RED : '#fff',
        fontStyle: red ? 'italic' : 'normal',
        textTransform: 'uppercase',
        textAlign: 'center',
        textShadow: red ? '0 2px 0 rgba(0,0,0,0.45), 0 6px 20px rgba(0,0,0,0.6)' : TSHADOW,
        WebkitTextStroke: '0px',
        paintOrder: 'stroke fill',
        whiteSpace: 'nowrap',
        opacity: Math.min(1, p * 1.4) * out,
        transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px) skewX(${(1 - p) * -10}deg)`,
        filter: `blur(${((1 - Math.min(1, p)) * 6).toFixed(2)}px)`,
      } as React.CSSProperties}
    >
      {t}
    </div>
  );
};

// счётчик «01 / 06» слева и отсчёт 3-2-1 справа
const Hud: React.FC<{n: number; dur: number}> = ({n, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const step = Math.floor(f / (dur / 3));
  const local = f - step * (dur / 3);
  const p = spring({frame: local, fps, config: {damping: 11, stiffness: 260, mass: 0.45}});
  const pin = spring({frame: f, fps, config: {damping: 14, stiffness: 200, mass: 0.5}});
  const out = interpolate(f, [dur - 4, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const digit = Math.max(1, 3 - step);
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div
        style={{
          position: 'absolute',
          top: 230,
          left: 70,
          fontFamily: OSW,
          fontWeight: 700,
          fontStyle: 'italic',
          fontSize: 92,
          color: RED,
          WebkitTextStroke: '2px #fff',
          paintOrder: 'stroke fill',
          textShadow: '0 6px 20px rgba(0,0,0,0.5)',
          background: 'rgba(0,0,0,0.42)',
          padding: '0 26px 4px 22px',
          borderRadius: 18,
          transform: `translateX(${(1 - pin) * -80}px)`,
          opacity: pin,
        } as React.CSSProperties}
      >
        {`0${n} / 06`}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 200,
          right: 80,
          width: 150,
          height: 150,
          borderRadius: 75,
          background: 'rgba(0,0,0,0.38)',
          border: '5px solid #fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: OSW,
          fontWeight: 700,
          fontSize: 100,
          color: '#fff',
          transform: `scale(${0.6 + 0.4 * p})`,
          boxShadow: '0 8px 26px rgba(0,0,0,0.4)',
        }}
      >
        {digit}
      </div>
    </AbsoluteFill>
  );
};

// тизер: 4 кусочка этикеток по 4 кадра
const TEASE = 16;
const Teaser: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(3, Math.floor(f / 4));
  const srcs = ['tg4', 'tg3', 'tg6', 'tg2'];
  const z = 1.25 - 0.05 * (f % 4);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile(`r23/${srcs[i]}.mp4`)} startFrom={20} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`}} />
    </AbsoluteFill>
  );
};

const H5 = 57; // хук на Кате в зале
const G5 = 48; // загадка
const M5_G = TEASE + H5;
const M5_END = M5_G + 6 * G5;
const M5_FIN = 140;
export const UGADAJ_M5_FRAMES = M5_END + M5_FIN;
const SEGS5: Seg[] = [
  {src: 'walk2', from: TEASE, dur: H5, zoom: [1.0, 1.1]},
  ...[1, 2, 3, 4, 5, 6].map((n, i) => ({src: `tg${n}`, from: M5_G + i * G5, dur: G5, zoom: [1.0, 1.1] as [number, number]})),
];

// мягкое затемнение под финальным текстом
const FinBackdrop: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 52%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0) 90%)',
        opacity: interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp'}),
      }}
    />
  );
};

const Finale5: React.FC<{dur: number}> = ({dur}) => (
  <>
    <Finale dur={dur} fr={43} lines={['', '', '']} />
  </>
);

export const UgadajMotion5: React.FC = () => {
  useMontserrat();
  useOswald2();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Sequence from={0} durationInFrames={TEASE}>
        <Teaser />
      </Sequence>
      {SEGS5.map((s, i) => (
        <Sequence key={`g${i}`} from={s.from} durationInFrames={s.dur + XT}>
          <MClip s={s} first={false} last={false} />
        </Sequence>
      ))}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.32) 100%)'}} />
      {/* хук словами */}
      <Sequence from={TEASE} durationInFrames={H5}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 250, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <KWord t="Спорим," at={2} size={120} from="left" dur={H5} />
            <KWord t="не угадаешь" at={8} size={120} from="right" dur={H5} />
            <KWord t="все 6?" at={14} size={170} red from="up" dur={H5} />
            <KWord t="по кусочку этикетки" at={22} size={66} from="right" dur={H5} />
          </div>
        </AbsoluteFill>
      </Sequence>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Sequence key={`h${i}`} from={M5_G + i * G5} durationInFrames={G5}>
          <Hud n={i + 1} dur={G5} />
        </Sequence>
      ))}
      <Sequence from={M5_END} durationInFrames={M5_FIN}>
        <Finale5 dur={M5_FIN} />
      </Sequence>
      {/* финальные слова поверх карточки */}
      <Sequence from={M5_END + 50} durationInFrames={M5_FIN - 50}>
        <AbsoluteFill>
          <FinBackdrop />
          <div style={{position: 'absolute', top: 1200, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <KWord t="Сколько из 6 угадал?" at={1} size={84} from="left" dur={M5_FIN} />
            <KWord t="пиши цифру в комментариях" at={9} size={66} red from="right" dur={M5_FIN} />
            <KWord t="подпишись: дальше сложнее" at={18} size={54} from="up" dur={M5_FIN} />
          </div>
        </AbsoluteFill>
      </Sequence>
      {[TEASE].map((fr) => (
        <Sequence key={`fl${fr}`} from={fr} durationInFrames={10}>
          <Flash />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
