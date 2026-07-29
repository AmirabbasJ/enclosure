export const palette = {
  void: '#011022',
  cream: '#0D1B2A',
  ink: '#1B263B',
  white: '#415A77',
  stone: '#778DA9',
  good: '#72ceff',
  bad: '#E83151',
} as const

export type PaletteKey = keyof typeof palette
