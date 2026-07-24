"use client";

import { useMemo, useState } from "react";
import type { DemoWeek } from "@/lib/demoReels";

type Metric = "avgCpc" | "avgCac";

const WIDTH = 640;
const HEIGHT = 230;
const PADDING = { top: 24, right: 24, bottom: 38, left: 54 };

export default function MetricsChart({ weeks }: { weeks: DemoWeek[] }) {
  const [metric, setMetric] = useState<Metric>("avgCpc");

  const chart = useMemo(() => {
    const values = weeks.map((week) => week.metrics[metric]);
    const max = Math.max(...values, 1);
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const points = values.map((value, index) => ({
      value,
      x:
        PADDING.left +
        (weeks.length === 1 ? plotWidth / 2 : (index / (weeks.length - 1)) * plotWidth),
      y: PADDING.top + plotHeight - (value / max) * plotHeight,
    }));

    return {
      max,
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(" "),
    };
  }, [metric, weeks]);

  const label = metric === "avgCpc" ? "CPC" : "CAC";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-2" aria-label="Chart metric">
          {(["avgCpc", "avgCac"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMetric(option)}
              aria-pressed={metric === option}
              className={`rounded-md border px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                metric === option
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-line bg-inset text-muted hover:text-foreground"
              }`}
            >
              {option === "avgCpc" ? "CPC" : "CAC"}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10px] text-muted">
          Lower is better · simulated
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="min-w-[520px] w-full"
          role="img"
          aria-label={`${label} trend across ${weeks.length} campaign weeks`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y =
              PADDING.top +
              (HEIGHT - PADDING.top - PADDING.bottom) * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="#222a38"
                  strokeDasharray="4 5"
                />
                <text
                  x={PADDING.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#8b94a7"
                  fontSize="10"
                >
                  ${(chart.max * ratio).toFixed(2)}
                </text>
              </g>
            );
          })}

          <polyline
            points={chart.polyline}
            fill="none"
            stroke="#7c6cff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {chart.points.map((point, index) => (
            <g key={weeks[index].week}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill={index === chart.points.length - 1 ? "#34d399" : "#7c6cff"}
                stroke="#121722"
                strokeWidth="3"
              />
              <text
                x={point.x}
                y={point.y - 13}
                textAnchor="middle"
                fill="#e8ecf4"
                fontSize="11"
                fontWeight="700"
              >
                ${point.value.toFixed(2)}
              </text>
              <text
                x={point.x}
                y={HEIGHT - 14}
                textAnchor="middle"
                fill="#8b94a7"
                fontSize="10"
              >
                Week {weeks[index].week}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
