import OpenAI from "openai";
import type { VideoProvider } from "./provider";

/**
 * Sora 2 implementation of VideoProvider via the OpenAI Videos API.
 * Runs inside a Convex action, so it reads OPENAI_API_KEY from process.env.
 * This factory is the single swap point for a different provider.
 */
export function createSoraProvider(): VideoProvider {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2 });
  return {
    async startVideo(prompt, opts) {
      const video = await client.videos.create({
        prompt,
        model: opts.model,
        seconds: opts.seconds,
        size: opts.size,
      });
      return { jobId: video.id };
    },
    async pollVideo(jobId) {
      const v = await client.videos.retrieve(jobId);
      if (v.status === "completed") return { status: "completed" as const };
      if (v.status === "failed") {
        return { status: "failed" as const, error: v.error?.message ?? "Sora generation failed" };
      }
      return { status: "pending" as const }; // queued | in_progress
    },
    async fetchContent(jobId) {
      const res = await client.videos.downloadContent(jobId);
      return await res.blob();
    },
  };
}
