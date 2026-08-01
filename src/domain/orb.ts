import { cellToWorld } from '#/domain/coords';

export const ORB_HEIGHT = 0.35;

export type OrbKind = 'bad' | 'good';

export interface OrbInput {
  kind: OrbKind;
  col: number;
  row: number;
}

export interface OrbSpawn {
  kind: OrbKind;
  floatPhase: number;
  position: [number, number, number];
}

export const DEFAULT_ORB_INPUTS: readonly OrbInput[] = [
  { col: 1, row: 1, kind: 'good' },
  { col: 2, row: 1, kind: 'bad' },
  { col: 1, row: 2, kind: 'bad' },
  { col: 2, row: 2, kind: 'good' },
];

export function buildOrbSpawns(orbs?: OrbInput[]): OrbSpawn[] {
  const cells = orbs ?? DEFAULT_ORB_INPUTS;
  return cells.map(({ col, row, kind }, i) => ({
    kind,
    floatPhase: i * 1.1,
    position: cellToWorld(col, row, ORB_HEIGHT),
  }));
}

export const ORB_SPAWNS = buildOrbSpawns();
