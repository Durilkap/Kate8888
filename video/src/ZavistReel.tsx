import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useInter} from './SynReel';

// Рилс 22 «Завидуют те, кто ничего не делает» (идея Кати 09.11): спокойный мотивирующий ролик.
// Фото Unsplash (tools/prepare_r22.py), медленное приближение, мягкие переходы, белый текст поверх.
// Без звука: музыку Катя добавит из библиотеки Instagram.

const FONT = 'Inter, "DejaVu Sans", sans-serif';
const XF = 12; // переход между фото, кадры

type Slide = {img: string; text: string; dur: number; origin: string};
const SLIDES: Slide[] = [
  {img: 'bg1', text: 'Завидуют те,\nкто ничего не делает', dur: 85, origin: '50% 70%'},
  {img: 'bg2', text: 'Негатив идёт от тех, кто ничего не добился', dur: 95, origin: '50% 60%'},
  {img: 'bg3', text: 'А те, кто добивается, радуются за тебя', dur: 90, origin: '55% 45%'},
  {img: 'bg4', text: 'Потому что знают цену каждого шага', dur: 85, origin: '50% 80%'},
  {img: 'bg5', text: 'Чужой негатив не про меня', dur: 80, origin: '40% 75%'},
  {img: 'bg6', text: 'А кто рядом с тобой?', dur: 110, origin: '50% 55%'},
];
const starts = SLIDES.reduce<number[]>((a, s, i) => [...a, i === 0 ? 0 : a[i - 1] + SLIDES[i - 1].dur], []);
export const ZAVIST_FRAMES = starts[starts.length - 1] + SLIDES[SLIDES.length - 1].dur;

const Bg: React.FC<{s: Slide; first: boolean; last: boolean}> = ({s, first, last}) => {
  const f = useCurrentFrame();
  const len = s.dur + (last ? 0 : XF);
  const z = interpolate(f, [0, len], [1.0, 1.12], {easing: Easing.inOut(Easing.sin)});
  const o = first ? 1 : interpolate(f, [0, XF], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: o, overflow: 'hidden'}}>
      <Img
        src={staticFile(`r22/${s.img}.jpg`)}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, transformOrigin: s.origin, filter: 'saturate(0.9)'}}
      />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.2) 100%)'}} />
    </AbsoluteFill>
  );
};

const Text: React.FC<{s: Slide; first: boolean; last: boolean}> = ({s, first, last}) => {
  const f = useCurrentFrame();
  const inP = first ? 1 : interpolate(f, [4, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const out = last ? 1 : interpolate(f, [s.dur - 6, s.dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 80px'}}>
      <div
        style={{
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
          transform: `translateY(${(1 - inP) * 18 - 60}px)`,
        } as React.CSSProperties}
      >
        {s.text}
      </div>
    </AbsoluteFill>
  );
};

const Reel: React.FC<{texts?: string[]}> = ({texts}) => {
  useInter();
  const slides = texts ? SLIDES.map((s, i) => ({...s, text: texts[i]})) : SLIDES;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SLIDES.map((s, i) => (
        <Sequence key={`b${i}`} from={starts[i]} durationInFrames={s.dur + (i + 1 < SLIDES.length ? XF : 0)}>
          <Bg s={s} first={i === 0} last={i + 1 === SLIDES.length} />
        </Sequence>
      ))}
      {slides.map((s, i) => (
        <Sequence key={`t${i}`} from={starts[i]} durationInFrames={s.dur}>
          <Text s={s} first={i === 0} last={i + 1 === SLIDES.length} />
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
