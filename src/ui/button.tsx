import type { PropsWithChildren } from 'react';

function Button({ children }: PropsWithChildren) {
  return (
    <button className="cursor-pointer bg-bg text-text-light py-2 px-4 hover:bg-panel hover:text-border ">
      {children}
    </button>
  );
}

export default Button;
