import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {KWord, useOswald2} from './UgadajReel';
import {RED} from './SerijaReel';

// Рилс 30 «Ноябрь. Открываю шторы...» (14.11): видео Кати из окна (дождь, 240 к/с) и её готовое видео с отдыха.
// Рука открывает шторы, за окном дождь (дома напротив размыты: по виду из окна не узнать, где живёт Катя),
// «закрываю глаза»: наезд в капли, вспышка тёплого света, лето. Финал: стоп-кадр с лицом и вопрос.

const CUR = 78; // curtain.mp4
const DROPS = 90; // drops.mp4 (0,5x)
const D0 = CUR - 6;
const T0 = D0 + DROPS - 8; // переход в лето
const XT = 18;
const REST = 343; // до кадра 342 (дальше размытая склейка), стоп-кадр 342
const S0 = T0 + 6;
const FREEZE = 66;
export const NOYABR_FRAMES = S0 + REST + FREEZE;

const Plate: React.FC<{t: string; size: number; at: number; dur: number; light?: boolean}> = ({t, size, at, dur, light}) => {
  const f = useCurrentFrame();
  const p = at <= 0 ? 1 : interpolate(f, [at, at + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))});
  const out = interpolate(f, [dur - 6, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{display: 'flex', justifyContent: 'center', margin: '10px 0', opacity: Math.min(1, p * 1.5) * out, transform: `scale(${0.7 + 0.3 * p})`}}>
      <span
        style={{
          fontFamily: 'Oswald, "DejaVu Sans Condensed", sans-serif',
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.08,
          color: light ? '#1d2a33' : '#fff',
          background: light ? 'rgba(255,255,255,0.9)' : RED,
          padding: '0.06em 0.3em 0.1em',
          borderRadius: '0.12em',
          textTransform: 'uppercase',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          whiteSpace: 'nowrap',
        }}
      >
        {t}
      </span>
    </div>
  );
};

const Rain: React.FC = () => {
  const f = useCurrentFrame();
  const cold = 'saturate(0.6) contrast(1.05) brightness(0.95) hue-rotate(-10deg)';
  const dIn = interpolate(f, [D0, D0 + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // «закрываю глаза»: наезд в капли и размытие
  const dive = interpolate(f, [T0 - 24, T0 + 6], [1, 2.4], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const dblur = 7 + interpolate(f, [T0 - 20, T0 + 6], [0, 26], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={CUR}>
        <OffthreadVideo src={staticFile('r30/curtain.mp4')} muted style={{width: '100%', height: '100%', objectFit: 'cover', filter: `${cold} blur(2.5px)`, transform: `scale(${interpolate(f, [0, CUR], [1.0, 1.06])})`}} />
        {/* окно и двор в верхней части кадра размыты сильнее (проверка 14.11) */}
        <AbsoluteFill
          style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            WebkitMaskImage: 'linear-gradient(180deg, black 0%, black 52%, transparent 66%)',
            maskImage: 'linear-gradient(180deg, black 0%, black 52%, transparent 66%)',
          } as React.CSSProperties}
        />
      </Sequence>
      <Sequence from={D0} durationInFrames={DROPS + 10}>
        <AbsoluteFill style={{opacity: dIn, overflow: 'hidden'}}>
          <OffthreadVideo src={staticFile('r30/drops.mp4')} muted style={{width: '100%', height: '100%', objectFit: 'cover', filter: `${cold} blur(${(dblur + 5).toFixed(1)}px)`, transform: `scale(${1.05 * dive})`, transformOrigin: '50% 45%'}} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

const Summer: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [T0, T0 + XT], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const z = interpolate(f, [T0, T0 + XT], [1.25, 1.0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const bl = interpolate(f, [T0, T0 + XT], [18, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fz = interpolate(f, [S0 + REST - 1, NOYABR_FRAMES], [1.0, 1.08], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', filter: `saturate(1.12) contrast(1.04) blur(${bl.toFixed(1)}px)`};
  return (
    <AbsoluteFill style={{opacity: o, transform: `scale(${z})`}}>
      <Sequence from={S0 - 6} durationInFrames={REST + 6}>
        <OffthreadVideo src={staticFile('r30/rest.mp4')} muted style={style} />
      </Sequence>
      <Sequence from={S0 + REST - 1}>
        <AbsoluteFill style={{overflow: 'hidden'}}>
          <Img src={staticFile('r30/rest_last.jpg')} style={{...style, transform: `scale(${fz})`, transformOrigin: '50% 40%'}} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// тёплая вспышка на переходе
const Glow: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [T0 - 6, T0 + 2, T0 + 16], [0, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o, background: 'radial-gradient(circle at 50% 45%, #fff6dc 0%, #ffd27a 45%, rgba(255,170,90,0.6) 100%)'}} />;
};

export const NoyabrReel: React.FC = () => {
  useOswald2();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Rain />
      <Summer />
      <Glow />
      {/* хук */}
      <Sequence from={0} durationInFrames={D0 + 4}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 420, left: 0, right: 0}}>
            <Plate t="Ноябрь." size={130} at={0} dur={D0 + 4} light />
            <Plate t="Открываю шторы..." size={92} at={0} dur={D0 + 4} light />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={D0 + 4} durationInFrames={T0 - D0 - 10}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 420, left: 0, right: 0}}>
            <Plate t="а там дождь 🌧" size={110} at={0} dur={T0 - D0 - 10} light />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={T0 - 30} durationInFrames={36}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 860, left: 0, right: 0}}>
            <Plate t="Закрываю глаза..." size={96} at={2} dur={36} light />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={S0 + 8} durationInFrames={100}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 200, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <KWord t="и я снова тут" at={2} size={104} from="left" dur={100} />
            <KWord t="☀️" at={10} size={150} from="up" dur={100} />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={S0 + REST - 30}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 1180, left: 0, right: 0}}>
            <Plate t="Куда бы ты сейчас" size={84} at={4} dur={200} />
            <Plate t="улетела? 👇" size={110} at={12} dur={200} />
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
