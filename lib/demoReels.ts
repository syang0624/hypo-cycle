/**
 * Demo reel mapping for the sample Coca-Cola campaign.
 *
 * When videos exist at these paths in public/reels/, the demo uses them.
 * When they don't exist, the VariantCard falls back to ReelPreview (styled poster).
 *
 * To populate: either drop 9:16 MP4s manually, or run the one-time
 * generation script: `npx ts-node scripts/generate-demo-reels.ts`
 *
 * Each "week" has its own set of reels — week 2 and 3 are NEW creative
 * generated from revised hypotheses, not survivors from week 1.
 */

export type DemoWeek = {
  week: number;
  label: string;
  hypothesis: string;
  reels: DemoReel[];
  metrics: WeekMetrics;
  insight: string;
};

export type DemoReel = {
  id: string;
  hookType: string;
  voice: string;
  script: string;
  pacing: string;
  music: string;
  videoPath: string | null; // null = use ReelPreview fallback
  cpc: number;
  cac: number;
  ctr: number;
  cvr: number;
  impressions: number;
  spend: number;
  status: "running" | "winning" | "killed";
};

export type WeekMetrics = {
  avgCpc: number;
  avgCac: number;
  totalSpend: number;
  totalConversions: number;
  reelsActive: number;
  reelsTotal: number;
};

/**
 * Check if a local video file exists at runtime.
 * Returns the path if it exists, null otherwise.
 */
function reelPath(week: number, index: number): string | null {
  // In the browser we can't check fs — just return the path and let
  // the video element's onerror handle missing files
  return `/reels/week${week}_reel${index}.mp4`;
}

export const DEMO_CAMPAIGN: DemoWeek[] = [
  {
    week: 1,
    label: "Week 1 — Initial Test",
    hypothesis: "Testing 3 creative directions: nostalgia hooks, UGC creator style, and ASMR sound-first. Need to find which resonates with Gen Z before investing more.",
    reels: [
      {
        id: "w1r1",
        hookType: "pain-point",
        voice: "customer",
        script: "It's 2pm. You're crashing. The energy drink isn't hitting anymore. You know what actually works? A cold Coca-Cola. No jitters. No crash. Just that feeling.",
        pacing: "fast",
        music: "minimal-ambient",
        videoPath: reelPath(1, 1),
        cpc: 0.95, cac: 3.80, ctr: 0.042, cvr: 0.028,
        impressions: 45000, spend: 1795,
        status: "running",
      },
      {
        id: "w1r2",
        hookType: "statistic",
        voice: "narrator",
        script: "1.9 billion Coca-Colas are enjoyed every single day. Here's why: open, pour, listen to that fizz, take the first sip.",
        pacing: "medium",
        music: "upbeat-electronic",
        videoPath: reelPath(1, 2),
        cpc: 1.35, cac: 7.20, ctr: 0.031, cvr: 0.012,
        impressions: 38000, spend: 1590,
        status: "killed",
      },
      {
        id: "w1r3",
        hookType: "contrarian",
        voice: "customer",
        script: "Everyone's drinking adaptogenic mushroom water now. Cool. I'm at a taco truck with a glass-bottle Coke and I'm having a better time than all of them.",
        pacing: "medium",
        music: "minimal-ambient",
        videoPath: reelPath(1, 3),
        cpc: 0.82, cac: 2.95, ctr: 0.046, cvr: 0.031,
        impressions: 52000, spend: 1960,
        status: "winning",
      },
    ],
    metrics: {
      avgCpc: 1.04, avgCac: 4.65, totalSpend: 5345,
      totalConversions: 1149, reelsActive: 3, reelsTotal: 3,
    },
    insight: "The narrator/statistic approach bombed — $7.20 CAC, way over target. Gen Z scrolled past it. But the contrarian 'mushroom water' angle crushed it at $2.95 CAC. The irreverent, anti-wellness tone works. Double down on contrarian + customer voice for Week 2.",
  },
  {
    week: 2,
    label: "Week 2 — New Creative from Learnings",
    hypothesis: "Week 1 proved contrarian/customer voice wins. Now testing: can we push the irreverence further? Also testing if the ASMR sound-first hook (untested last week) can beat contrarian when paired with the same customer voice.",
    reels: [
      {
        id: "w2r1",
        hookType: "contrarian",
        voice: "customer",
        script: "My nutritionist said cut out soda. So I did. For 3 months I drank sparkling water that tasted like someone whispered the word 'lime' near it. Then I had a Coke at a barbecue and remembered what happiness tastes like.",
        pacing: "fast",
        music: "none",
        videoPath: reelPath(2, 1),
        cpc: 0.71, cac: 2.40, ctr: 0.052, cvr: 0.035,
        impressions: 68000, spend: 2510,
        status: "winning",
      },
      {
        id: "w2r2",
        hookType: "question",
        voice: "customer",
        script: "*psssht* *fizzzzzz* *pour over ice* *first sip* ... You heard all of that in your head, didn't you? That's Coca-Cola. You don't need us to tell you.",
        pacing: "slow",
        music: "none",
        videoPath: reelPath(2, 2),
        cpc: 0.78, cac: 3.10, ctr: 0.048, cvr: 0.029,
        impressions: 61000, spend: 2280,
        status: "running",
      },
      {
        id: "w2r3",
        hookType: "contrarian",
        voice: "customer",
        script: "I tried every wellness drink on TikTok. Mushroom coffee, chlorophyll water, sea moss gel. None of them made me feel the way a freezing cold Coke does on a hot day.",
        pacing: "fast",
        music: "upbeat-electronic",
        videoPath: reelPath(2, 3),
        cpc: 0.85, cac: 3.45, ctr: 0.044, cvr: 0.026,
        impressions: 55000, spend: 2050,
        status: "running",
      },
    ],
    metrics: {
      avgCpc: 0.78, avgCac: 2.98, totalSpend: 6840,
      totalConversions: 2295, reelsActive: 3, reelsTotal: 3,
    },
    insight: "CPC dropped 25% week-over-week. The 'nutritionist said cut out soda' angle is the best performer yet — $2.40 CAC, almost half of Week 1's average. The humor + relatability combo is working. The ASMR approach is decent but not beating contrarian. For Week 3: push the 'wellness culture is exhausting' angle even harder, test different scenarios (gym, office, date night).",
  },
  {
    week: 3,
    label: "Week 3 — Optimized Creative",
    hypothesis: "We know the formula: contrarian hook + customer voice + fast pacing + anti-wellness humor. Now testing 3 scenario variations to find the absolute lowest CPC before scaling to full budget.",
    reels: [
      {
        id: "w3r1",
        hookType: "contrarian",
        voice: "customer",
        script: "Just left the gym. My trainer wants me drinking a $14 cold-pressed beet juice recovery drink. I stopped at 7-Eleven instead. $1.99 Coke. Same feeling. Actually better. Way better.",
        pacing: "fast",
        music: "none",
        videoPath: reelPath(3, 1),
        cpc: 0.58, cac: 1.85, ctr: 0.058, cvr: 0.042,
        impressions: 82000, spend: 2790,
        status: "winning",
      },
      {
        id: "w3r2",
        hookType: "contrarian",
        voice: "customer",
        script: "Date night. She ordered a 'activated charcoal lemonade.' I ordered a Coke. She asked to try mine. We're married now. The Coke was better than the charcoal thing, obviously.",
        pacing: "fast",
        music: "minimal-ambient",
        videoPath: reelPath(3, 2),
        cpc: 0.62, cac: 2.10, ctr: 0.055, cvr: 0.038,
        impressions: 78000, spend: 2660,
        status: "running",
      },
      {
        id: "w3r3",
        hookType: "contrarian",
        voice: "customer",
        script: "Office break room has a $400 kombucha on-tap system now. I keep a pack of Cokes in the back of the fridge. My line is always longer.",
        pacing: "fast",
        music: "none",
        videoPath: reelPath(3, 3),
        cpc: 0.65, cac: 2.25, ctr: 0.053, cvr: 0.036,
        impressions: 75000, spend: 2540,
        status: "running",
      },
    ],
    metrics: {
      avgCpc: 0.62, avgCac: 2.07, totalSpend: 7990,
      totalConversions: 3860, reelsActive: 3, reelsTotal: 3,
    },
    insight: "Found it. The gym/7-Eleven reel is the winner: $0.58 CPC, $1.85 CAC — 59% below our $4.50 target. The formula: contrarian hook + customer voice + specific real-world scenario where Coke beats a premium wellness alternative. This is the creative template to scale. Three weeks, 9 reels tested, CPC went from $1.04 → $0.62. A marketing intern would've taken months and never found this angle.",
  },
];

export const DEMO_OVERALL = {
  totalWeeks: 3,
  totalReelsTested: 9,
  startingCpc: 1.04,
  finalCpc: 0.58,
  cpcReduction: "44%",
  startingCac: 4.65,
  finalCac: 1.85,
  cacReduction: "60%",
  totalSpend: 20175,
  totalConversions: 7304,
  winningFormula: "Contrarian hook + Customer voice + Fast pacing + Anti-wellness humor",
  winningReel: "The gym/7-Eleven reel",
};
