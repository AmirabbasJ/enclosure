import type { InputHTMLAttributes } from 'react';

function TextField({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full border border-border bg-panel px-3 py-2 text-xs text-text-light outline-none placeholder:text-text-muted focus:border-accent ${className}`}
      {...props}
    />
  );
}

export default TextField;
