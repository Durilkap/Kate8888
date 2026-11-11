import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {RED} from './SerijaReel';
import {Finale, Flash, KWord, MClip, Seg, useOswald2, XT} from './UgadajReel';
import {useMontserrat} from './WordCaptions';

// Рилс 24 «Закулисье твоего холодильника», ЧЕРНОВИК (10.11) из кадров рилсов 18 и 19, пока Катя снимает новые.
// Тизер, хук на холодильнике, «провал» в этикетку на банке и выход в цех, шаги со счётчиком, Катя в цеху,
// финал на подмигивании со стоп-кадром в фотокарточке. Слова шагов черновые: Катя подтвердит шаги и порядок.
// Этикетки клиентов на рулонах не размыты (решение Кати 05.11 для серии). Без звука.

const OSW = 'Oswald, "DejaVu Sans Condensed", sans-serif';

// тизер: 4 вспышки по 4 кадра
const TEASE = 16;
const Teaser: React.FC = () => {
  const f = useCurrentFrame();
  const shots: [string, number][] = [
    ['r18/machine', 60],
    ['r19/rolls', 10],
    ['r18/line', 100],
    ['r18/rolls', 30],
  ];
  const i = Math.min(3, Math.floor(f / 4));
  const z = 1.3 - 0.06 * (f % 4);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile(`${shots[i][0]}.mp4`)} startFrom={shots[i][1]} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`}} />
    </AbsoluteFill>
  );
};

// хук на холодильнике и «провал» в банки на верхней полке
export const HOOK = 60;
export const DIVE = 24;
export const Dive: React.FC = () => {
  const f = useCurrentFrame();
  // хук: видео 0,85x (кадры 0-51 клипа), «провал»: стоп-кадр 51 (камера дальше уходит в сторону)
  const z =
    interpolate(f, [0, HOOK], [1.0, 1.08], {extrapolateRight: 'clamp'}) *
    interpolate(f, [HOOK, HOOK + DIVE], [1, 8], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  // размытие с первого кадра «провала»: марки на банках не читаются (проверка 11.11)
  const blur = interpolate(f, [HOOK, HOOK + 8, HOOK + DIVE], [0, 10, 22], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${z})`,
    transformOrigin: '60% 12%', // белая стенка над банками (проверка 11.11)
    filter: `blur(${blur.toFixed(2)}px) contrast(1.05) saturate(1.08)`,
  };
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      {f < HOOK ? (
        <OffthreadVideo src={staticFile('r18/hook.mp4')} playbackRate={0.85} muted style={style} />
      ) : (
        <Img src={staticFile('r18/hook_f51.jpg')} style={style} />
      )}
    </AbsoluteFill>
  );
};

// счётчик шага «01 / 04» и большое слово
const Step: React.FC<{n: number; total: number; word: string; dur: number}> = ({n, total, word, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pin = spring({frame: f, fps, config: {damping: 14, stiffness: 200, mass: 0.5}});
  const out = interpolate(f, [dur - 5, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
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
          background: 'rgba(0,0,0,0.42)',
          padding: '0 26px 4px 22px',
          borderRadius: 18,
          transform: `translateX(${(1 - pin) * -80}px)`,
          opacity: pin,
        } as React.CSSProperties}
      >
        {`0${n} / 0${total}`}
      </div>
      <div style={{position: 'absolute', top: 1330, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <KWord t={word} at={4} size={168} from="up" dur={dur + 10} />
      </div>
    </AbsoluteFill>
  );
};

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

const STEP = 45;
const S0 = TEASE + HOOK + DIVE - XT; // шаг 1 выплывает из размытия «провала»
const STEPS: {seg: Seg; word: string}[] = [
  {seg: {src: 'machine', folder: 'r18', start: 30, from: S0, dur: STEP, reveal: true}, word: 'ПЕЧАТЬ'},
  {seg: {src: 'line', folder: 'r18', start: 120, from: S0 + STEP, dur: STEP, zoom: [1.0, 1.1]}, word: 'ЛИНИЯ'},
  {seg: {src: 'rolls', folder: 'r19', start: 4, from: S0 + 2 * STEP, dur: STEP, zoom: [1.0, 1.1]}, word: 'РУЛОН'},
  {seg: {src: 'rolls', folder: 'r18', start: 25, from: S0 + 3 * STEP, dur: STEP, zoom: [1.0, 1.1]}, word: 'ГОТОВО'},
];
const K0 = S0 + 4 * STEP;
const KATYA: Seg[] = [
  {src: 'heels', folder: 'r19', start: 4, from: K0, dur: 36, zoom: [1.0, 1.08]},
  {src: 'walk', folder: 'r19', start: 4, from: K0 + 36, dur: 54, zoom: [1.0, 1.1]},
];
const F0 = K0 + 90;
const FIN = 132;
export const ZAKULISE_FRAMES = F0 + FIN;

export const ZakuliseReel: React.FC = () => {
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
      {[...STEPS.map((x) => x.seg), ...KATYA].map((s, i) => (
        <Sequence key={`s${i}`} from={s.from} durationInFrames={s.dur + XT}>
          <MClip s={s} first={false} last={false} />
        </Sequence>
      ))}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.3) 100%)'}} />
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
      {STEPS.map((x, i) => (
        <Sequence key={`t${i}`} from={x.seg.from + (i === 0 ? XT : 0)} durationInFrames={STEP - (i === 0 ? XT : 0)}>
          <Step n={i + 1} total={STEPS.length} word={x.word} dur={STEP - (i === 0 ? XT : 0)} />
        </Sequence>
      ))}
      <Sequence from={K0} durationInFrames={90}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <KWord t="А это я." at={4} size={130} from="left" dur={90} />
            <KWord t="В будни я здесь" at={14} size={96} red from="right" dur={90} />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={F0} durationInFrames={FIN}>
        <Finale dur={FIN} fr={34} start={20} clip="r19/wink.mp4" freeze="r19/wink_freeze54.jpg" origin="50% 48%" lines={['', '', '']} />
      </Sequence>
      <Sequence from={F0 + 46} durationInFrames={FIN - 46}>
        <FinBackdrop />
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1200, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <KWord t="Теперь ты знаешь," at={1} size={92} from="left" dur={FIN} />
            <KWord t="откуда этикетка" at={9} size={100} red from="right" dur={FIN} />
            <KWord t="подпишись: покажу больше" at={18} size={56} from="up" dur={FIN} />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={TEASE} durationInFrames={10}>
        <Flash />
      </Sequence>
    </AbsoluteFill>
  );
};
