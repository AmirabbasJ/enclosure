import type { PropsWithChildren } from 'react';

function Button({ children }: PropsWithChildren) {
  return (
    <button className="bg-(--color-surface) text-(--color-text-light) border border-(--color-border) p-2 hover:bg-(--color-accent) hover:text-(--color-bg)">
      {children}
    </button>
  );
}

export default Button;
