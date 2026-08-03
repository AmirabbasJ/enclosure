import type { ReactNode } from 'react';

import { useState } from 'react';

import type { LevelInput } from '#/domain/level';

import Button from '@/ui/button';
import { LevelShot } from '@/ui/LevelShot';
import { PixelCross, PixelTick } from '@/ui/PixelMark';
import {
  TUTORIAL_ANSWER,
  TUTORIAL_QUESTION,
  TUTORIAL_RED_WRONG,
  TUTORIAL_SURROUND_WRONG,
  TUTORIAL_TOWER_WRONG,
} from '#/domain/tutorialLevel';

interface TutorialPage {
  id: string;
  text: ReactNode;
}

const PAGES: TutorialPage[] = [
  {
    id: 'goal',
    text: (
      <>
        Position the walls using the indents in the board as a guideline, so
        that the <span className="font-bold text-danger">red cones</span> stay
        outside and the <span className="font-bold text-accent">blue orbs</span>{' '}
        remain enclosed.
      </>
    ),
  },
  {
    id: 'surround',
    text: (
      <>
        A <span className="font-bold text-accent">blue orb</span> is safe only
        when surrounded by walls on all sides.
      </>
    ),
  },
  {
    id: 'redOpen',
    text: (
      <>
        <span className="font-bold text-danger">Red cones</span> must never be
        totally surrounded by walls. They can sit in a partially enclosed area,
        as long as a wall has an opening on at least one side.
      </>
    ),
  },
  {
    id: 'meetTower',
    text: 'You can place two walls to meet each other where the indents cross, but you cannot place a wall against a tower as it will not fit.',
  },
];

interface TutorialProps {
  onComplete: () => void;
  onBack: () => void;
}

function ShotFrame({
  label,
  labelClass,
  level,
  badge,
}: {
  label: string;
  labelClass: string;
  level: LevelInput;
  badge?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <span className={`text-xs uppercase tracking-wide ${labelClass}`}>
        {label}
      </span>
      <div className="relative w-full">
        <LevelShot level={level} className="h-auto w-full" />
        {badge ? (
          <div className="pointer-events-none absolute top-1.5 left-1.5 drop-shadow-[1px_1px_0_#000]">
            {badge}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ShotPair({
  left,
  right,
}: {
  left: {
    label: string;
    labelClass: string;
    level: LevelInput;
    badge?: ReactNode;
  };
  right: {
    label: string;
    labelClass: string;
    level: LevelInput;
    badge?: ReactNode;
  };
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <ShotFrame {...left} />
      <ShotFrame {...right} />
    </div>
  );
}

export function Tutorial({ onComplete, onBack }: TutorialProps) {
  const [page, setPage] = useState(0);
  const current = PAGES[page] ?? PAGES[0];
  const isFirst = page === 0;
  const isLast = page >= PAGES.length - 1;

  return (
    <div className="flex w-full max-w-[560px] flex-col gap-4">
      <p className="text-center text-sm leading-5 text-text-muted">Tutorial</p>

      <div className="flex flex-col gap-4 bg-panel/80 pixelated p-4">
        {current.id === 'goal' ? (
          <ShotPair
            left={{
              label: 'Puzzle',
              labelClass: 'text-warning',
              level: TUTORIAL_QUESTION,
            }}
            right={{
              label: 'Solution',
              labelClass: 'text-success',
              level: TUTORIAL_ANSWER,
            }}
          />
        ) : null}

        {current.id === 'surround' ? (
          <ShotPair
            left={{
              label: 'Wrong',
              labelClass: 'text-danger',
              level: TUTORIAL_SURROUND_WRONG,
              badge: <PixelCross size={28} />,
            }}
            right={{
              label: 'Correct',
              labelClass: 'text-success',
              level: TUTORIAL_ANSWER,
              badge: <PixelTick size={28} />,
            }}
          />
        ) : null}

        {current.id === 'redOpen' ? (
          <ShotPair
            left={{
              label: 'Wrong',
              labelClass: 'text-danger',
              level: TUTORIAL_RED_WRONG,
              badge: <PixelCross size={28} />,
            }}
            right={{
              label: 'Correct',
              labelClass: 'text-success',
              level: TUTORIAL_ANSWER,
              badge: <PixelTick size={28} />,
            }}
          />
        ) : null}

        {current.id === 'meetTower' ? (
          <ShotPair
            left={{
              label: 'Wrong',
              labelClass: 'text-danger',
              level: TUTORIAL_TOWER_WRONG,
              badge: <PixelCross size={28} />,
            }}
            right={{
              label: 'Correct',
              labelClass: 'text-success',
              level: TUTORIAL_ANSWER,
              badge: <PixelTick size={28} />,
            }}
          />
        ) : null}

        <p className="text-center text-xs leading-5 text-text-light">
          {current.text}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        {PAGES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-label={`Page ${i + 1}`}
            aria-current={i === page ? 'true' : undefined}
            onClick={() => setPage(i)}
            className={`h-3 w-3 transition-colors ${
              i === page ? 'bg-accent' : 'bg-surface hover:bg-text-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={isFirst}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Prev
        </Button>
        {isLast ? (
          <Button className="flex-1" onClick={onComplete}>
            Play
          </Button>
        ) : (
          <Button
            className="flex-1"
            onClick={() => setPage((p) => Math.min(PAGES.length - 1, p + 1))}
          >
            Next
          </Button>
        )}
      </div>

      <Button onClick={onBack}>Back</Button>
    </div>
  );
}
