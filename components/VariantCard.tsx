"use client";

import { useState } from "react";
import type { Variant, Metric } from "@/lib/types";
import ReelPreview from "./ReelPreview";
import ReelModal from "./ReelModal";

function StatusBadge({ status }: { status: "winning" | "running" | "killed" }) {
  const styles = {
    winning: "bg-green-500/10 text-green-600",
    running: "bg-primary/10 text-primary",
    killed: "bg-red-500/10 text-red-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${styles[status]}`}>
      {status === "running" && (
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function DnaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background rounded-[10px] px-2.5 py-1.5 text-center">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-foreground/35">{label}</span>
      <span className="block text-[12px] font-medium text-foreground/70 mt-0.5">{value}</span>
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
  const status = isDead ? "killed" as const : isWinning ? "winning" as const : "running" as const;
  const videoSrc = cachedVideoPath ?? (variant.videoStatus === "ready" ? variant.videoUrl : undefined);

  return (
    <div
      className={`rounded-[20px] p-5 text-sm transition-all duration-700 hover:shadow-bento animate-fadeIn ${
        isDead
          ? "opacity-50 bg-red-50"
          : isWinning
            ? "bg-green-50 ring-2 ring-green-400/30"
            : "bg-background"
      }`}
      style={{ animationDelay: `${revealDelay}ms`, animationFillMode: "backwards" }}
    >
      {/* Header: hook type + status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-foreground text-card px-3 py-1 text-[11px] font-semibold">
            {variant.hookType}
          </span>
          <span className="rounded-full bg-foreground/5 px-3 py-1 text-[11px] text-foreground/50 font-medium">
            {variant.scriptType}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Video reel — click to open with audio. Killed reels stay visible,
          dimmed, with a CUT overlay so the cut is obvious. */}
      <div
        className="relative mb-3 cursor-pointer group"
        onClick={() => setModalOpen(true)}
      >
        {videoSrc ? (
          <video
            src={videoSrc}
            className={`w-full rounded-[14px] aspect-[9/16] object-cover bg-background ${
              isDead ? "grayscale" : ""
            }`}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : variant.videoStatus === "pending" ? (
          <div className="w-full aspect-[9/16] rounded-[14px] bg-background animate-pulse flex items-center justify-center text-[12px] text-foreground/40">
            generating reel...
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
          <div className="absolute inset-0 rounded-[14px] flex items-center justify-center pointer-events-none">
            <span className="rounded-full bg-red-500 text-white px-3 py-1 text-[11px] font-bold tracking-wide shadow">
              CUT
            </span>
          </div>
        )}

        <div className="absolute inset-0 rounded-[14px] bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          <span className="rounded-full bg-white/90 text-foreground px-3 py-1 text-[11px] font-bold">▶ Play with sound</span>
        </div>
      </div>

      {/* Script */}
      <p className="text-foreground/70 text-[13px] leading-relaxed line-clamp-3 mb-3">
        {variant.script}
      </p>

      {/* Hypothesis */}
      <p className="text-[11px] text-foreground/35 italic mb-4 line-clamp-1">
        Hypothesis: {variant.hypothesis}
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
        <div className="grid grid-cols-4 gap-2 text-xs mb-4">
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
        <p className="text-[12px] text-red-400 mb-4">No impressions — variant killed</p>
      ) : null}

      {/* Kill/scale rules — hidden in compact mode */}
      {!compact && (
        <div className="text-[11px] text-foreground/30 space-y-0.5">
          <p>Kill: {variant.killRule}</p>
          <p>Scale: {variant.scaleRule}</p>
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
      ? "text-green-600 font-bold"
      : highlight === "red"
        ? "text-red-500 font-bold"
        : "text-foreground font-semibold";
  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-foreground/30">{label}</span>
      <span className={`text-[13px] ${color}`}>{value}</span>
    </div>
  );
}
