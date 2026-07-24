"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Landing-page affordance: if this browser has watched a cycle before, offer a
// way back to it. Written by the cycle dashboard; best-effort only.
export default function ResumeCampaign() {
  const [lastCycleId, setLastCycleId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hypocycle:lastCycle");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id?: string };
      if (parsed.id) setLastCycleId(parsed.id);
    } catch {
      // Corrupt or blocked storage — just don't offer resume.
    }
  }, []);

  if (!lastCycleId) return null;

  return (
    <Link
      href={`/cycles/${lastCycleId}`}
      className="rounded-lg border border-line bg-panel px-6 py-3 text-[14px] font-semibold text-foreground hover:border-primary/50 transition-colors"
    >
      Resume last campaign
    </Link>
  );
}
