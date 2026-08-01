import { BOARD_COLS, BOARD_ROWS } from '#/domain/cells';
import { TILE_SPACING } from '#/domain/tiles';

/** Map board cell space to local world XZ (before BOARD_SCALE). */
export function cellToWorld(
  col: number,
  row: number,
  y = 0
): [number, number, number] {
  return [
    (col - (BOARD_COLS - 1) / 2) * TILE_SPACING,
    y,
    (row - (BOARD_ROWS - 1) / 2) * TILE_SPACING,
  ];
}
