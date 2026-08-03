import { Avatar as DicebearAvatar, Style } from '@dicebear/core';
import definition from '@dicebear/styles/pixelbot.json' with { type: 'json' };
import { useMemo } from 'react';

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
  alt?: string;
}

export function Avatar({
  seed,
  size = 50,
  className = '',
  alt = 'avatar',
}: AvatarProps) {
  const img = useMemo(() => {
    const style = new Style(definition);
    const avatar = new DicebearAvatar(style, {
      size,
      seed,
    });

    const svg = avatar.toDataUri();
    return svg;
  }, [seed, size]);

  return (
    <img src={img} alt={alt} width={size} height={size} className={className} />
  );
}
