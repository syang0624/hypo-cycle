export default function ReelPreview({
  hookType,
  voice,
  script,
  pacing,
  status,
}: {
  hookType: string;
  voice: string;
  script: string;
  pacing: string;
  status: "winning" | "running" | "killed";
}) {
  const gradients: Record<string, string> = {
    "pain-point": "from-rose-600 via-red-500 to-orange-500",
    "statistic": "from-blue-600 via-indigo-500 to-cyan-500",
    "question": "from-violet-600 via-purple-500 to-fuchsia-500",
    "contrarian": "from-amber-600 via-orange-500 to-yellow-500",
  };
  const bg = gradients[hookType] ?? "from-gray-600 via-gray-500 to-gray-400";
  const pacingSpeed = pacing === "fast" ? "2s" : pacing === "slow" ? "6s" : "4s";

  return (
    <div
      className={`relative w-full aspect-[9/16] rounded-[14px] mb-3 overflow-hidden ${
        status === "killed" ? "grayscale opacity-50" : ""
      }`}
    >
      {/* Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${bg}`}
        style={{ animation: `reelShimmer ${pacingSpeed} ease-in-out infinite alternate` }}
      />

      {/* Subtle grain texture */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
      }} />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-3.5 text-white">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-black/30 backdrop-blur-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">
            {hookType}
          </span>
          <span className="rounded-full bg-black/30 backdrop-blur-md px-2 py-1 text-[9px] font-medium">
            {voice}
          </span>
        </div>

        {/* Script — the actual ad copy */}
        <div className="mt-auto">
          <p className="text-[11px] leading-relaxed text-white/95 font-medium line-clamp-4 drop-shadow-sm">
            &ldquo;{script}&rdquo;
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-0.5 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/60 rounded-full" style={{ width: "75%", animation: `reelProgress ${pacingSpeed} ease-in-out infinite alternate` }} />
            </div>
            <span className="text-[8px] text-white/40 uppercase tracking-widest font-semibold">{pacing}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
