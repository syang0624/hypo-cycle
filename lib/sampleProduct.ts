/**
 * Single source of truth for the cached-demo product. Imported by both the
 * Convex backend (to branch video generation) and the frontend (to prefill /
 * route). Keeping it framework-free means Convex's bundler pulls in nothing
 * heavy.
 */
export const SAMPLE_PRODUCT_NAME = "Coca-Cola";

/** True when this product should serve pre-generated cached reels (not Sora). */
export function usesCachedReels(name: string): boolean {
  return name.trim().toLowerCase() === SAMPLE_PRODUCT_NAME.toLowerCase();
}

/** Cache file path for a given week (1-based) and slot (0-based). */
export function cachedReelPath(week: number, slot: number): string {
  return `/reels/week${week}_slot${slot}.mp4`;
}
