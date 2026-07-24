import type { Variant } from "../types";

export type VariantPromptInput = Pick<
  Variant,
  "hookType" | "scriptType" | "voice" | "music" | "pacing" | "cta" | "audience" | "script"
>;

const PACING_HINT: Record<string, string> = {
  fast: "rapid, punchy cuts",
  medium: "steady, clear pacing",
  slow: "slow, deliberate, cinematic pacing",
};

const MUSIC_HINT: Record<string, string> = {
  upbeat: "energetic upbeat soundtrack feel",
  calm: "calm, minimal ambient feel",
  cinematic: "cinematic, dramatic score feel",
  none: "natural ambience, no music",
};

/**
 * Turn a variant's script + creative DNA into a concrete Sora prompt for a short
 * vertical ad reel. Deterministic: same inputs => same prompt.
 *
 * `feedback` is the prior batch's Analyst nextBatchBrief (undefined on batch 1).
 * When present it's appended as creative direction, so the *visual* creative
 * improves each loop — not just the variant metadata. See the feedback-loop
 * section of the spec.
 */
export function buildVideoPrompt(variant: VariantPromptInput, feedback?: string): string {
  const pacing = PACING_HINT[variant.pacing] ?? variant.pacing;
  const music = MUSIC_HINT[variant.music] ?? variant.music;
  const parts = [
    `A ${variant.pacing}-paced vertical short-form video advertisement.`,
    `Hook style: ${variant.hookType}. Narrative structure: ${variant.scriptType}.`,
    `On-screen talent/voice: ${variant.voice}. ${pacing}. ${music}.`,
    `Aimed at a ${variant.audience} audience.`,
    `Visualize this script/voiceover: "${variant.script}"`,
    `End on a clear call to action: ${variant.cta}.`,
    `Modern, scroll-stopping social-media ad aesthetic. No on-screen watermarks.`,
  ];
  if (feedback && feedback.trim().length > 0) {
    parts.push(
      `Creative direction from what performed best in the previous batch — lean the visual style and message into this: "${feedback.trim()}".`,
    );
  }
  return parts.join(" ");
}
