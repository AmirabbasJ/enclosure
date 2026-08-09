import type { ButtonProps } from '@/ui/button';

import Button from '@/ui/button';

export function MenuButton(props: ButtonProps) {
  return (
    <Button {...props} className="flex min-w-75 items-center justify-center" />
  );
}
