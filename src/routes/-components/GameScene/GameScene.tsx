import { useRef, useState } from 'react';

import type { LevelInput, WallInput } from '#/domain/level';
import type { WallId } from '#/domain/walls';

import { useGame } from '#/context/GameContext';
import { PixelSceneRenderer } from '#/PixelSceneRenderer';

import { GamePlayground } from './GamePlayground';
import { GameTopBar } from './GameTopBar';

interface GameSceneProps {
  levelId: number;
  level: LevelInput;
  onWallsChange: (walls: WallInput[]) => void;
  allowedWallIds?: readonly WallId[] | null;
  dropHintWall?: WallInput | null;
  onBoardRotated?: () => void;
  onViewToggled?: () => void;
}

type BoardTurns = -1 | 1;

const BOARD_TURNS_INCREMENT = 1;
const BOARD_TURNS_DECREMENT = -1;

export function GameScene({
  levelId,
  level,
  onWallsChange,
  allowedWallIds = null,
  dropHintWall = null,
  onBoardRotated,
  onViewToggled,
}: GameSceneProps) {
  const { state } = useGame();
  const [boardTurns, setBoardTurns] = useState(0);
  const [topDownManual, setTopDownManual] = useState(false);
  const boardTurnsRef = useRef(boardTurns);
  boardTurnsRef.current = boardTurns;
  /** Playground sets this so yaw target updates before React re-renders. */
  const applyBoardTurnsRef = useRef<((turns: number) => void) | null>(null);

  const rotateBoard = (dir: BoardTurns) => {
    const next = boardTurnsRef.current + dir;
    boardTurnsRef.current = next;
    applyBoardTurnsRef.current?.(next);
    setBoardTurns(next);
    onBoardRotated?.();
  };

  const toggleTopDown = () => {
    setTopDownManual((v) => !v);
    onViewToggled?.();
  };

  return (
    <>
      {state.matches('playing') ? (
        <GameTopBar
          onRotateLeft={() => rotateBoard(BOARD_TURNS_DECREMENT)}
          onRotateRight={() => rotateBoard(BOARD_TURNS_INCREMENT)}
          onToggleTopDown={toggleTopDown}
        />
      ) : null}
      <PixelSceneRenderer key={levelId}>
        <GamePlayground
          level={level}
          onWallsChange={onWallsChange}
          allowedWallIds={allowedWallIds}
          dropHintWall={dropHintWall}
          boardTurns={boardTurns}
          topDownManual={topDownManual}
          applyBoardTurnsRef={applyBoardTurnsRef}
          onRotateBoard={rotateBoard}
          onToggleTopDown={toggleTopDown}
        />
      </PixelSceneRenderer>
    </>
  );
}
