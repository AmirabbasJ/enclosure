import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

function Button({
  children,
  className = '',
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      type="button"
      className={`cursor-pointer bg-bg px-6 py-3.5 text-sm text-text-light hover:bg-panel hover:text-border disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
