import type { OrbInput, OrbSpawn } from '#/domain/orb';
import type { WallInput, WallPiece } from '#/domain/walls';

import { buildOrbSpawns } from '#/domain/orb';
import { resolveWalls } from '#/domain/walls';

export type { OrbInput, WallInput };
export type { YawQuarters } from '#/domain/walls';

export interface LevelInput {
  orbs?: OrbInput[];
  walls?: WallInput[];
}

export interface ResolvedLevel {
  orbs: OrbSpawn[];
  walls: WallPiece[];
}

export function resolveLevel(input?: LevelInput): ResolvedLevel {
  return {
    orbs: buildOrbSpawns(input?.orbs),
    walls: resolveWalls(input?.walls),
  };
}
