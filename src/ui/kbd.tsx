import type { ImgHTMLAttributes } from 'react';

import {
  Kbd1,
  Kbd2,
  Kbd3,
  Kbd4,
  KbdA,
  KbdArrowLeft,
  KbdArrowRight,
  KbdD,
  KbdEnter,
  KbdMouseLeft,
  KbdQ,
  KbdS,
  KbdSpace,
  KbdW,
} from '../assets/kbd';

const KBD = {
  '1': { src: Kbd1, w: 17, h: 16, label: '1' },
  '2': { src: Kbd2, w: 17, h: 16, label: '2' },
  '3': { src: Kbd3, w: 17, h: 16, label: '3' },
  '4': { src: Kbd4, w: 17, h: 16, label: '4' },
  W: { src: KbdW, w: 17, h: 16, label: 'W' },
  A: { src: KbdA, w: 17, h: 16, label: 'A' },
  S: { src: KbdS, w: 17, h: 16, label: 'S' },
  D: { src: KbdD, w: 17, h: 16, label: 'D' },
  Q: { src: KbdQ, w: 17, h: 16, label: 'Q' },
  ArrowLeft: { src: KbdArrowLeft, w: 17, h: 16, label: 'Left arrow' },
  ArrowRight: {
    src: KbdArrowRight,
    w: 17,
    h: 16,
    label: 'Right arrow',
  },
  Space: { src: KbdSpace, w: 67, h: 16, label: 'Space' },
  Enter: { src: KbdEnter, w: 42, h: 31, label: 'Enter' },
  MouseLeft: {
    src: KbdMouseLeft,
    w: 16,
    h: 16,
    label: 'Left click',
    tint: false,
  },
} as const;

export type KbdKey = keyof typeof KBD;

const SCALE = 2;

type KbdProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'alt' | 'children' | 'height' | 'src' | 'width'
> & {
  k: KbdKey;
  className?: string;
};

export function Kbd({ k, className = '', ...props }: KbdProps) {
  const asset = KBD[k];
  const tint = !('tint' in asset && !asset.tint);
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
