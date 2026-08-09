import type { TutorialStep } from '@/lib/machines/tutorialMachine';

import Button from '@/ui/button';
import { Kbd } from '@/ui/kbd';

interface TutorialGuideProps {
  step: TutorialStep;
  onContinue: () => void;
}

export function TutorialGuide({ step, onContinue }: TutorialGuideProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-md flex-col items-center gap-3 bg-foreground/60 pixelated px-4 py-3 text-center shadow-[2px_2px_0_#000]">
        {step === 'rotateBoard' ? (
          <p className="text-sm leading-5 text-text-light">
            Turn the board with <Kbd k="ArrowLeft" className="align-middle" />{' '}
            <Kbd k="ArrowRight" className="align-middle" />
          </p>
        ) : null}

        {step === 'toggleTopDown' ? (
          <p className="text-sm leading-5 text-text-light">
            Press <Kbd k="Q" className="align-middle" /> to switch to top-down
            view.
          </p>
        ) : null}

        {step === 'goal' ? (
          <>
            <p className="text-sm leading-5 text-text-light">
              Keep the <span className="font-bold text-accent">blue orbs</span>{' '}
              contained. Keep the{' '}
              <span className="font-bold text-danger">red cones</span> out.
            </p>
            <Button onClick={onContinue}>Got it</Button>
          </>
        ) : null}

        {step === 'placeSteps' ? (
          <p className="text-sm leading-5 text-text-light">
            Drag the <span className="font-bold text-accent">steps</span> wall
            onto the glowing spot.
          </p>
        ) : null}

        {step === 'placeZigzag' ? (
          <p className="text-sm leading-5 text-text-light">
            Drag <span className="font-bold text-accent">zigzagTall</span> onto
            the glowing spot. Rotate with{' '}
            <Kbd k="Space" className="align-middle" /> while holding it.
          </p>
        ) : null}
      </div>
    </div>
  );
}
