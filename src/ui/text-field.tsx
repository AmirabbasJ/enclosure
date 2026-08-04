import type { InputHTMLAttributes } from 'react';

function TextField({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full border-b-3 border-border  px-4 py-3 text-sm text-text-light outline-none placeholder:text-text-muted focus:border-accent ${className}`}
      {...props}
    />
  );
}

export default TextField;
