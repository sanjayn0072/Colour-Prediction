import React from 'react';
import colourPredictionThumb from '../assets/colour_prediction_lobby.png';
import diceGameThumb from '../assets/dice_game_lobby.png';
import spinWheelThumb from '../assets/spin_wheel_lobby.png';

export const gameRegistry = [
  {
    id: 'colour-prediction',
    title: 'Colour Prediction',
    badge: 'ACTIVE',
    description: 'Predict colors and numbers in real-time to claim multipliers up to 8x.',
    icon: '🎮',
    thumbnail: colourPredictionThumb,
    component: React.lazy(() => import('../pages/ColourPrediction'))
  },
  {
    id: 'dice-game',
    title: 'Dice Pro',
    badge: 'TRENDING',
    description: 'Predict if roll outcomes land land above or below values using provably fair mechanics.',
    icon: '🎲',
    thumbnail: diceGameThumb,
    component: React.lazy(() => import('../pages/DiceGame'))
  },
  {
    id: 'spin-wheel',
    title: 'Lucky Spin',
    badge: 'COMING_SOON',
    description: 'Spin the premium wheel of fortune to claim cash rewards and bonus vouchers.',
    icon: '🎡',
    thumbnail: null,
    component: null
  },
  {
    id: 'safari-mystery',
    title: 'Safari Mystery',
    badge: 'COMING_SOON',
    description: 'Uncover deep jungle multipliers in this upcoming high-volatility slot.',
    icon: '🦁',
    thumbnail: null,
    component: null
  },
  {
    id: 'dragon-hatch',
    title: 'Dragon Hatch IV',
    badge: 'COMING_SOON',
    description: 'Incubate dragon eggs to trigger multipliers and volcanic free-spins.',
    icon: '🐉',
    thumbnail: null,
    component: null
  },
  {
    id: 'mahjon-wins',
    title: 'Mahjon Wins 3',
    badge: 'COMING_SOON',
    description: 'Traditional Chinese tiles meet modern high-volatility cascade mechanics.',
    icon: '🀄',
    thumbnail: null,
    component: null
  }
];
