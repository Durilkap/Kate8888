import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

// Титры по словам в стиле рилса 14 v4: Montserrat ExtraBold, ключевые слова жёлтые, тонкая тёмная обводка,
// каждое слово появляется, когда Катя его произносит. Данные готовят скрипты tools/prepare_*.py.

export type Word = {t: string; at: number; a: boolean};
export type Card = {from: number; full: boolean; lines: {big: boolean; words: Word[]}[]};

export const YELLOW = '#FFD60A';
export const SANS = 'Montserrat, "DejaVu Sans", sans-serif';
const MAXW = 880;
const BASE = 94;
const BIG = 132;
const SHADOW = '0 4px 10px rgba(0,0,0,0.55), 0 8px 34px rgba(0,0,0,0.6)';

let ctx: CanvasRenderingContext2D | null = null;
const fit = (text: string, base: number) => {
  if (typeof document === 'undefined') return base;
  ctx = ctx ?? document.createElement('canvas').getContext('2d');
  if (!ctx) return base;
  ctx.font = `800 ${base}px ${SANS}`;
  const w = ctx.measureText(text).width;
  return w > MAXW ? Math.floor((base * MAXW) / w) : base;
};

const Caption: React.FC<{c: Card; dur: number; ready: boolean; top: number}> = ({c, dur, ready, top}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(f, [dur - 4, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div
        style={{
          position: 'absolute',
          top,
          height: 470,
          left: 60,
          right: 110,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: SANS,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          textAlign: 'center',
        }}
      >
        {c.lines.map((l, i) => {
          const base = l.big ? BIG : BASE;
          const size = ready ? fit(l.words.map((w) => w.t).join(' '), base) : base;
          return (
            <div key={i} style={{fontSize: size, lineHeight: 1.1, whiteSpace: 'nowrap'}}>
              {l.words.map((w, j) => {
                const rel = w.at - c.from;
                const p = c.full ? 1 : spring({frame: f - rel + 2, fps, config: {damping: 13, stiffness: 190, mass: 0.6}});
                const o = c.full ? 1 : interpolate(f, [rel - 2, rel + 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
                return (
                  <span
                    key={j}
                    style={{
                      display: 'inline-block',
                      marginRight: j + 1 < l.words.length ? '0.24em' : 0,
                      color: w.a ? YELLOW : '#fff',
                      WebkitTextStroke: '5px rgba(0,0,0,0.78)',
                      paintOrder: 'stroke fill',
                      textShadow: SHADOW,
                      opacity: o,
                      transform: `translateY(${(1 - p) * 16}px) scale(${0.72 + 0.28 * p})`,
                    }}
                  >
                    {w.t}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Шрифт Montserrat 800 (public/fonts, OFL); рендер ждёт загрузки, чтобы ширина строк мерилась верно
export const useMontserrat = () => {
  const [handle] = useState(() => delayRender('fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const cyr = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
    const lat = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD';
    const f = (file: string, range: string) =>
      new FontFace('Montserrat', `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {weight: '800', style: 'normal', unicodeRange: range});
    const faces = [f('montserrat-cyrillic-800-normal.woff2', cyr), f('montserrat-latin-800-normal.woff2', lat)];
    Promise.all(faces.map((x) => x.load()))
      .then((loaded) => {
        loaded.forEach((x) => document.fonts.add(x));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  return ready;
};

// Все экраны титров: каждый держится до начала следующего, последний до конца ролика
export const WordCaptions: React.FC<{cards: Card[]; total: number; ready: boolean; top?: number}> = ({cards, total, ready, top = 1030}) => (
  <>
    {cards.map((c, i) => {
      const to = i + 1 < cards.length ? cards[i + 1].from : total;
      return (
        <Sequence key={`c${i}`} from={c.from} durationInFrames={to - c.from}>
          <Caption c={c} dur={i + 1 < cards.length ? to - c.from : to - c.from + 12} ready={ready} top={top} />
        </Sequence>
      );
    })}
  </>
);
