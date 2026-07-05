"use client";

import { useEffect, useState } from "react";
import { formatDurationSeconds } from "@/lib/utils";

interface CallTimerProps {
  startTime: string;
  className?: string;
}

export function CallTimer({ startTime, className = "" }: CallTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();

    function tick() {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div
      className={`font-mono text-5xl sm:text-6xl font-bold tracking-wider text-primary tabular-nums ${className}`}
      aria-live="polite"
      aria-label={`Elapsed time ${formatDurationSeconds(elapsed)}`}
    >
      {formatDurationSeconds(elapsed)}
    </div>
  );
}
