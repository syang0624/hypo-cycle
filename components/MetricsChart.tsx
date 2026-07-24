"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Metric, Variant } from "@/lib/types";

type ChartMetric = "cac" | "cpc";

const COLORS_GOOD = ["#34D399", "#2FBF8A", "#29AB7C"];
const COLORS_BAD = ["#F87171", "#E06565", "#C95A5A"];
const COLORS_NEUTRAL = ["#7C6CFF", "#38BDF8", "#F472B6", "#FBBF24", "#22D3EE", "#A78BFA", "#FB923C", "#4ADE80"];

export default function MetricsChart({
  metrics,
  variants,
}: {
  metrics: Metric[];
  variants: Variant[];
}) {
  const [metric, setMetric] = useState<ChartMetric>("cac");

  const variantMap = useMemo(() => {
    const m = new Map<string, Variant>();
    for (const v of variants) m.set(v._id as string, v);
    return m;
  }, [variants]);

  // Classify variants: winner (lowest final CAC), killed (0 impressions on last day), rest neutral
  const variantStatus = useMemo(() => {
    const days = Array.from(new Set(metrics.map((m) => m.day))).sort();
    const lastDay = days[days.length - 1];
    const lastDayMetrics = metrics.filter((m) => m.day === lastDay);

    const status = new Map<string, "winner" | "killed" | "neutral">();
    let bestCac = Infinity;
    let bestId = "";

    for (const m of lastDayMetrics) {
      const id = m.variantId as string;
      if (m.impressions === 0) {
        status.set(id, "killed");
      } else {
        status.set(id, "neutral");
        if (m.cac > 0 && m.cac < bestCac) {
          bestCac = m.cac;
          bestId = id;
        }
      }
    }
    if (bestId) status.set(bestId, "winner");
    return status;
  }, [metrics]);

  // Build chart data: one row per day, one key per variant
  const chartData = useMemo(() => {
    const days = Array.from(new Set(metrics.map((m) => m.day))).sort();
    return days.map((day) => {
      const row: Record<string, number | string> = { day: `Day ${day}` };
      for (const m of metrics.filter((m) => m.day === day)) {
        if (m.impressions > 0) {
          row[m.variantId as string] = m[metric];
        }
      }
      return row;
    });
  }, [metrics, metric]);

  function getColor(variantId: string, index: number) {
    const s = variantStatus.get(variantId);
    if (s === "winner") return COLORS_GOOD[0];
    if (s === "killed") return COLORS_BAD[index % COLORS_BAD.length];
    return COLORS_NEUTRAL[index % COLORS_NEUTRAL.length];
  }

  function variantLabel(id: string) {
    const v = variantMap.get(id);
    if (!v) return id.slice(-4);
    return `${v.hookType} / ${v.voice}`;
  }

  const variantIds = variants.map((v) => v._id as string);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["cac", "cpc"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-3.5 py-1.5 rounded-md border font-mono text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 ${
              metric === m
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-line bg-inset text-muted hover:text-foreground/70"
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222A38" />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#8B94A7" }} stroke="#222A38" />
          <YAxis
            tick={{ fontSize: 10, fill: "#8B94A7" }}
            stroke="#222A38"
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload) return null;
              return (
                <div className="rounded-lg border border-line bg-panel p-3.5 text-xs">
                  <p className="font-semibold text-foreground mb-2">{label}</p>
                  {payload.map((entry) => {
                    const v = variantMap.get(entry.dataKey as string);
                    return (
                      <div key={String(entry.dataKey)} className="flex items-center gap-2 mb-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted">
                          {v ? `${v.hookType} / ${v.voice} / ${v.pacing}` : "?"}
                        </span>
                        <span className="font-mono font-medium ml-auto text-foreground">
                          ${Number(entry.value).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          <Legend
            formatter={(value: string) => (
              <span className="font-mono text-[10px] text-muted">{variantLabel(value)}</span>
            )}
          />
          {variantIds.map((id, i) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              stroke={getColor(id, i)}
              strokeWidth={variantStatus.get(id) === "winner" ? 3 : 1.5}
              strokeDasharray={variantStatus.get(id) === "killed" ? "4 4" : undefined}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
