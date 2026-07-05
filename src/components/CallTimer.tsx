"use client";

import { useEffect, useState } from "react";
import { formatDurationSeconds, formatElapsedHMS } from "@/lib/utils";

interface CallTimerProps {
  startTime: string;
  stopTime?: string | null;
  format?: "hms" | "compact";
  label?: string;
  className?: string;
}

export function CallTimer({
  startTime,
  stopTime = null,
  format = "compact",
  label,
  className = "",
}: CallTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const stop = stopTime ? new Date(stopTime).getTime() : null;

    function tick() {
      const end = stop ?? Date.now();
      setElapsed(Math.max(0, Math.floor((end - start) / 1000)));
    }

    tick();
    if (stop) return;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime, stopTime]);

  const formatted =
    format === "hms" ? formatElapsedHMS(elapsed) : formatDurationSeconds(elapsed);

  return (
    <div className={className}>
      {label && (
        <p className="text-sm font-medium text-muted mb-2 uppercase tracking-wide">
          {label}
        </p>
      )}
      <div
        className="font-mono text-4xl sm:text-5xl font-bold tracking-wider text-foreground tabular-nums"
        aria-live={stopTime ? "off" : "polite"}
        aria-label={`${label ?? "Elapsed time"} ${formatted}`}
      >
        {formatted}
      </div>
    </div>
  );
}
