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

const COLORS_GOOD = ["#34C759", "#30B350", "#2CA048"];
const COLORS_BAD = ["#FF3B30", "#E6352B", "#CC2F26"];
const COLORS_NEUTRAL = ["#007AFF", "#5856D6", "#AF52DE", "#FF9500", "#00C7BE", "#5AC8FA", "#FF2D55", "#64D2FF"];

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
            className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 ${
              metric === m
                ? "bg-primary text-white shadow-bento"
                : "bg-background text-foreground/50 hover:text-foreground/70"
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload) return null;
              return (
                <div className="rounded-[16px] bg-card p-4 shadow-bento text-xs">
                  <p className="font-semibold text-foreground mb-2">{label}</p>
                  {payload.map((entry) => {
                    const v = variantMap.get(entry.dataKey as string);
                    return (
                      <div key={String(entry.dataKey)} className="flex items-center gap-2 mb-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-500">
                          {v ? `${v.hookType} / ${v.voice} / ${v.pacing}` : "?"}
                        </span>
                        <span className="font-medium ml-auto">
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
              <span className="text-[10px] text-gray-500">{variantLabel(value)}</span>
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
