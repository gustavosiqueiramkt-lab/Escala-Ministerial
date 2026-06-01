interface WaveDividerProps {
  fromColor: string;
  toColor: string;
  flip?: boolean;
}

export function WaveDivider({ fromColor, toColor, flip = false }: WaveDividerProps) {
  return (
    <div
      className="w-full -mt-px"
      style={{ backgroundColor: toColor }}
    >
      <svg
        viewBox="0 0 1440 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full block"
        style={{ transform: flip ? 'scaleY(-1)' : undefined }}
        preserveAspectRatio="none"
      >
        <path
          d="M0 0L60 8C120 16 240 32 360 36C480 40 600 32 720 24C840 16 960 8 1080 10.7C1200 13.3 1320 26.7 1380 33.3L1440 40V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0V0Z"
          fill={fromColor}
        />
      </svg>
    </div>
  );
}
