"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function AgentReasoningPanel({
  text,
}: {
  title: string;
  text: string;
}) {
  const [charIndex, setCharIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const done = charIndex >= text.length;

  const getDelay = useCallback(
    (idx: number) => {
      const ch = text[idx];
      if (ch === "\n") return 30;
      if (ch === "." || ch === ":" || ch === "!") return 40;
      if (ch === ",") return 20;
      return 6;
    },
    [text],
  );

  useEffect(() => {
    setCharIndex(0);
  }, [text]);

  useEffect(() => {
    if (done) return;
    const timeout = setTimeout(() => {
      // Emit 1-3 chars at a time for natural bursting
      const burst = text[charIndex] === " " ? 2 : 1;
      setCharIndex((prev) => Math.min(prev + burst, text.length));
    }, getDelay(charIndex));
    return () => clearTimeout(timeout);
  }, [charIndex, done, text, getDelay]);

  // Auto-scroll to bottom as text streams
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [charIndex]);

  return (
    <div
      ref={containerRef}
      className="text-[12px] text-foreground/60 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto bg-background rounded-[16px] p-4"
    >
      {text.slice(0, charIndex)}
      {!done && <span className="animate-pulse text-primary">|</span>}
    </div>
  );
}
