import type { ReactNode } from 'react';

import { useState } from 'react';

import type { LevelInput } from '#/domain/level';

import Button from '@/ui/button';
import { Kbd } from '@/ui/kbd';
import { LevelShot, spaceToOverlayPercent } from '@/ui/LevelShot';
import { PixelCross } from '@/ui/PixelMark';
import {
  TUTORIAL_ANSWER,
  TUTORIAL_QUESTION,
  TUTORIAL_RED_WRONG,
  TUTORIAL_SURROUND_WRONG,
  TUTORIAL_TOWER_WRONG,
} from '#/domain/tutorialLevel';

import type { TutorialPage } from './tutorialPages';

import { tutorialPages } from './tutorialPages';

function ControlsCheatSheet() {
  const rows: { keys: ReactNode; label: string }[] = [
    { keys: <Kbd k="MouseLeft" />, label: 'Grab + place wall' },
    {
      keys: (
        <>
          <Kbd k="1" />
          <Kbd k="2" />
          <Kbd k="3" />
          <Kbd k="4" />
        </>
      ),
      label: 'Select wall',
    },
    {
      keys: (
        <>
          <Kbd k="W" />
          <Kbd k="A" />
          <Kbd k="S" />
          <Kbd k="D" />
        </>
      ),
      label: 'Move wall',
    },
    { keys: <Kbd k="Space" />, label: 'Rotate wall' },
    {
      keys: (
        <>
          <Kbd k="ArrowLeft" />
          <Kbd k="ArrowRight" />
        </>
      ),
      label: 'Turn board',
    },
    { keys: <Kbd k="Q" />, label: 'Top-down view' },
    { keys: <Kbd k="Enter" />, label: 'Drop' },
  ];

  return (
    <div className="mx-auto grid w-fit grid-cols-[auto_auto] items-center gap-x-3 gap-y-2.5 py-1">
      {rows.flatMap(({ keys, label }) => [
        <div
          key={`${label}-keys`}
          className="flex flex-wrap items-center justify-end gap-1"
        >
          {keys}
        </div>,
        <span
          key={`${label}-label`}
          className="text-left text-xs leading-4 text-text-light"
        >
          {label}
        </span>,
      ])}
    </div>
  );
}

interface TutorialProps {
  pagesToInclude?: TutorialPage['id'][];
  onComplete?: () => void;
  onBack: () => void;
}

function ShotFrame({
  label,
  labelClass,
  level,
  badge,
  badgeAt,
}: {
  label: string;
  labelClass: string;
  level: LevelInput;
  badge?: ReactNode;
  badgeAt?: [number, number];
}) {
  const badgeStyle = badgeAt
    ? {
        ...spaceToOverlayPercent(badgeAt[0], badgeAt[1]),
        transform: 'translate(-50%, -50%)',
      }
    : undefined;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <span className={`text-xs uppercase tracking-wide ${labelClass}`}>
        {label}
      </span>
      <div className="relative w-full">
        <LevelShot level={level} className="h-auto w-full" />
        {badge && badgeStyle ? (
          <div
            style={badgeStyle}
            className="pointer-events-none absolute drop-shadow-[1px_1px_0_#000]"
          >
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
    badgeAt?: [number, number];
  };
  right: {
    label: string;
    labelClass: string;
    level: LevelInput;
    badge?: ReactNode;
    badgeAt?: [number, number];
  };
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <ShotFrame {...left} />
      <ShotFrame {...right} />
    </div>
  );
}

const allPagesIds = tutorialPages.map((p) => p.id);

export function Tutorial({
  onComplete,
  onBack,
  pagesToInclude = allPagesIds,
}: TutorialProps) {
  const pages = tutorialPages.filter((p) => pagesToInclude.includes(p.id));
  const [page, setPage] = useState(0);
  const current = pages[page] ?? pages[0];
  const isFirst = page === 0;
  const isLast = page >= pages.length - 1;
  const isSinglePage = pages.length === 1;

  return (
    <div className="flex w-full max-w-[560px] flex-col gap-4">
      <p className="text-center text-sm leading-5 text-text-muted">Tutorial</p>

      <div className="flex flex-col gap-4 bg-foreground pixelated p-4">
        {current.id === 'controls' ? <ControlsCheatSheet /> : null}

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
              badge: <PixelCross className="rotate-45" size={28} />,
              badgeAt: [3, 0.5],
            }}
            right={{
              label: 'Correct',
              labelClass: 'text-success',
              level: TUTORIAL_ANSWER,
            }}
          />
        ) : null}

        {current.id === 'redOpen' ? (
          <ShotPair
            left={{
              label: 'Wrong',
              labelClass: 'text-danger',
              level: TUTORIAL_RED_WRONG,
              badge: <PixelCross className="rotate-45" size={28} />,
              badgeAt: [1, 1.5],
            }}
            right={{
              label: 'Correct',
              labelClass: 'text-success',
              level: TUTORIAL_ANSWER,
            }}
          />
        ) : null}

        {current.id === 'meetTower' ? (
          <ShotPair
            left={{
              label: 'Wrong',
              labelClass: 'text-danger',
              level: TUTORIAL_TOWER_WRONG,
              badge: <PixelCross className="rotate-45" size={28} />,
              badgeAt: [4, 1],
            }}
            right={{
              label: 'Correct',
              labelClass: 'text-success',
              level: TUTORIAL_ANSWER,
            }}
          />
        ) : null}

        <p className="text-center text-xs leading-5 text-text-light">
          {current.text}
        </p>
      </div>

      {!isSinglePage ? (
        <>
          <div className="flex items-center justify-center gap-3">
            {pages.map((p, i) => (
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
            {!isLast ? (
              <Button
                className="flex-1"
                onClick={() =>
                  setPage((p) => Math.min(pages.length - 1, p + 1))
                }
              >
                Next
              </Button>
            ) : onComplete ? (
              <Button className="flex-1" onClick={onComplete}>
                Play
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      <Button onClick={onBack}>Back</Button>
    </div>
  );
}
