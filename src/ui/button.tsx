import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import type { VariantProps } from 'tailwind-variants';

import { tv } from 'tailwind-variants';

import { useGameAudio } from '../context/GameAudioContext';
import { cn } from '../utils/cn';

const buttonVariants = tv({
  base: [
    'cursor-pointer font-pixel text-sm text-text-light',
    'bg-foreground',
    'shadow-[inset_0_-8px_0_0_color-mix(in_srgb,var(--color-foreground)_70%,#000)]',
    'enabled:hover:bg-[color-mix(in_srgb,var(--color-foreground)_85%,#000)]',
    'enabled:hover:text-border',
    'enabled:active:translate-y-[5px]',
    'enabled:active:shadow-[inset_0_-3px_0_0_color-mix(in_srgb,var(--color-foreground)_70%,#000)]',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  variants: {
    variant: {
      filled: 'px-6 pt-3.5 pb-5',
      icon: 'flex items-center justify-center px-2 pt-1 pb-2.5',
    },
  },
  defaultVariants: {
    variant: 'filled',
  },
});

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
>;

function Button({
  children,
  className,
  variant,
  onClick,
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
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
