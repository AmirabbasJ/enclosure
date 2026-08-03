import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { twMerge } from 'tailwind-merge';

function Button({
  children,
  className = '',
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      type="button"
      className={twMerge(
        `pixelated cursor-pointer bg-foreground px-6 py-3.5 text-sm text-text-light hover:bg-foreground/80 hover:text-border disabled:cursor-not-allowed disabled:opacity-50`,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
