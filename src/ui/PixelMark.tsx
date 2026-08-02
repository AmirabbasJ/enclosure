import { palette } from '#/theme/palette';

interface PixelIconProps {
  className?: string;
  size?: number;
}

const OK = '#4ADE80';

export function PixelTick({ className, size = 18 }: PixelIconProps) {
  const cells: readonly [number, number][] = [
    // short arm
    [1, 3],
    [1, 4],
    [2, 4],
    [2, 5],
    [3, 5],
    // long arm
    [3, 4],
    [4, 3],
    [4, 4],
    [5, 2],
    [5, 3],
    [6, 1],
    [6, 2],
    [7, 0],
    [7, 1],
  ];

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={OK} />
      ))}
    </svg>
  );
}

export function PixelCross({ className, size = 18 }: PixelIconProps) {
  const c = palette.danger;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <rect x="1" y="1" width="1" height="1" fill={c} />
      <rect x="2" y="2" width="1" height="1" fill={c} />
      <rect x="3" y="3" width="1" height="1" fill={c} />
      <rect x="4" y="4" width="1" height="1" fill={c} />
      <rect x="5" y="5" width="1" height="1" fill={c} />
      <rect x="5" y="1" width="1" height="1" fill={c} />
      <rect x="4" y="2" width="1" height="1" fill={c} />
      <rect x="2" y="4" width="1" height="1" fill={c} />
      <rect x="1" y="5" width="1" height="1" fill={c} />
    </svg>
  );
}
