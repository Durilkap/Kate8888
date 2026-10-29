import React from 'react';
import {AbsoluteFill} from 'remotion';

export const TestCard: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: '#f6efe9',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      fontSize: 64,
      fontWeight: 700,
      color: '#222',
      textAlign: 'center',
      padding: 60,
    }}
  >
    Remotion работает. Я Екатерина.
  </AbsoluteFill>
);
