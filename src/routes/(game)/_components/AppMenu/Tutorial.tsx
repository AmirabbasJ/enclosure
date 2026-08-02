import { useState } from 'react';

import { TUTORIAL_ANSWER, TUTORIAL_QUESTION } from '#/domain/tutorialLevel';
import Button from '@/ui/button';
import { LevelShot } from '@/ui/LevelShot';

interface TutorialPage {
  id: string;
  text: string;
}

const PAGES: TutorialPage[] = [
  {
    id: 'goal',
    text: 'Position the walls using the indents in the board as a guideline, so that the red knights are kept outside and the blue knights remain within the ramparts.',
  },
];

interface TutorialProps {
  onComplete: () => void;
  onBack: () => void;
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
          <div className="flex items-center justify-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[8px] uppercase tracking-wide text-text-muted">
                Puzzle
              </span>
              <LevelShot level={TUTORIAL_QUESTION} className="h-auto w-full" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[8px] uppercase tracking-wide text-text-muted">
                Solution
              </span>
              <LevelShot level={TUTORIAL_ANSWER} className="h-auto w-full" />
            </div>
          </div>
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
