/**
 * Provider-agnostic video-generation seam. Sora lives behind this today; a free
 * model (HF Inference Providers → LTX) or fal/Replicate can drop in by writing
 * another implementation and swapping it in convex/video.ts — no other change.
 */

export type StartVideoOptions = {
  model: "sora-2" | "sora-2-pro";
  seconds: "4" | "8" | "12";
  size: "720x1280" | "1280x720" | "1024x1792" | "1792x1024";
};

export type PollResult =
  | { status: "pending" }
  | { status: "completed" }
  | { status: "failed"; error: string };

export interface VideoProvider {
  startVideo(prompt: string, opts: StartVideoOptions): Promise<{ jobId: string }>;
  pollVideo(jobId: string): Promise<PollResult>;
  /** Download the finished clip as a Blob (only valid once completed). */
  fetchContent(jobId: string): Promise<Blob>;
}
