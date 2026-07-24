"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ReelModal({
  open,
  onClose,
  videoSrc,
  hookType,
  voice,
  script,
  killed = false,
}: {
  open: boolean;
  onClose: () => void;
  videoSrc?: string;
  hookType: string;
  voice: string;
  script: string;
  killed?: boolean;
}) {
  // Portal target only exists in the browser; gate on mount for SSR safety.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Render to document.body via a portal. The reel tiles for killed variants
  // carry opacity-50, and CSS opacity dims every descendant — including a
  // fixed-position modal. Portaling out of the card escapes that (and any
  // overflow/transform), so the popup is always full-opacity and readable.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-card rounded-bento shadow-bento overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 text-white text-[16px] leading-none flex items-center justify-center hover:bg-black/60"
        >
          ×
        </button>

        {videoSrc ? (
          <video
            src={videoSrc}
            className="w-full aspect-[9/16] object-cover bg-black"
            controls
            autoPlay
            loop
            playsInline
          />
        ) : (
          <div className="w-full aspect-[9/16] flex items-center justify-center bg-background text-[13px] text-foreground/40">
            No video available
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-foreground text-card px-2.5 py-0.5 text-[10px] font-bold">
              {hookType}
            </span>
            <span className="text-[11px] text-foreground/40">{voice}</span>
            {killed && (
              <span className="ml-auto rounded-full bg-red-500/10 text-red-500 px-2.5 py-0.5 text-[10px] font-bold">
                CUT
              </span>
            )}
          </div>
          <p className="text-[12px] text-foreground/60 leading-relaxed">&ldquo;{script}&rdquo;</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
