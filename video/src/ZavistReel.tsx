import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useInter} from './SynReel';

// Рилс 22 «Завидуют те, кто ничего не делает» (идея Кати 09.11): спокойный мотивирующий ролик.
// Фото Unsplash (tools/prepare_r22.py), медленное приближение, мягкие переходы, белый текст поверх.
// Без звука: музыку Катя добавит из библиотеки Instagram.

const FONT = 'Inter, "DejaVu Sans", sans-serif';
const XF = 12; // переход между фото, кадры

// folder: папка в public (по умолчанию r22); video: фон из mp4; top: текст у верха кадра (чтобы не закрывать лицо)
type Slide = {img: string; text: string; dur: number; origin: string; folder?: string; video?: boolean; top?: number};
const SLIDES: Slide[] = [
  {img: 'bg1', text: 'Завидуют те,\nкто ничего не делает', dur: 85, origin: '50% 70%'},
  {img: 'bg2', text: 'Негатив идёт от тех, кто ничего не добился', dur: 95, origin: '50% 60%'},
  {img: 'bg3', text: 'А те, кто добивается, радуются за тебя', dur: 90, origin: '55% 45%'},
  {img: 'bg4', text: 'Потому что знают цену каждого шага', dur: 85, origin: '50% 80%'},
  {img: 'bg5', text: 'Чужой негатив не про меня', dur: 80, origin: '40% 75%'},
  {img: 'bg6', text: 'А кто рядом с тобой?', dur: 110, origin: '50% 55%'},
];
const startsOf = (sl: Slide[]) => sl.reduce<number[]>((a, s, i) => [...a, i === 0 ? 0 : a[i - 1] + sl[i - 1].dur], []);
const starts = startsOf(SLIDES);
export const ZAVIST_FRAMES = starts[starts.length - 1] + SLIDES[SLIDES.length - 1].dur;

const Bg: React.FC<{s: Slide; first: boolean; last: boolean}> = ({s, first, last}) => {
  const f = useCurrentFrame();
  const len = s.dur + (last ? 0 : XF);
  const z = interpolate(f, [0, len], [1.0, 1.12], {easing: Easing.inOut(Easing.sin)});
  const o = first ? 1 : interpolate(f, [0, XF], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: o, overflow: 'hidden'}}>
      {s.video ? (
        <OffthreadVideo
          src={staticFile(`${s.folder ?? 'r22'}/${s.img}.mp4`)}
          muted
          style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1 + (z - 1) * 0.5})`, transformOrigin: s.origin}}
        />
      ) : (
        <Img
          src={staticFile(`${s.folder ?? 'r22'}/${s.img}.jpg`)}
          style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, transformOrigin: s.origin, filter: 'saturate(0.9)'}}
        />
      )}
      <AbsoluteFill
        style={{
          background:
            s.top === undefined
              ? 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.2) 100%)'
              : 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 32%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.12) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

const Text: React.FC<{s: Slide; first: boolean; last: boolean}> = ({s, first, last}) => {
  const f = useCurrentFrame();
  const inP = first ? 1 : interpolate(f, [4, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const out = last ? 1 : interpolate(f, [s.dur - 6, s.dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={s.top === undefined ? {justifyContent: 'center', alignItems: 'center', padding: '0 80px'} : {}}>
      <div
        style={{
          ...(s.top === undefined ? {} : {position: 'absolute', top: s.top, left: 70, right: 70}),
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 76,
          lineHeight: 1.22,
          color: '#fff',
          textAlign: 'center',
          textShadow: '0 2px 8px rgba(0,0,0,0.45), 0 6px 30px rgba(0,0,0,0.45)',
          textWrap: 'balance',
          whiteSpace: 'pre-line',
          opacity: inP * out,
          transform: `translateY(${(1 - inP) * 18 - (s.top === undefined ? 60 : 0)}px)`,
        } as React.CSSProperties}
      >
        {s.text}
      </div>
    </AbsoluteFill>
  );
};

// durs: свои длительности (сумма та же, ZAVIST_FRAMES)
const Reel: React.FC<{texts?: string[]; durs?: number[]; base?: Slide[]}> = ({texts, durs, base = SLIDES}) => {
  useInter();
  const slides = base.map((s, i) => ({...s, text: texts ? texts[i] : s.text, dur: durs ? durs[i] : s.dur}));
  const st = startsOf(slides);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {slides.map((s, i) => (
        <Sequence key={`b${i}`} from={st[i]} durationInFrames={s.dur + (i + 1 < slides.length ? XF : 0)}>
          <Bg s={s} first={i === 0} last={i + 1 === slides.length} />
        </Sequence>
      ))}
      {slides.map((s, i) => (
        <Sequence key={`t${i}`} from={st[i]} durationInFrames={s.dur}>
          <Text s={s} first={i === 0} last={i + 1 === slides.length} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Версия 1: слова Кати как есть
export const ZavistReel: React.FC = () => <Reel />;

// Версия 2: мягче, по замечаниям проверки 09.11 (опыт Кати, без обобщения «все, кто критикует»)
export const ZavistReelSoft: React.FC = () => (
  <Reel
    texts={[
      'Я заметила:\nзавидуют те,\nкто ничего не делает',
      'А чужой негатив чаще говорит о том, кто его отправил',
      'Те, кто сам идёт вперёд,\nрадуются за тебя',
      'Потому что знают цену каждого шага',
      'Чужой негатив не про меня',
      'А кто рядом с тобой?',
    ]}
  />
);

// Версия 3 (Катя 09.11): жёстче, набор 2 «дерзко»; титр 3 без «всегда» и длительности по длине фраз (проверка 09.11)
export const ZavistReelHard: React.FC = () => (
  <Reel
    texts={[
      'Тебе завидуют?\nПоздравляю',
      'Значит, ты сделала то,\nна что у них\nне хватило смелости',
      'С дивана\nкритиковать легко',
      'Кто сам\nчего-то добился,\nне кричит вслед.\nЕму некогда',
      'Чужая зависть\nне мой груз',
      'Я иду дальше.\nА ты?',
    ]}
    durs={[70, 105, 75, 110, 75, 110]}
  />
);

// Версия 4 (Катя 09.11): набор 2 на фото и видео Кати (tools/prepare_r22_katya.py), текст у верха кадра
const KATYA: Slide[] = [
  {img: 'face', video: true, folder: 'r22k', text: 'Тебе завидуют?\nПоздравляю', dur: 70, origin: '50% 50%', top: 300},
  {img: 'photo_walk', folder: 'r22k', text: 'Значит, ты сделала то,\nна что у них\nне хватило смелости', dur: 105, origin: '45% 55%', top: 300},
  {img: 'sea', video: true, folder: 'r22k', text: 'С дивана\nкритиковать легко', dur: 75, origin: '50% 50%', top: 760},
  {img: 'photo_tree', folder: 'r22k', text: 'Кто сам\nчего-то добился,\nне кричит вслед.\nЕму некогда', dur: 110, origin: '52% 60%', top: 280},
  {img: 'swing', video: true, folder: 'r22k', text: 'Чужая зависть\nне мой груз', dur: 75, origin: '50% 50%', top: 300},
  {img: 'photo_balcony', folder: 'r22k', text: 'Я иду дальше.\nА ты?', dur: 110, origin: '45% 55%', top: 300},
];
export const ZavistKatya: React.FC = () => <Reel base={KATYA} />;
