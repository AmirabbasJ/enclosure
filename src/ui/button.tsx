import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import type { VariantProps } from 'tailwind-variants';

import { tv } from 'tailwind-variants';

import { useGameAudio } from '../context/GameAudioContext';
import { cn } from '../utils/cn';
import { LoadingDots } from './LoadingDots';

const buttonVariants = tv({
  base: [
    'cursor-pointer font-pixel text-sm text-text-light',
    'enabled:hover:text-border',
    'enabled:active:translate-y-[5px]',
    'enabled:active:shadow-[inset_0_-3px_0_0_color-mix(in_srgb,var(--color-foreground)_70%,#000)]',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  variants: {
    variant: {
      default:
        'bg-foreground shadow-[inset_0_-8px_0_0_color-mix(in_srgb,var(--color-foreground)_70%,#000)] enabled:hover:bg-[color-mix(in_srgb,var(--color-foreground)_85%,#000)]',
      danger:
        'bg-danger shadow-[inset_0_-8px_0_0_color-mix(in_srgb,var(--color-danger)_70%,#000)] enabled:hover:bg-[color-mix(in_srgb,var(--color-danger)_85%,#000)]',
    },
    noStyling: {
      true: 'bg-transparent py-2 shadow-none enabled:hover:bg-transparent enabled:active:shadow-none hover:text-text-light',
    },
    size: {
      default: 'px-6 pt-3.5 pb-5',
      icon: 'flex items-center justify-center px-2 pt-1 pb-2.5',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
});

export type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & {
      isLoading?: boolean;
    }
>;

function Button({
  children,
  className,
  variant,
  noStyling,
  onClick,
  size,
  isLoading = false,
  ...props
}: ButtonProps) {
  const { playButtonClick } = useGameAudio();
  return (
    <button
      type="button"
      onClick={(event) => {
        playButtonClick();
        return onClick?.(event);
      }}
      disabled={isLoading || props.disabled}
      className={cn(buttonVariants({ variant, size, noStyling, className }))}
      {...props}
    >
      {isLoading ? <LoadingDots /> : children}
    </button>
  );
}

export default Button;
