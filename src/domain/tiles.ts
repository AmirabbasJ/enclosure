import { BOARD_COLS, BOARD_ROWS } from '#/domain/cells';

export const TILE_LENGTH = 0.72;
export const TILE_THICKNESS = 0.1;
export const TILE_SIZE: [number, number, number] = [
  TILE_LENGTH,
  TILE_THICKNESS,
  TILE_LENGTH,
];

export const TILE_SPACING = TILE_LENGTH + TILE_THICKNESS;
export const CELL_SIZE = TILE_SPACING;

export function buildTilePositions(): [number, number, number][] {
  const positions: [number, number, number][] = [];

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const isCorner =
        (row === 0 || row === BOARD_ROWS - 1) &&
        (col === 0 || col === BOARD_COLS - 1);
      if (isCorner) continue;

      positions.push([
        (col - (BOARD_COLS - 1) / 2) * TILE_SPACING,
        0,
        (row - (BOARD_ROWS - 1) / 2) * TILE_SPACING,
      ]);
    }
  }

  return positions;
}

export const TILE_POSITIONS = buildTilePositions();
