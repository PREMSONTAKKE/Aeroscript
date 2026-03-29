import { Palette, PenTool, Type } from 'lucide-react';

export const MODE_CONFIGS = {
  signature: {
    label: 'Signature Mode',
    shortLabel: 'Signature',
    icon: PenTool,
    description: 'Focused signing space with restrained colors and polished stroke styles.',
    accent: 'from-sky-500/30 via-cyan-500/10 to-transparent',
    colors: ['#f8fafc', '#0f172a', '#1d4ed8', '#991b1b', '#14532d'],
    inks: ['Calligraphy', 'Graphite', 'Laser'],
    defaultBrushWidth: 2.4,
    widthRange: [1.5, 7],
    showPredictions: false,
    guideTitle: 'Signing Profile',
    guidePoints: [
      'Tighter width range to preserve clean signatures.',
      'Solid palette tuned for legal and professional use.',
      'Calligraphy and graphite are prioritized over novelty inks.'
    ]
  },
  draw: {
    label: 'Draw Mode',
    shortLabel: 'Draw',
    icon: Palette,
    description: 'Full-spectrum sketching with flexible inks for illustration and ideation.',
    accent: 'from-amber-500/30 via-rose-500/10 to-transparent',
    colors: [],
    inks: ['Graphite', 'Laser', 'Marker', 'Neon', 'Pencil'],
    defaultBrushWidth: 4,
    widthRange: [1, 24],
    showPredictions: false,
    guideTitle: 'Studio Profile',
    guidePoints: [
      'Full color picker stays unlocked for exploratory drawing.',
      'Broader brush range supports rough sketching and bold fills.',
      'Neon and marker inks add more stylized visual output.'
    ]
  },
  write: {
    label: 'Write Mode',
    shortLabel: 'Write',
    icon: Type,
    description: 'Writing workspace with recognition feedback and session history per mode.',
    accent: 'from-emerald-500/30 via-teal-500/10 to-transparent',
    colors: [],
    inks: ['Graphite', 'Marker', 'Laser', 'Pencil', 'Calligraphy'],
    defaultBrushWidth: 5,
    widthRange: [1, 18],
    showPredictions: true,
    guideTitle: 'Writing Profile',
    guidePoints: [
      'Predictions appear after a short pause in writing.',
      'Balanced width range keeps characters readable for the model.',
      'Marker and pencil inks are useful for character practice.'
    ]
  }
};

export const getModeConfig = (mode) => MODE_CONFIGS[mode] || MODE_CONFIGS.draw;
