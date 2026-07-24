/**
 * Backward-compatible entry point for the current demo reel generator.
 *
 * The app consumes public/reels/week{1..3}_slot{0..2}.mp4. Keep the generation
 * logic in one place so this command cannot drift to an unused filename scheme.
 */

await import("./generate-cached-reels.mjs");
