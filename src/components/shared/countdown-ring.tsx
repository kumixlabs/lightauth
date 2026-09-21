interface CountdownRingProps {
  secondsRemaining: number;
  period: number;
  size?: number;
}

export function CountdownRing({ secondsRemaining, period, size = 24 }: CountdownRingProps) {
  const progress = secondsRemaining / period;
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  // Color shifts: green → yellow → red
  const color =
    progress > 0.5
      ? "var(--color-green-500, #22c55e)"
      : progress > 0.2
        ? "var(--color-yellow-500, #eab308)"
        : "var(--color-red-500, #ef4444)";

  return (
    <div className="flex items-center gap-1">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-muted-foreground/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className="w-4 text-right text-[10px] text-muted-foreground tabular-nums">
        {secondsRemaining}
      </span>
    </div>
  );
}
