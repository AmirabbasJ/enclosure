import type { ImgHTMLAttributes } from 'react';

const KBD = {
  '1': { src: '/kbd/1.png', w: 17, h: 16, label: '1' },
  '2': { src: '/kbd/2.png', w: 17, h: 16, label: '2' },
  '3': { src: '/kbd/3.png', w: 17, h: 16, label: '3' },
  '4': { src: '/kbd/4.png', w: 17, h: 16, label: '4' },
  W: { src: '/kbd/W.png', w: 17, h: 16, label: 'W' },
  A: { src: '/kbd/A.png', w: 17, h: 16, label: 'A' },
  S: { src: '/kbd/S.png', w: 17, h: 16, label: 'S' },
  D: { src: '/kbd/D.png', w: 17, h: 16, label: 'D' },
  ArrowLeft: { src: '/kbd/ARROWLEFT.png', w: 17, h: 16, label: 'Left arrow' },
  ArrowRight: {
    src: '/kbd/ARROWRIGHT.png',
    w: 17,
    h: 16,
    label: 'Right arrow',
  },
  Space: { src: '/kbd/SPACEALTERNATIVE.png', w: 67, h: 16, label: 'Space' },
  Enter: { src: '/kbd/ENTERALTERNATIVE.png', w: 42, h: 31, label: 'Enter' },
  MouseLeft: {
    src: '/kbd/Mouse-left-click.png',
    w: 16,
    h: 16,
    label: 'Left click',
    tint: false,
  },
} as const;

export type KbdKey = keyof typeof KBD;

const SCALE = 2;

type KbdProps = {
  k: KbdKey;
  className?: string;
} & Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'alt' | 'width' | 'height' | 'children'
>;

export function Kbd({ k, className = '', ...props }: KbdProps) {
  const asset = KBD[k];
  const tint = !('tint' in asset && asset.tint === false);
  return (
    <img
      src={asset.src}
      alt={asset.label}
      width={asset.w * SCALE}
      height={asset.h * SCALE}
      draggable={false}
      className={`${tint ? 'kbd-tint' : ''} inline-block [image-rendering:pixelated] ${className}`}
      {...props}
    />
  );
}
