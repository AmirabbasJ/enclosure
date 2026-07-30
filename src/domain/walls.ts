import { BOARD_BASE_SIZE } from '#/domain/board';
import { TILE_SPACING } from '#/domain/tiles';

export const WALL_HEIGHT = 0.55;
export const WALL_THICKNESS = 0.12;

export const WALL_OFFSET_X = BOARD_BASE_SIZE[0] / 2 + TILE_SPACING + 0.5;
export const WALL_OFFSET_Z = BOARD_BASE_SIZE[2] / 2 + TILE_SPACING + 0.5;

export const WALL_DRAG_HALF_X = WALL_OFFSET_X;
export const WALL_DRAG_HALF_Z = WALL_OFFSET_Z;

export const GROOVE_SNAP_DIST = TILE_SPACING * 0.4;
