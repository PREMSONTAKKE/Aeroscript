import { Palette, PenTool, Type } from 'lucide-react';

export const MODE_CONFIGS = {
  signature: {
    label: 'Signature Mode',
    shortLabel: 'Signature',
    icon: PenTool,
    description: 'Focused signing space with restrained colors and polished stroke styles.',
    accent: 'from-sky-400/25 via-sky-500/10 to-transparent',
    accentColor: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.2)',
    colors: ['#f8fafc', '#0f172a', '#1d4ed8', '#991b1b', '#14532d'],
    inks: ['Calligraphy', 'Graphite', 'Laser'],
    defaultBrushWidth: 2.4,
    widthRange: [1.5, 7],
    supportsParty: false,
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
    accent: 'from-orange-400/25 via-orange-500/10 to-transparent',
    accentColor: '#fb923c',
    accentGlow: 'rgba(251, 146, 60, 0.2)',
    colors: [],
    inks: ['Graphite', 'Laser', 'Marker', 'Neon', 'Pencil'],
    defaultBrushWidth: 4,
    widthRange: [1, 24],
    supportsParty: true,
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
    description: 'Writing workspace with session history per mode.',
    accent: 'from-emerald-400/25 via-emerald-500/10 to-transparent',
    accentColor: '#34d399',
    accentGlow: 'rgba(52, 211, 153, 0.2)',
    colors: [],
    inks: ['Graphite', 'Marker', 'Laser', 'Pencil', 'Calligraphy'],
    defaultBrushWidth: 5,
    widthRange: [1, 18],
    supportsParty: false,
    guideTitle: 'Writing Profile',
    guidePoints: [
      'Balanced width range for neat handwriting.',
      'Marker and pencil inks are useful for character practice.'
    ]
  }
};

export const getModeConfig = (mode) => MODE_CONFIGS[mode] || MODE_CONFIGS.draw;

export const THEME_COLORS = {
  dark: {
    background: '#0A0F1B',
    surface: '#0f1629',
    surfaceElevated: '#151d2e',
    border: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.12)',
    textPrimary: '#F0F4F8',
    textSecondary: '#D0D7DD',
    textMuted: '#8B95A5',
    accent: '#00E6FF',
    accentSecondary: '#40C4FF',
    accentSubtle: 'rgba(0, 230, 255, 0.08)',
    accentGlow: 'rgba(0, 230, 255, 0.15)',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    disabled: '#505860',
  },
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceElevated: '#f1f5f9',
    border: 'rgba(15, 23, 42, 0.08)',
    borderHover: 'rgba(15, 23, 42, 0.15)',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    accent: '#0088CC',
    accentSecondary: '#00A3E0',
    accentSubtle: 'rgba(0, 136, 204, 0.06)',
    accentGlow: 'rgba(0, 136, 204, 0.12)',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    disabled: '#CBD5E1',
  }
};
