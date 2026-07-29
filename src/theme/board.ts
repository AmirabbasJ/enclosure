/** Shared board / tile / wall sizes. */

export const BOARD_SCALE = 0.4
export const BOARD_COLS = 5
export const BOARD_ROWS = 4

/**
 * Tile XZ size = wall segment length (one side).
 * Tile thickness = Y size AND gap between tiles.
 */
export const TILE_LENGTH = 0.72
export const TILE_THICKNESS = 0.1
export const TILE_SIZE: [number, number, number] = [
  TILE_LENGTH,
  TILE_THICKNESS,
  TILE_LENGTH,
]
/** Center-to-center = footprint + gap (gap = tile thickness). */
export const TILE_SPACING = TILE_LENGTH + TILE_THICKNESS

/** Wall path step = tile side length. */
export const CELL_SIZE = TILE_SPACING

export const WALL_HEIGHT = 0.55
export const WALL_THICKNESS = 0.12

export const BOARD_BASE_HEIGHT = 0.08
/** Extra margin around tile grid for the board plate. */
export const BOARD_MARGIN = 0.7
export const BOARD_BASE_SIZE: [number, number, number] = [
  BOARD_COLS * TILE_SPACING + BOARD_MARGIN,
  BOARD_BASE_HEIGHT,
  BOARD_ROWS * TILE_SPACING + BOARD_MARGIN,
]
export const BOARD_BASE_Y = -0.1

export const GROUND_SIZE: [number, number, number] = [20, 0.1, 20]
export const GROUND_Y = -0.5
export const GROUND_TOP = GROUND_Y 

export const ORB_HEIGHT = 0.35

/** Wall piece anchors around the board (on ground). */
export const WALL_OFFSET_X =
  BOARD_BASE_SIZE[0] / 2 + TILE_SPACING * 0.75
export const WALL_OFFSET_Z =
  BOARD_BASE_SIZE[2] / 2 + TILE_SPACING * 0.75
