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
  return (
    <img
      src={`https://api.dicebear.com/10.x/pixelbot/svg?seed=${encodeURIComponent(seed)}`}
      alt={alt}
      width={size}
      height={size}
      className={className}
    />
  );
}
