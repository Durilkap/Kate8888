import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useMontserrat, WordCaptions} from './WordCaptions';
import {PLATYE_CARDS} from './PlatyeCards';

// Рилс 39 (челлендж Лилии, день 4, 20.11): «Меня сейчас возненавидят все мамы и подружки невест...», свадебное платье.
// Голос Кати за кадром (tools/prepare_r39.py), титры по словам (tools/cards_r39.py). Кадры: видео видеографа (w3),
// селфи Кати у зеркала (v1, v2), проход к церемонии со спины (w1). Общий план w2 убран после проверки (автор не подтверждён).
// Фото фотографа не берём.
// Склейки по фразам голоса; на «корсет, перчатки, туфли» три коротких кадра.

const BLUSH = '#C2185B';
const GRADE = 'contrast(1.04) saturate(1.03) sepia(0.05) brightness(1.03)';
type Seg = {src: string; from: number; dur: number; rate?: number; z?: [number, number]; o?: string};
// from в секундах исходника, dur в кадрах ролика (30 к/с)
const SEGS: Seg[] = [
  {src: 'w3', from: 4.55, dur: 60, z: [1.0, 1.05], o: '50% 30%'},   // взгляд через плечо: «возненавидят все»
  {src: 'w3', from: 6.5, dur: 51, z: [1.02, 1.06], o: '50% 30%'},   // улыбка, руки в волосах: «мамы и подружки невест»
  {src: 'v1', from: 1.0, dur: 74, z: [1.0, 1.04], o: '50% 40%'},    // селфи у зеркала: «не с примерки»
  {src: 'w1', from: 32.4, dur: 94, z: [1.0, 1.05], o: '45% 50%'},   // идёт к церемонии в фате, у озера: «как я пришла к платью»
  {src: 'w3', from: 16.0, dur: 76, z: [1.0, 1.04], o: '50% 50%'},   // шлейф в полный рост: «не мерила салонного»
  {src: 'v2', from: 2.5, dur: 83, z: [1.0, 1.04], o: '50% 45%'},    // селфи в полный рост: «сшили на заказ. Просто посмотрите»
  {src: 'w3', from: 0.75, dur: 56, z: [1.0, 1.04], o: '50% 35%'},   // утро, улыбка: «Первое. Решите...»
  {src: 'w3', from: 22.0, dur: 35, rate: 0.77, z: [1.0, 1.04], o: '50% 35%'}, // профиль, губы: «чувствовать»
  {src: 'w3', from: 12.4, dur: 56, z: [1.0, 1.03], o: '50% 35%'},   // поворот и взгляд в камеру: «не фасон, а ощущение»
  {src: 'v1', from: 3.5, dur: 132, z: [1.0, 1.06], o: '50% 40%'},   // селфи: «Второе. Нейросеть...»
  {src: 'v2', from: 6.0, dur: 43, z: [1.0, 1.04], o: '50% 40%'},    // селфи: «Промт я дам» (проверка: общий план w2 убран, автор не подтверждён)
  {src: 'w3', from: 20.75, dur: 35, z: [1.0, 1.04], o: '50% 50%'},  // застёгивают платье: «Третье. С эскизом»
  {src: 'w3', from: 27.55, dur: 40, rate: 0.6, z: [1.04, 1.07], o: '50% 50%'}, // шнуровка: «к мастеру» (руки на платье, не на причёске)
  {src: 'w3', from: 9.0, dur: 39, z: [1.0, 1.04], o: '50% 35%'},    // руки в волосах: «которому вы доверяете»
  {src: 'v2', from: 9.0, dur: 85, z: [1.0, 1.05], o: '50% 40%'},    // селфи: «Четвёртое. Детали...» (w2 убран)
  {src: 'w3', from: 27.2, dur: 15, z: [1.04, 1.06], o: '50% 50%'},  // шнуровка: «корсет»
  {src: 'w3', from: 23.9, dur: 18, z: [1.04, 1.06], o: '50% 40%'},  // перчатки: «перчатки»
  {src: 'w3', from: 17.6, dur: 23, z: [1.04, 1.06], o: '50% 70%'},  // шлейф: «туфли»
  {src: 'v2', from: 11.2, dur: 63, z: [1.0, 1.04], o: '50% 40%'},   // селфи: «Это не про фасон»
  {src: 'w3', from: 13.0, dur: 52, z: [1.0, 1.04], o: '50% 35%'},   // поворот и взгляд в камеру: «быть собой»
  {src: 'w1', from: 35.6, dur: 30, z: [1.0, 1.05], o: '45% 50%'},   // уходит к церемонии: «Хотите промт?»
  {src: 'w3', from: 4.55, dur: 33, z: [1.02, 1.05], o: '50% 30%'},  // взгляд через плечо (как в начале): «Пишите ПЛАТЬЕ»
  {src: 'w3', from: 13.75, dur: 30, z: [1.0, 1.03], o: '50% 35%'},  // финал: улыбка в камеру
];
const STARTS = SEGS.map((_, i) => SEGS.slice(0, i).reduce((a, x) => a + x.dur, 0));
export const PLATYE_FRAMES = SEGS.reduce((a, x) => a + x.dur, 0);

const Shot: React.FC<{s: Seg; first: boolean}> = ({s, first}) => {
  const f = useCurrentFrame();
  const z = s.z ?? [1.0, 1.04];
  const punch = first ? 0 : interpolate(f, [0, 5], [0.04, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const sc = interpolate(f, [0, s.dur], z, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) + punch;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile(`r39/${s.src}.mp4`)}
        startFrom={Math.round(s.from * 30)}
        playbackRate={s.rate ?? 1}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${sc.toFixed(4)})`, transformOrigin: s.o ?? '50% 40%', filter: GRADE}}
      />
    </AbsoluteFill>
  );
};

export const PlatyeReel: React.FC = () => {
  const ready = useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SEGS.map((s, i) => (
        <Sequence key={i} from={STARTS[i]} durationInFrames={s.dur}>
          <Shot s={s} first={i === 0} />
        </Sequence>
      ))}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0.05) 100%)'}} />
      <Audio src={staticFile('r39/voice.wav')} />
      <WordCaptions cards={PLATYE_CARDS} total={PLATYE_FRAMES} ready={ready} accent={BLUSH} plate top={1230} size={66} />
    </AbsoluteFill>
  );
};
