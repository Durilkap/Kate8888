import React from 'react';
import {card, SerijaReel, Shot} from './SerijaReel';
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
