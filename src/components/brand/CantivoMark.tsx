interface CantivoMarkProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Diapasão mark — the Cantivo brand symbol.
 * ViewBox 0 0 36 52, aspect ratio 9:13.
 * Default color is 'currentColor' so it inherits from CSS.
 */
export function CantivoMark({ size = 24, color = 'currentColor', className }: CantivoMarkProps) {
  const width = Math.round(size * (36 / 52));

  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 36 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M9 4L9 28Q9 40 18 40Q27 40 27 28L27 4"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="18" y1="40" x2="18" y2="49"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
