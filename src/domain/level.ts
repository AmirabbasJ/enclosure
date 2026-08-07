import type { OrbInput, OrbSpawn } from '#/domain/orb';
import type { WallInput, WallPiece } from '#/domain/walls';

import { buildOrbSpawns } from '#/domain/orb';
import { resolveWalls, wallToInput } from '#/domain/walls';

export type { YawQuarters } from '#/domain/walls';
export type { OrbInput, WallInput };

export interface LevelInput {
  orbs?: OrbInput[];
  walls?: WallInput[];
}

export interface ResolvedLevel {
  orbs: OrbSpawn[];
  walls: WallPiece[];
}

export function resolveLevel(
  input?: LevelInput,
  options?: { snapWallsToGrooves?: boolean }
): ResolvedLevel {
  return {
    orbs: buildOrbSpawns(input?.orbs),
    walls: resolveWalls(input?.walls, {
      snap: options?.snapWallsToGrooves,
    }),
  };
}

export function serializeWalls(walls: WallPiece[]): WallInput[] {
  return walls
    .map(wallToInput)
    .filter((wall): wall is WallInput => wall != null);
}
