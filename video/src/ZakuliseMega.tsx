import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {RED} from './SerijaReel';
import {Flash, KWord, MClip, Seg, useOswald2, XT} from './UgadajReel';
import {useMontserrat} from './WordCaptions';
import {Dive, DIVE, HOOK} from './ZakuliseReel';

// Рилс 24 «Закулисье твоего холодильника», ФИНАЛЬНЫЙ МОНТАЖ (11.11) на видео Кати с производства.
// Фишки: тизер со вспышками, хук на холодильнике и «провал» в банки, выход в цех, 6 шагов со счётчиком и полосой
// прогресса, переходы-пролёты и «смахивания» с размытием по направлению, световые блики, замедления 60 к/с,
// нарисованный кружок «ЭТО Я», галочка «ГОТОВО», финал: подмигивание, стоп-кадр в фотокарточку и корона
// (просьба Кати 11.11) с искрами. Все приближения по плавным кривым. Без звука: музыку Катя добавит сама.

const OSW = 'Oswald, "DejaVu Sans Condensed", sans-serif';
const GOLD = '#F5C542';

// ---------- переход «смахивание»: кадр въезжает сбоку, размытие только по горизонтали ----------
const WClip: React.FC<{src: string; dur: number; dir?: 1 | -1; zoom?: [number, number]; img?: boolean; id: string}> = ({src, dur, dir = 1, zoom = [1.0, 1.08], img, id}) => {
  const f = useCurrentFrame();
  const e = interpolate(f, [0, 11], [0, 1], {extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const z = interpolate(f, [0, dur + XT], zoom, {easing: Easing.bezier(0.45, 0, 0.2, 1)});
  const out = interpolate(f, [dur, dur + XT], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const blur = (1 - e) * 40 + out * 30;
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z * (1 + out * 0.18)})`, filter: `url(#${id}) contrast(1.05) saturate(1.1)`};
  return (
    <AbsoluteFill style={{overflow: 'hidden', transform: `translateX(${(1 - e) * 100 * dir}%)`}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={id} x="-10%" y="0" width="120%" height="100%">
          <feGaussianBlur stdDeviation={`${blur.toFixed(1)} 0`} />
        </filter>
      </svg>
      {img ? <Img src={staticFile(`r24/${src}`)} style={style} /> : <OffthreadVideo src={staticFile(`r24/${src}.mp4`)} muted style={style} />}
    </AbsoluteFill>
  );
};

// ---------- тёплый световой блик, проходит по кадру ----------
const Leak: React.FC<{dur: number; from?: number; to?: number}> = ({dur, from = -30, to = 130}) => {
  const f = useCurrentFrame();
  const x = interpolate(f, [0, dur], [from, to]);
  const o = interpolate(f, [0, dur * 0.35, dur * 0.65, dur], [0, 0.75, 0.75, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: o,
        background: `radial-gradient(ellipse 55% 70% at ${x}% 40%, rgba(255,170,90,0.95) 0%, rgba(255,90,60,0.55) 35%, rgba(255,60,60,0) 70%)`,
      }}
    />
  );
};

// ---------- тизер: 4 вспышки по 4 кадра ----------
const TEASE = 16;
const Teaser: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(3, Math.floor(f / 4));
  const z = 1.25 - 0.05 * (f % 4);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile(`r24/tease${i + 1}.mp4`)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`}} />
      <AbsoluteFill style={{backgroundColor: '#fff', opacity: f % 4 === 0 ? 0.35 : 0}} />
    </AbsoluteFill>
  );
};

// ---------- счётчик «01 / 06», полоса прогресса и слово шага ----------
const StepHud: React.FC<{n: number; total: number; word: string; dur: number; check?: boolean}> = ({n, total, word, dur, check}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pin = spring({frame: f, fps, config: {damping: 14, stiffness: 200, mass: 0.5}});
  const out = interpolate(f, [dur - 5, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const prog = interpolate(f, [0, dur], [(n - 1) / total, n / total], {extrapolateRight: 'clamp'});
  const ck = interpolate(f, [10, 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const ckPop = spring({frame: f - 6, fps, config: {damping: 10, stiffness: 220, mass: 0.5}});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 150, left: 70, right: 70, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.35)', overflow: 'hidden'}}>
        <div style={{width: `${prog * 100}%`, height: '100%', background: RED, borderRadius: 5}} />
      </div>
      <div style={{opacity: out}}>
        <div
          style={{
            position: 'absolute',
            top: 200,
            left: 70,
            fontFamily: OSW,
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 88,
            color: RED,
            WebkitTextStroke: '2px #fff',
            paintOrder: 'stroke fill',
            background: 'rgba(0,0,0,0.42)',
            padding: '0 24px 4px 20px',
            borderRadius: 18,
            transform: `translateX(${(1 - pin) * -80}px)`,
            opacity: pin,
          } as React.CSSProperties}
        >
          {`0${n} / 0${total}`}
        </div>
        <div style={{position: 'absolute', top: 1330, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          {check ? (
            <svg width={190} height={190} viewBox="0 0 100 100" style={{transform: `scale(${0.3 + 0.7 * ckPop})`, marginBottom: 10, filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.45))'}}>
              <circle cx={50} cy={50} r={46} fill={RED} />
              <path d="M27 52 L43 67 L74 35" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={80} strokeDashoffset={80 * (1 - ck)} />
            </svg>
          ) : null}
          <KWord t={word} at={4} size={168} from="up" dur={dur + 10} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- нарисованный от руки кружок и стрелка «ЭТО Я» ----------
const DrawnCircle: React.FC<{cx: number; cy: number; rx: number; ry: number; dur: number}> = ({cx, cy, rx, ry, dur}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const a = interpolate(f, [8, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const out = interpolate(f, [dur - 5, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const len = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2) * 1.12;
  const d = `M ${cx + rx} ${cy - 10} C ${cx + rx} ${cy - ry * 1.15}, ${cx - rx * 1.1} ${cy - ry * 1.1}, ${cx - rx} ${cy} C ${cx - rx * 0.95} ${cy + ry * 1.1}, ${cx + rx * 1.05} ${cy + ry * 1.1}, ${cx + rx * 1.02} ${cy - ry * 0.25}`;
  return (
    <AbsoluteFill style={{opacity: out}}>
      <svg width={1080} height={1920} style={{position: 'absolute', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))'}}>
        <path d={d} fill="none" stroke={RED} strokeWidth={12} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
        <path
          d={`M ${cx + 330} ${cy - ry - 230} Q ${cx + 260} ${cy - ry - 60} ${cx + rx * 0.7} ${cy - ry * 0.9}`}
          fill="none"
          stroke="#fff"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={420}
          strokeDashoffset={420 * (1 - a)}
        />
        <path
          d={`M ${cx + rx * 0.7 + 52} ${cy - ry * 0.9 - 6} L ${cx + rx * 0.7} ${cy - ry * 0.9} L ${cx + rx * 0.7 + 14} ${cy - ry * 0.9 - 52}`}
          fill="none"
          stroke="#fff"
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={a > 0.95 ? 1 : 0}
        />
      </svg>
      <div style={{position: 'absolute', left: cx + 170, top: cy - ry - 330, transform: `rotate(-6deg) scale(${0.6 + 0.4 * a})`, opacity: a}}>
        <span style={{fontFamily: OSW, fontWeight: 700, fontSize: 96, color: '#fff', textTransform: 'uppercase', textShadow: '0 4px 18px rgba(0,0,0,0.6)'}}>Это я</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------- корона ----------
const Crown: React.FC<{w: number}> = ({w}) => (
  <svg width={w} height={w * 0.72} viewBox="0 0 200 144" style={{overflow: 'visible'}}>
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFF1A8" />
        <stop offset="0.45" stopColor={GOLD} />
        <stop offset="1" stopColor="#B8860B" />
      </linearGradient>
    </defs>
    <path d="M14 120 L4 34 L54 76 L100 14 L146 76 L196 34 L186 120 Z" fill="url(#gold)" stroke="#8a6508" strokeWidth={4} strokeLinejoin="round" />
    <rect x={12} y={112} width={176} height={26} rx={8} fill="url(#gold)" stroke="#8a6508" strokeWidth={4} />
    <circle cx={4} cy={30} r={10} fill="url(#gold)" stroke="#8a6508" strokeWidth={3} />
    <circle cx={100} cy={10} r={11} fill="url(#gold)" stroke="#8a6508" strokeWidth={3} />
    <circle cx={196} cy={30} r={10} fill="url(#gold)" stroke="#8a6508" strokeWidth={3} />
    <ellipse cx={100} cy={92} rx={13} ry={16} fill={RED} stroke="#fff" strokeWidth={3} />
    <circle cx={55} cy={100} r={9} fill="#2ec4b6" stroke="#fff" strokeWidth={2.5} />
    <circle cx={145} cy={100} r={9} fill="#2ec4b6" stroke="#fff" strokeWidth={2.5} />
    <circle cx={40} cy={125} r={5} fill="#fff" />
    <circle cx={70} cy={125} r={5} fill="#fff" />
    <circle cx={100} cy={125} r={5} fill="#fff" />
    <circle cx={130} cy={125} r={5} fill="#fff" />
    <circle cx={160} cy={125} r={5} fill="#fff" />
  </svg>
);

const Sparkle: React.FC<{x: number; y: number; s: number; delay: number}> = ({x, y, s, delay}) => {
  const f = useCurrentFrame();
  const t = f - delay;
  const p = interpolate(t, [0, 6, 18], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const twinkle = t > 18 ? 0.55 + 0.45 * Math.sin((t - 18) / 3) : 0;
  const k = Math.max(p, twinkle * 0.7);
  return (
    <svg width={s} height={s} viewBox="-50 -50 100 100" style={{position: 'absolute', left: x - s / 2, top: y - s / 2, transform: `scale(${k}) rotate(${t * 4}deg)`, opacity: k > 0 ? 1 : 0}}>
      <path d="M0 -50 C6 -10 10 -6 50 0 C10 6 6 10 0 50 C-6 10 -10 6 -50 0 C-10 -6 -6 -10 0 -50 Z" fill="#FFF6C8" />
    </svg>
  );
};

// ---------- финал: видео до подмигивания, стоп-кадр в фотокарточку, корона падает на голову ----------
const FR = 38; // кадр стоп-кадра в fin.mp4 (fin_freeze.jpg = кадр 37)
const HEAD: [number, number] = [615, 415]; // макушка Кати на стоп-кадре (пиксели кадра 1080x1920)
const FinaleCrown: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const origin = '62% 30%';
  const vz = interpolate(f, [0, FR], [1.0, 1.08], {extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.2, 1)});
  const enter = interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const p = spring({frame: f - FR, fps, config: {damping: 20, stiffness: 110, mass: 0.9}});
  const drift = interpolate(f, [FR + 24, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cardScale = interpolate(p, [0, 1], [1, 0.8]) * (1 + 0.025 * drift);
  const rot = interpolate(p, [0, 1], [0, -4]) + 1.2 * drift;
  const inner = interpolate(p, [0, 1], [1.08, 1.16]);
  const border = interpolate(p, [0, 1], [0, 22]);
  const flash = interpolate(f, [FR, FR + 2, FR + 12], [0, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // корона: падает сверху с отскоком
  const cDrop = spring({frame: f - FR - 4, fps, config: {damping: 9, stiffness: 140, mass: 0.8}});
  const cy = interpolate(cDrop, [0, 1], [-900, 0]);
  const cRot = interpolate(cDrop, [0, 1], [-25, -12]);
  const shine = interpolate(f, [FR + 22, FR + 38], [-40, 140], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tag = spring({frame: f - FR - 18, fps, config: {damping: 12, stiffness: 200, mass: 0.5}});
  const CW = 430;
  const freezeSrc = staticFile('r24/fin_freeze.jpg');
  const sp: [number, number, number, number][] = [
    [HEAD[0] - 220, HEAD[1] - 170, 80, 0],
    [HEAD[0] + 230, HEAD[1] - 210, 64, 3],
    [HEAD[0] - 120, HEAD[1] - 330, 54, 6],
    [HEAD[0] + 120, HEAD[1] - 360, 72, 2],
    [HEAD[0] + 300, HEAD[1] - 40, 46, 8],
    [HEAD[0] - 300, HEAD[1] - 20, 50, 5],
  ];
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {f < FR ? (
        <AbsoluteFill style={{overflow: 'hidden', transform: `translateX(${(1 - enter) * 100}%)`}}>
          <OffthreadVideo
            src={staticFile('r24/fin.mp4')}
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
              <div style={{width: '100%', height: '100%', overflow: 'hidden', borderRadius: 10 * p, position: 'relative'}}>
                <div style={{position: 'absolute', inset: 0, transform: `scale(${inner})`, transformOrigin: origin}}>
                  <Img src={freezeSrc} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  <div style={{position: 'absolute', left: HEAD[0] - CW / 2, top: HEAD[1] - CW * 0.62, transform: `translateY(${cy}px) rotate(${cRot}deg)`, filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.45))'}}>
                    <div style={{position: 'relative', overflow: 'hidden'}}>
                      <Crown w={CW} />
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: `${shine}%`,
                          width: '30%',
                          background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
                          mixBlendMode: 'screen',
                        }}
                      />
                    </div>
                  </div>
                  {cDrop > 0.9 ? (
                    <Sequence from={FR + 14}>
                      {sp.map(([x, y, s, d], i) => (
                        <Sparkle key={i} x={x} y={y} s={s} delay={d} />
                      ))}
                    </Sequence>
                  ) : null}
                </div>
              </div>
              <div style={{position: 'absolute', left: -34, top: 150, transform: `rotate(-9deg) scale(${tag})`, transformOrigin: '0% 50%', opacity: tag}}>
                <div
                  style={{
                    fontFamily: OSW,
                    fontWeight: 700,
                    fontStyle: 'italic',
                    fontSize: 66,
                    lineHeight: 1.0,
                    color: '#fff',
                    background: RED,
                    padding: '10px 26px 14px',
                    borderRadius: 14,
                    textTransform: 'uppercase',
                    boxShadow: '0 10px 26px rgba(0,0,0,0.45)',
                    textAlign: 'left',
                  }}
                >
                  Королева
                  <br />
                  этикеток
                </div>
              </div>
            </div>
          </AbsoluteFill>
        </>
      )}
      <AbsoluteFill style={{backgroundColor: '#fff', opacity: flash}} />
    </AbsoluteFill>
  );
};

const FinBackdrop: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 54%, rgba(0,0,0,0.55) 64%, rgba(0,0,0,0.55) 82%, rgba(0,0,0,0) 92%)',
        opacity: interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp'}),
      }}
    />
  );
};

// ---------- таймлайн (30 к/с) ----------
const S0 = TEASE + HOOK + DIVE - XT;
type Step = {src: string; dur: number; word: string; kind: 'zoom' | 'whip' | 'reveal'; dir?: 1 | -1; img?: boolean; check?: boolean};
const STEPS: Step[] = [
  {src: 'mat', dur: 42, word: 'Материал', kind: 'reveal'},
  {src: 'ink', dur: 42, word: 'Краска', kind: 'whip', dir: 1},
  {src: 'print', dur: 48, word: 'Печать', kind: 'zoom'},
  {src: 'cut', dur: 42, word: 'Вырубка', kind: 'whip', dir: -1},
  {src: 'wind', dur: 42, word: 'Намотка', kind: 'zoom'},
  {src: 'done.jpg', dur: 44, word: 'Готово', kind: 'whip', dir: 1, img: true, check: true},
];
const stepFrom = STEPS.reduce<number[]>((a, s, i) => [...a, i === 0 ? S0 : a[i - 1] + STEPS[i - 1].dur], []);
const K0 = stepFrom[STEPS.length - 1] + STEPS[STEPS.length - 1].dur;
const WA = 46;
const WB = 38;
const F0 = K0 + WA + WB;
const FIN = 170;
export const ZAKULISE_MEGA_FRAMES = F0 + FIN;

export const ZakuliseMega: React.FC = () => {
  useMontserrat();
  useOswald2();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Sequence from={0} durationInFrames={TEASE}>
        <Teaser />
      </Sequence>
      <Sequence from={TEASE} durationInFrames={HOOK + DIVE}>
        <Dive />
      </Sequence>
      {STEPS.map((s, i) => {
        const from = stepFrom[i];
        if (s.kind === 'whip') {
          return (
            <Sequence key={`v${i}`} from={from} durationInFrames={s.dur + XT}>
              <WClip src={s.src} dur={s.dur} dir={s.dir} img={s.img} id={`wb${i}`} />
            </Sequence>
          );
        }
        const seg: Seg = {src: s.src, folder: 'r24', from, dur: s.dur, reveal: s.kind === 'reveal', zoom: [1.0, 1.1]};
        return (
          <Sequence key={`v${i}`} from={from} durationInFrames={s.dur + XT}>
            <MClip s={seg} first={false} last={false} />
          </Sequence>
        );
      })}
      <Sequence from={K0} durationInFrames={WA + XT}>
        <WClip src="walk_a" dur={WA} dir={-1} zoom={[1.0, 1.05]} id="wwa" />
      </Sequence>
      <Sequence from={K0 + WA} durationInFrames={WB + XT}>
        <MClip s={{src: 'walk_b', folder: 'r24', from: K0 + WA, dur: WB, zoom: [1.0, 1.06]}} first={false} last={false} />
      </Sequence>
      <Sequence from={F0} durationInFrames={FIN}>
        <FinaleCrown dur={FIN} />
      </Sequence>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.3) 100%)'}} />

      {/* световые блики на главных переходах */}
      <Sequence from={TEASE + HOOK + 6} durationInFrames={30}>
        <Leak dur={30} />
      </Sequence>
      <Sequence from={K0 - 6} durationInFrames={24}>
        <Leak dur={24} from={130} to={-30} />
      </Sequence>
      <Sequence from={F0 + FR - 4} durationInFrames={26}>
        <Leak dur={26} />
      </Sequence>

      {/* хук */}
      <Sequence from={TEASE} durationInFrames={HOOK + 6}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1180, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <KWord t="Это" at={2} size={120} from="left" dur={HOOK + 6} />
            <KWord t="закулисье" at={8} size={150} from="right" dur={HOOK + 6} />
            <KWord t="твоего холодильника" at={16} size={90} red from="up" dur={HOOK + 6} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* шаги */}
      {STEPS.map((s, i) => {
        const from = stepFrom[i] + (i === 0 ? XT : 0);
        const dur = s.dur - (i === 0 ? XT : 0);
        return (
          <Sequence key={`h${i}`} from={from} durationInFrames={dur}>
            <StepHud n={i + 1} total={STEPS.length} word={s.word} dur={dur} check={s.check} />
          </Sequence>
        );
      })}

      {/* Катя в цеху */}
      <Sequence from={K0 + 4} durationInFrames={24}>
        <DrawnCircle cx={420} cy={760} rx={120} ry={330} dur={24} />
      </Sequence>
      <Sequence from={K0 + WA} durationInFrames={WB}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <KWord t="В будни" at={2} size={130} from="left" dur={WB + 4} />
            <KWord t="я здесь" at={8} size={150} red from="right" dur={WB + 4} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* финальные слова */}
      <Sequence from={F0 + FR + 58} durationInFrames={FIN - FR - 58}>
        <FinBackdrop />
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1240, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <KWord t="Теперь ты знаешь," at={1} size={88} from="left" dur={FIN} />
            <KWord t="откуда этикетка" at={8} size={96} red from="right" dur={FIN} />
            <KWord t="подпишись: про этикетки просто" at={16} size={54} from="up" dur={FIN} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {[TEASE, K0 + WA].map((fr) => (
        <Sequence key={`fl${fr}`} from={fr} durationInFrames={10}>
          <Flash />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
