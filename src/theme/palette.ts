export const palette = {
  bg: '#011022',
  border: '#0D1B2A',
  board: '#415A77',
  tiles: '#415A77',
  walls: '#778DA9',
  goodOrb: '#72ceff',
  badCone: '#E83151',
} as const;

export type PaletteKey = keyof typeof palette;
