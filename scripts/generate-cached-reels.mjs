/**
 * Generate 9 evolving cached reels for the Coca-Cola campaign using Sora.
 * Saves MP4s to public/reels/week{w}_slot{n}.mp4 (w=1..3, n=0..2)
 *
 * Usage: node scripts/generate-cached-reels.mjs
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
  // Week 1 — explore three directions
  { file: "week1_slot0.mp4", prompt: "A Gen Z person slumped at a desk at 2pm looking exhausted, pushing aside an energy drink to grab an ice-cold Coca-Cola bottle. Close-up of the cap popping, condensation beading. They sip and visibly perk up. Warm afternoon light, authentic shot-on-iPhone UGC style. Vertical 9:16, 4 seconds." },
  { file: "week1_slot1.mp4", prompt: "Polished studio commercial: Coca-Cola poured into a glass of ice in slow motion, fizz and bubbles, glossy red-and-white branding, formal narrator energy. Deliberately over-produced corporate look. Vertical 9:16, 4 seconds." },
  { file: "week1_slot2.mp4", prompt: "At a trendy taco truck where everyone holds fancy wellness drinks, one person confidently pulls out a classic glass-bottle Coca-Cola and sips with a satisfied smirk. Golden-hour street-food vibe, authentic handheld UGC style. Vertical 9:16, 4 seconds." },
  // Week 2 — refined from week 1's win: contrarian, anti-wellness, real-person UGC (drop the polished corporate look)
  { file: "week2_slot0.mp4", prompt: "Fast-paced UGC: a person endures bland sparkling water for weeks (quick unhappy cuts), then cracks an ice-cold Coca-Cola at a backyard barbecue and lights up with genuine joy. Summer vibes, punchy editing, authentic creator style. Vertical 9:16, 4 seconds." },
  { file: "week2_slot1.mp4", prompt: "ASMR macro close-up, no music: a Coca-Cola can opens (psssht), pours over ice (fizz crackle), first sip. Dark moody backdrop, the red can gleaming with condensation, slow deliberate pacing, product sound only. Vertical 9:16, 4 seconds." },
  { file: "week2_slot2.mp4", prompt: "Quick montage of someone trying trendy wellness drinks — mushroom coffee, green juice, chlorophyll water — making disappointed faces, then grabbing a freezing-cold Coca-Cola from the fridge and looking genuinely happy. Upbeat fast cuts, Gen Z UGC aesthetic. Vertical 9:16, 4 seconds." },
  // Week 3 — refined further: specific real-world scenarios where Coke beats a premium wellness alternative
  { file: "week3_slot0.mp4", prompt: "A person leaves a gym, walks past a juice bar with $14 prices, stops at a 7-Eleven instead, grabs a $1.99 Coca-Cola, cracks it open on the sidewalk and takes a triumphant sip. Relatable real-world humor, fast pacing, authentic UGC. Vertical 9:16, 4 seconds." },
  { file: "week3_slot1.mp4", prompt: "Date-night restaurant scene: one person has an elaborate garnished artisanal mocktail, the other simply orders a Coca-Cola. A knowing look, the Coke person sips happily and the other eyes it with envy. Warm romantic lighting, authentic style. Vertical 9:16, 4 seconds." },
  { file: "week3_slot2.mp4", prompt: "Office break room with a fancy kombucha tap. Someone quietly pulls a hidden Coca-Cola from the back of the fridge; coworkers notice and line up behind them. Funny relatable office humor, casual smartphone aesthetic. Vertical 9:16, 4 seconds." },
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
  console.log("Generating 9 evolving cached reels for Coca-Cola campaign...\n");
  console.log(`Output: ${REELS_DIR}\n`);

  for (const reel of REELS) {
    await generateReel(reel);
  }

  console.log("\nDone! Check public/reels/ for the MP4 files.");
  console.log("Existing files were skipped. Delete them to regenerate.");
}

main().catch(console.error);
