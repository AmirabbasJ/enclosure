export const palette = {
  bg: '#000F31',
  foreground: '#232F5C',
  panel: '#1B263B',
  surface: '#415A77',
  textLight: '#E0E1DD',
  textMuted: '#778DA9',
  accent: '#72CEFF',
  accentHover: '#BFE9FF',
  danger: '#E83151',
  dangerHover: '#FF8FA3',
} as const;

// #080A1A
// #0D1230
// #3A4A8A
// #232F5C
// #EEF2FB
// #7683B3
// #414F85
// #5FA4FF
// #BFE0FF
// #E2495C

export type PaletteKey = keyof typeof palette;
