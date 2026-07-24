/**
 * Generate 9 demo reels for the Coca-Cola campaign using Sora.
 * Saves MP4s to public/reels/week{N}_reel{M}.mp4
 *
 * Usage: node scripts/generate-demo-reels.mjs
 * Requires OPENAI_API_KEY in .env.local
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REELS_DIR = path.join(__dirname, "..", "public", "reels");

// Read .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const apiKey = envContent.match(/OPENAI_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) {
  console.error("No OPENAI_API_KEY found in .env.local");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

const REELS = [
  // Week 1
  {
    file: "week1_reel1.mp4",
    prompt: "A Gen Z person at their desk at 2pm looking exhausted, reaching past an energy drink to grab an ice-cold Coca-Cola bottle. Close-up of the bottle cap popping open, condensation drops. They take a satisfying sip and smile. Warm afternoon light, casual authentic style, shot on iPhone aesthetic. Vertical 9:16 format, 4 seconds.",
  },
  {
    file: "week1_reel2.mp4",
    prompt: "Cinematic close-up of a Coca-Cola being poured into a glass with ice. The camera follows the fizz and bubbles in slow motion. Professional studio lighting, polished brand commercial look with a narrator feel. Red and white color palette. Vertical 9:16 format, 4 seconds.",
  },
  {
    file: "week1_reel3.mp4",
    prompt: "A person at a trendy taco truck, surrounded by people drinking fancy wellness beverages. They confidently pull out a classic glass-bottle Coca-Cola and take a sip with a satisfied expression. Casual street food vibe, golden hour lighting, authentic UGC style. Vertical 9:16 format, 4 seconds.",
  },
  // Week 2
  {
    file: "week2_reel1.mp4",
    prompt: "Someone at a backyard barbecue, holding a Coca-Cola with a knowing smile. Quick cuts showing them previously suffering through sparkling water. Then the moment they crack open a cold Coke - pure joy. Summer vibes, fast pacing, authentic casual style. Vertical 9:16 format, 4 seconds.",
  },
  {
    file: "week2_reel2.mp4",
    prompt: "ASMR style extreme close-up: the sound of a Coca-Cola can opening (psssht), pouring over ice cubes (fizzing), the first sip. No music, only product sounds. Macro lens, dark moody background, the red can gleaming. Slow deliberate pacing. Vertical 9:16 format, 4 seconds.",
  },
  {
    file: "week2_reel3.mp4",
    prompt: "Quick montage of someone trying trendy wellness drinks - mushroom coffee, green juice, chlorophyll water - making disappointed faces. Final shot: they grab a freezing cold Coca-Cola from the fridge and look genuinely happy. Upbeat energy, fast cuts, Gen Z aesthetic. Vertical 9:16 format, 4 seconds.",
  },
  // Week 3
  {
    file: "week3_reel1.mp4",
    prompt: "Person leaving a gym, walking past a juice bar with $14 prices visible. They stop at a 7-Eleven, grab a $1.99 Coca-Cola from the fridge, crack it open outside, and take a triumphant sip. Real-world casual style, fast pacing, relatable humor. Vertical 9:16 format, 4 seconds.",
  },
  {
    file: "week3_reel2.mp4",
    prompt: "Date night scene at a restaurant. One person has an elaborate artisanal drink with garnishes. The other person has a simple Coca-Cola. They share a knowing look and the Coke person takes a happy sip. Warm romantic lighting, casual authentic style. Vertical 9:16 format, 4 seconds.",
  },
  {
    file: "week3_reel3.mp4",
    prompt: "Office break room with a fancy kombucha tap system. Someone sneaks to the back of the fridge and pulls out a hidden Coca-Cola. Other coworkers notice and line up behind them. Funny, relatable office humor, casual smartphone aesthetic. Vertical 9:16 format, 4 seconds.",
  },
];

fs.mkdirSync(REELS_DIR, { recursive: true });

async function generateReel(reel) {
  const outPath = path.join(REELS_DIR, reel.file);
  if (fs.existsSync(outPath)) {
    console.log(`  ✓ ${reel.file} already exists, skipping`);
    return;
  }

  console.log(`  ⏳ Starting ${reel.file}...`);

  try {
    // Start Sora job
    const video = await client.videos.create({
      prompt: reel.prompt,
      model: "sora-2",
    });
    const jobId = video.id;
    console.log(`    Job ${jobId} created, polling...`);

    // Poll until done (max 5 min)
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const status = await client.videos.retrieve(jobId);
      if (status.status === "completed") {
        // Download the video content
        const res = await client.videos.downloadContent(jobId);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(outPath, buffer);
        console.log(`  ✓ ${reel.file} saved (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
        return;
      }
      if (status.status === "failed") {
        console.error(`  ✗ ${reel.file} failed: ${status.error?.message || "unknown"}`);
        return;
      }
      process.stdout.write(".");
    }
    console.error(`  ✗ ${reel.file} timed out after 5 minutes`);
  } catch (err) {
    console.error(`  ✗ ${reel.file} error:`, err.message);
  }
}

async function main() {
  console.log("Generating 9 demo reels for Coca-Cola campaign...\n");
  console.log(`Output: ${REELS_DIR}\n`);

  for (const reel of REELS) {
    await generateReel(reel);
  }

  console.log("\nDone! Check public/reels/ for the MP4 files.");
  console.log("Existing files were skipped. Delete them to regenerate.");
}

main().catch(console.error);
