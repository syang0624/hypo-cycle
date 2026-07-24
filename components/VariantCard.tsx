"use client";

import { useState } from "react";
import type { Variant, Metric } from "@/lib/types";
import ReelPreview from "./ReelPreview";
import ReelModal from "./ReelModal";
import { Chip } from "./ui";

function StatusBadge({ status }: { status: "winning" | "running" | "killed" }) {
  if (status === "winning") return <Chip tone="good">Winning</Chip>;
  if (status === "killed") return <Chip tone="bad">Cut</Chip>;
  return (
    <Chip tone="info" pulse>
      Live
    </Chip>
  );
}

function DnaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-inset rounded-md px-2 py-1.5 text-center min-w-0">
      <span className="block font-mono text-[9px] uppercase tracking-wider text-muted/70 truncate">
        {label}
      </span>
      <span className="block text-[11px] font-medium text-foreground/80 mt-0.5 truncate">
        {value}
      </span>
    </div>
  );
}

export default function VariantCard({
  variant,
  metrics,
  revealDelay = 0,
  compact = false,
  cachedVideoPath,
  killedByBandit,
}: {
  variant: Variant;
  metrics: Metric[];
  revealDelay?: number;
  compact?: boolean;
  cachedVideoPath?: string;
  killedByBandit?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const sorted = metrics.slice().sort((a, b) => a.day - b.day);
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const isDead = killedByBandit || (latest !== null && latest.impressions === 0);
  const isWinning = !isDead && latest !== null && latest.cac > 0 && latest.cac < 80;
  const status = isDead ? ("killed" as const) : isWinning ? ("winning" as const) : ("running" as const);
  const videoSrc = cachedVideoPath ?? (variant.videoStatus === "ready" ? variant.videoUrl : undefined);

  return (
    <div
      className={`border rounded-xl p-4 text-sm transition-all duration-700 animate-fadeIn ${
        isDead
          ? "opacity-50 border-bad/30 bg-bad/5"
          : isWinning
            ? "border-good/40 bg-good/5"
            : "border-line bg-inset"
      }`}
      style={{ animationDelay: `${revealDelay}ms`, animationFillMode: "backwards" }}
    >
      {/* Header: hook type + status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="rounded-md bg-foreground text-background px-2 py-0.5 font-mono text-[10px] font-bold truncate">
            {variant.hookType}
          </span>
          <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[10px] text-muted truncate">
            {variant.scriptType}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Video reel — click to open with audio. Killed reels stay visible,
          dimmed, with a CUT overlay so the cut is obvious. */}
      <div className="relative mb-3 cursor-pointer group" onClick={() => setModalOpen(true)}>
        {videoSrc ? (
          <video
            src={videoSrc}
            className={`w-full rounded-lg aspect-[9/16] object-cover bg-background ${
              isDead ? "grayscale" : ""
            }`}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : variant.videoStatus === "pending" ? (
          <div className="w-full aspect-[9/16] rounded-lg animate-shimmer flex items-center justify-center font-mono text-[11px] text-muted">
            generating reel…
          </div>
        ) : (
          <ReelPreview
            hookType={variant.hookType}
            voice={variant.voice}
            script={variant.script}
            pacing={variant.pacing}
            status={status}
          />
        )}

        {isDead && (
          <div className="absolute inset-0 rounded-lg flex items-center justify-center pointer-events-none">
            <span className="rounded-md bg-bad text-background px-3 py-1 font-mono text-[11px] font-bold tracking-widest">
              CUT
            </span>
          </div>
        )}

        <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          <span className="rounded-md bg-foreground text-background px-3 py-1 font-mono text-[11px] font-bold">
            ▶ play with sound
          </span>
        </div>
      </div>

      {/* Script */}
      <p className="text-foreground/70 text-[12.5px] leading-relaxed line-clamp-3 mb-3">
        {variant.script}
      </p>

      {/* Hypothesis under test */}
      <p className="font-mono text-[10px] text-muted/70 mb-4 line-clamp-1">
        H: {variant.hypothesis}
      </p>

      {/* DNA grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-4">
        <DnaPill label="Voice" value={variant.voice} />
        <DnaPill label="Music" value={variant.music} />
        <DnaPill label="Pacing" value={variant.pacing} />
        <DnaPill label="CTA" value={variant.cta} />
        <DnaPill label="Budget" value={`$${variant.budget}`} />
      </div>

      {/* Live metrics */}
      {latest && latest.impressions > 0 ? (
        <div className="grid grid-cols-4 gap-2 text-xs mb-1 border-t border-line pt-3">
          <MetricCell label="CPC" value={`$${latest.cpc.toFixed(2)}`} />
          <MetricCell
            label="CAC"
            value={`$${latest.cac.toFixed(2)}`}
            highlight={latest.cac < 80 ? "green" : latest.cac > 110 ? "red" : undefined}
          />
          <MetricCell label="CTR" value={`${(latest.ctr * 100).toFixed(1)}%`} />
          <MetricCell label="CVR" value={`${(latest.cvr * 100).toFixed(1)}%`} />
        </div>
      ) : isDead ? (
        <p className="font-mono text-[11px] text-bad/70 mb-1">no impressions — variant cut</p>
      ) : null}

      {/* Kill/scale rules — hidden in compact mode */}
      {!compact && (
        <div className="font-mono text-[10px] text-muted/60 space-y-0.5 mt-2">
          <p>kill: {variant.killRule}</p>
          <p>scale: {variant.scaleRule}</p>
        </div>
      )}

      <ReelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        videoSrc={videoSrc}
        hookType={variant.hookType}
        voice={variant.voice}
        script={variant.script}
        killed={isDead}
      />
    </div>
  );
}

function MetricCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "green" | "red";
}) {
  const color =
    highlight === "green"
      ? "text-good font-bold"
      : highlight === "red"
        ? "text-bad font-bold"
        : "text-foreground font-semibold";
  return (
    <div>
      <span className="block font-mono text-[9px] uppercase tracking-wider text-muted/70">
        {label}
      </span>
      <span className={`font-mono text-[12px] ${color}`}>{value}</span>
    </div>
  );
}
