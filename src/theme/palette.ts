export const palette = {
  bg: '#0D1B2A',
  panel: '#1B263B',
  surface: '#415A77',
  textLight: '#E0E1DD',
  textMuted: '#778DA9',
  accent: '#72CEFF',
  accentHover: '#BFE9FF',
  danger: '#E83151',
  dangerHover: '#FF8FA3',
} as const;

export type PaletteKey = keyof typeof palette;
