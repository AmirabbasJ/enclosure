import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '../utils/cn';

type RangeSliderProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type'
> & {
  id: string;
  label: ReactNode;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

function RangeSlider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  id,
  ...props
}: RangeSliderProps) {
  const inputId = `range-${id.toLowerCase().replace(/\s+/g, '-')}`;
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex w-full items-center gap-4 font-pixel text-xs text-text-light',
        className
      )}
    >
      {label}
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="pixel-range min-w-0 flex-1"
        style={{ '--range-pct': `${pct}%` } as CSSProperties}
        {...props}
      />
      <span className="w-10 shrink-0 text-right tabular-nums">
        {Math.round(value)}
      </span>
    </label>
  );
}

export default RangeSlider;
