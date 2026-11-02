import React from 'react';
import {
  AbsoluteFill,
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

// Рилс 13 «Свой тренер»: кадры Кати из зала, титры по сценарию (scenarii/rils-13-sport-svoj-trener.md),
// в конце «было / стало». Фон на видео и фото размыт заранее (tools/video_portrait_blur.py, portrait_blur.py),
// чтобы не было вывесок, логотипов зала и чужих людей. Звука нет: музыку Катя добавляет из библиотеки Instagram.

const GOLD = '#f6dca4';
type Line = {t: string; gold?: boolean; big?: boolean};
type Scene = {
  dur: number;
  src: string;
  photo?: boolean;
  slow?: boolean; // клип 60 к/с, играем вдвое медленнее
  pos?: string; // objectPosition для фото
  z?: [number, number];
  origin?: string; // точка зума
  lines: Line[];
};

const S = (p: string) => `sport/${p}`;

const SCENES: Scene[] = [
  {dur: 78, src: S('c1.mp4'), slow: true, z: [1.42, 1.26], origin: '72% 62%', lines: [{t: 'Говорят, у меня'}, {t: 'фигура 25-летней', gold: true, big: true}]},
  {dur: 72, src: S('c2.mp4'), z: [1.0, 1.08], lines: [{t: 'Но пять лет тренировок'}, {t: 'такого результата не дали.', big: true}]},
  {dur: 72, src: S('c3.mp4'), z: [1.08, 1.0], lines: [{t: 'Он появился'}, {t: 'за последние три месяца.', gold: true, big: true}]},
  {dur: 54, src: S('c4.mp4'), z: [1.0, 1.1], lines: [{t: 'Знаешь,'}, {t: 'что изменилось?', gold: true, big: true}]},
  {dur: 66, src: S('c8.mp4'), z: [1.06, 1.0], lines: [{t: 'Я нашла'}, {t: 'своего тренера.', gold: true, big: true}]},
  {dur: 66, src: S('sq1.jpg'), photo: true, pos: '45% 50%', z: [1.0, 1.08], lines: [{t: 'Раньше было: тут тяжело,'}, {t: 'это не хочу.', big: true}]},
  {dur: 60, src: S('sq2.jpg'), photo: true, pos: '50% 50%', z: [1.08, 1.0], lines: [{t: 'Сейчас я всё делаю'}, {t: 'с кайфом.', gold: true, big: true}]},
  {dur: 54, src: S('c5.mp4'), z: [1.05, 1.0], lines: [{t: 'И нет,'}, {t: 'я не голодаю,', big: true}]},
  {dur: 54, src: S('c6.mp4'), slow: true, z: [1.0, 1.06], lines: [{t: 'не живу в зале.', big: true}]},
  {dur: 78, src: S('c7.mp4'), z: [1.0, 1.08], lines: [{t: '2 раза в неделю', big: true, gold: true}, {t: 'тренировка и питание по плану.'}]},
  {dur: 30, src: S('posle1.jpg'), photo: true, pos: '50% 45%', z: [1.0, 1.06], lines: [{t: 'Тело подтянулось.', big: true}]},
  {dur: 30, src: S('c9.mp4'), slow: true, z: [1.06, 1.0], lines: [{t: 'Мышцы рельефные.', big: true, gold: true}]},
  {dur: 30, src: S('posle2.jpg'), photo: true, pos: '45% 45%', z: [1.0, 1.06], lines: [{t: 'Энергии гораздо больше.', big: true}]},
];
const REVEAL = 120;
const END = 45;
const STARTS = SCENES.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].dur], []);
const MAIN = STARTS[STARTS.length - 1] + SCENES[SCENES.length - 1].dur;
export const SPORT_FRAMES = MAIN + REVEAL + END;

const fit = (t: string, size: number) => Math.min(size, Math.floor(980 / (t.length * 0.6)));

const Title: React.FC<{lines: Line[]; dur: number; first?: boolean; top?: number}> = ({lines, dur, first, top = 300}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(f, [dur - 5, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1.08,
        opacity: out,
        textShadow: '0 4px 28px rgba(0,0,0,0.6), 0 0 3px rgba(0,0,0,0.5)',
      }}
    >
      {lines.map((l, i) => {
        const p = spring({frame: f - i * 4 + (first ? 10 : 0), fps, config: {damping: 13, stiffness: 190, mass: 0.55}});
        const size = fit(l.t, l.big ? 96 : 66);
        return (
          <div
            key={i}
            style={{
              fontSize: size,
              fontWeight: l.big ? 900 : 700,
              color: l.gold ? GOLD : '#fff',
              whiteSpace: 'nowrap',
              opacity: Math.min(1, p * 1.4),
              transform: `translateY(${(1 - p) * 34}px) scale(${0.86 + 0.14 * p})`,
            }}
          >
            {l.t}
          </div>
        );
      })}
    </div>
  );
};

const Media: React.FC<{s: Scene; dur: number; first?: boolean}> = ({s, dur, first}) => {
  const f = useCurrentFrame();
  const [z0, z1] = s.z ?? [1, 1.06];
  const punch = first ? 0 : Math.pow(Math.max(0, 1 - f / 7), 2); // первый кадр (хук) чёткий
  const scale = interpolate(f, [0, dur], [z0, z1], {easing: Easing.bezier(0.22, 0.61, 0.36, 1)}) * (1 + 0.1 * punch);
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: s.pos ?? '50% 50%',
  };
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: s.origin ?? '50% 50%',
          filter: `blur(${5 * punch}px) contrast(1.06) saturate(1.08) brightness(1.03)`,
        }}
      >
        {s.photo ? (
          <Img src={staticFile(s.src)} style={style} />
        ) : (
          <OffthreadVideo src={staticFile(s.src)} muted playbackRate={s.slow ? 0.5 : 1} style={style} />
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{backgroundColor: '#fff', opacity: 0.25 * punch}} />
    </AbsoluteFill>
  );
};

const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  // 0-26: «было» на весь экран; 26-40: шторка открывает «стало»; дальше рядом
  const wipe = interpolate(f, [26, 40], [1080, 540], {easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const flash = interpolate(f, [38, 41, 50], [0, 0.55, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const zb = interpolate(f, [0, REVEAL], [1.04, 1.1]);
  const za = interpolate(f, [26, REVEAL], [1.42, 1.3], {extrapolateLeft: 'clamp'});
  const lab = spring({frame: f - 44, fps, config: {damping: 14, stiffness: 160}});
  const labB = spring({frame: f - 4, fps, config: {damping: 14, stiffness: 160}});
  const img = (src: string, pos: string, z: number, origin = '50% 50%'): React.ReactNode => (
    <Img
      src={staticFile(src)}
      style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transform: `scale(${z})`, transformOrigin: origin}}
    />
  );
  const label = (t: string, x: number, p: number, gold?: boolean) => (
    <div
      style={{
        position: 'absolute',
        left: x,
        width: 540,
        top: 1330,
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 900,
        fontSize: 64,
        letterSpacing: '0.12em',
        color: gold ? GOLD : '#fff',
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
        textShadow: '0 4px 24px rgba(0,0,0,0.7)',
      }}
    >
      {t}
    </div>
  );
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: wipe, height: 1920, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: (wipe - 1080) / 2, top: 0, width: 1080, height: 1920}}>{img(S('do.jpg'), '45% 40%', zb)}</div>
      </div>
      <div style={{position: 'absolute', left: wipe, top: 0, width: 1080 - wipe, height: 1920, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: -270, top: 0, width: 1080, height: 1920}}>{img(S('posle2.jpg'), '46% 40%', za, '50% 52%')}</div>
      </div>
      <div style={{position: 'absolute', left: wipe - 3, top: 0, width: 6, height: 1920, background: GOLD, opacity: wipe < 1080 ? 1 : 0}} />
      <AbsoluteFill style={{background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 40%), linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 32%)'}} />
      {label('БЫЛО', wipe / 2 - 270, labB)}
      {label('СТАЛО', 540, lab, true)}
      <AbsoluteFill style={{backgroundColor: '#fff', opacity: flash}} />
      <Sequence from={44} durationInFrames={34}>
        <Title lines={[{t: 'Вот это я.', gold: true, big: true}]} dur={34} top={330} />
      </Sequence>
      <Sequence from={78} durationInFrames={REVEAL - 78}>
        <Title lines={[{t: 'Мне помогла не программа,'}, {t: 'а свой тренер.', gold: true, big: true}]} dur={REVEAL - 78 + 6} top={300} />
      </Sequence>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - 3, fps, config: {damping: 16, stiffness: 120, mass: 0.7}});
  const line = interpolate(f, [6, 22], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const z = interpolate(f, [0, END], [1.1, 1.16]);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{filter: 'brightness(0.42)', transform: `scale(${z})`}}>
        <Img src={staticFile(S('sq2.jpg'))} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#fff'}}>
        <div style={{fontSize: 104, fontWeight: 800, opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>Я Екатерина.</div>
        <div style={{width: 340 * line, height: 3, backgroundColor: GOLD, marginTop: 30}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const SportTrainer: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    {SCENES.map((s, i) => (
      <Sequence key={i} from={STARTS[i]} durationInFrames={s.dur}>
        <Media s={s} dur={s.dur} first={i === 0} />
        <AbsoluteFill style={{background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 26%, rgba(0,0,0,0) 42%)'}} />
        <Title lines={s.lines} dur={s.dur} first={i === 0} />
      </Sequence>
    ))}
    <Sequence from={MAIN} durationInFrames={REVEAL}>
      <Reveal />
    </Sequence>
    <Sequence from={MAIN + REVEAL} durationInFrames={END}>
      <EndCard />
    </Sequence>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)'}} />
  </AbsoluteFill>
);
