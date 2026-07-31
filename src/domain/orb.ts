import { BOARD_COLS, BOARD_ROWS } from '#/domain/cells';
import { TILE_SPACING } from '#/domain/tiles';

export const ORB_HEIGHT = 0.35;

export type OrbKind = 'bad' | 'good';

export interface OrbSpawn {
  kind: OrbKind;
  floatPhase: number;
  position: [number, number, number];
}

const ORB_SPAWN_CELLS = [
  { col: 1, row: 1, kind: 'good' as const },
  { col: 2, row: 1, kind: 'bad' as const },
  { col: 1, row: 2, kind: 'bad' as const },
  { col: 2, row: 2, kind: 'good' as const },
] as const;

export function buildOrbSpawns(): OrbSpawn[] {
  return ORB_SPAWN_CELLS.map(({ col, row, kind }, i) => ({
    kind,
    floatPhase: i * 1.1,
    position: [
      (col - (BOARD_COLS - 1) / 2) * TILE_SPACING,
      ORB_HEIGHT,
      (row - (BOARD_ROWS - 1) / 2) * TILE_SPACING,
    ],
  }));
}

export const ORB_SPAWNS = buildOrbSpawns();
