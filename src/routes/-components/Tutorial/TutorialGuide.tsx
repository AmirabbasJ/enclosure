import type { TutorialStep } from '@/lib/machines/tutorialMachine';

import { IconTopDown } from '@/lib/icons';
import Button from '@/ui/button';
import { Kbd } from '@/ui/kbd';

interface TutorialGuideProps {
  step: TutorialStep;
  onContinue: () => void;
}

export function TutorialGuide({ step, onContinue }: TutorialGuideProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16.75 z-20 flex items-center justify-center px-3 sm:top-3.5 sm:px-4">
      <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-2 bg-foreground/60 pixelated px-3 py-2 text-center text-xs leading-4 shadow-[2px_2px_0_#000] sm:max-w-md sm:gap-3 sm:px-4 sm:py-3 sm:text-sm sm:leading-5">
        {step === 'rotateBoard' ? (
          <>
            <p className="text-text-light sm:hidden">
              Turn the board with your fingers.
            </p>
            <p className="hidden text-text-light sm:block">
              Turn the board with{' '}
              <Kbd k="ArrowLeft" className="align-middle h-4 w-auto sm:h-8" />{' '}
              <Kbd k="ArrowRight" className="align-middle h-4 w-auto sm:h-8" />
            </p>
          </>
        ) : null}

        {step === 'toggleTopDown' ? (
          <>
            <p className="text-text-light sm:hidden">
              Tap{' '}
              <IconTopDown
                width={18}
                height={18}
                className="inline-block align-middle"
              />{' '}
              to switch to top-down view.
            </p>
            <p className="hidden text-text-light sm:block">
              Press <Kbd k="Q" className="align-middle h-4 w-auto sm:h-8" /> to
              switch to top-down view.
            </p>
          </>
        ) : null}

        {step === 'goal' ? (
          <>
            <p className="text-text-light">
              Keep the <span className="font-bold text-accent">blue orbs</span>{' '}
              contained. Keep the{' '}
              <span className="font-bold text-danger">red cones</span> out.
            </p>
            <Button
              onClick={onContinue}
              className="px-4 pt-2 pb-3 text-xs sm:px-6 sm:pt-3.5 sm:pb-5 sm:text-sm"
            >
              Got it
            </Button>
          </>
        ) : null}

        {step === 'placeSteps' ? (
          <p className="text-text-light">
            Drag the <span className="font-bold text-accent">steps</span> wall
            onto the glowing spot.
          </p>
        ) : null}

        {step === 'placeZigzag' ? (
          <>
            <p className="text-text-light sm:hidden">
              Drag <span className="font-bold text-accent">zigzagTall</span>{' '}
              onto the glowing spot. Tap while holding it to rotate.
            </p>
            <p className="hidden text-text-light sm:block">
              Drag <span className="font-bold text-accent">zigzagTall</span>{' '}
              onto the glowing spot. Rotate with{' '}
              <Kbd k="Space" className="align-middle h-4 w-auto sm:h-8" /> while
              holding it.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
