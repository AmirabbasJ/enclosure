import { useState, type ReactNode } from 'react';

import type { LevelInput } from '#/domain/level';

import {
  TUTORIAL_ANSWER,
  TUTORIAL_QUESTION,
  TUTORIAL_RED_WRONG,
  TUTORIAL_SURROUND_WRONG,
} from '#/domain/tutorialLevel';
import Button from '@/ui/button';
import { LevelShot } from '@/ui/LevelShot';
import { PixelCross, PixelTick } from '@/ui/PixelMark';

interface TutorialPage {
  id: string;
  text: string;
}

const PAGES: TutorialPage[] = [
  {
    id: 'goal',
    text: 'Position the walls using the indents in the board as a guideline, so that the red knights are kept outside and the blue knights remain within the ramparts.',
  },
  {
    id: 'surround',
    text: 'A blue knight is safe inside the city walls only when surrounded by walls on all sides.',
  },
  {
    id: 'redOpen',
    text: 'The red knights must never be totally surrounded by walls. They can, however, be in an area that is partially enclosed, that is, where a wall has an opening on at least one side.',
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
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span className={`text-[8px] uppercase tracking-wide ${labelClass}`}>
        {label}
      </span>
      <div className="relative w-full">
        <LevelShot level={level} className="h-auto w-full" />
        {badge ? (
          <div className="pointer-events-none absolute top-1 left-1 drop-shadow-[1px_1px_0_#000]">
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
    <div className="flex items-center justify-center gap-3">
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
    <div className="flex w-full max-w-[420px] flex-col gap-3">
      <p className="text-center text-[10px] leading-4 text-text-muted">
        Tutorial
      </p>

      <div className="flex flex-col gap-3 rounded-sm bg-panel/80 p-3">
        {current.id === 'goal' ? (
          <ShotPair
            left={{
              label: 'Puzzle',
              labelClass: 'text-text-muted',
              level: TUTORIAL_QUESTION,
            }}
            right={{
              label: 'Solution',
              labelClass: 'text-text-muted',
              level: TUTORIAL_ANSWER,
            }}
          />
        ) : null}

        {current.id === 'surround' ? (
          <ShotPair
            left={{
              label: 'Correct',
              labelClass: 'text-[#4ADE80]',
              level: TUTORIAL_ANSWER,
              badge: <PixelTick />,
            }}
            right={{
              label: 'Wrong',
              labelClass: 'text-danger',
              level: TUTORIAL_SURROUND_WRONG,
              badge: <PixelCross />,
            }}
          />
        ) : null}

        {current.id === 'redOpen' ? (
          <ShotPair
            left={{
              label: 'Correct',
              labelClass: 'text-[#4ADE80]',
              level: TUTORIAL_ANSWER,
              badge: <PixelTick />,
            }}
            right={{
              label: 'Wrong',
              labelClass: 'text-danger',
              level: TUTORIAL_RED_WRONG,
              badge: <PixelCross />,
            }}
          />
        ) : null}

        <p className="text-center text-[10px] leading-4 text-text-light">
          {current.text}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {PAGES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-label={`Page ${i + 1}`}
            aria-current={i === page ? 'true' : undefined}
            onClick={() => setPage(i)}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === page ? 'bg-accent' : 'bg-surface hover:bg-text-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={isFirst}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Prev
        </Button>
        {isLast ? (
          <Button className="flex-1" onClick={onComplete}>
            Done
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
