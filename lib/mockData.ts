import type { Product, Hypothesis, Variant, Metric, ExperimentRun } from "./types";
import type { Id, TableNames } from "../convex/_generated/dataModel";

// Deterministic fake IDs for mock data — these will be replaced by real Convex IDs
// when Nori's backend is ready. Cast is safe for mocks only.
function fakeId<T extends TableNames>(table: T, n: number): Id<T> {
  return `mock_${table}_${n}` as unknown as Id<T>;
}

export const MOCK_BATCH_ID = "batch_001";
export { SAMPLE_PRODUCT_NAME } from "./sampleProduct";

export const MOCK_PRODUCT: Product = {
  _id: fakeId("products", 1),
  _creationTime: Date.now(),
  name: "Coca-Cola",
  landingUrl: "https://coca-cola.com",
  valueProp: "The world's most refreshing soft drink. Share a Coke and feel the moment.",
  targetCustomer: "Gen Z and Millennials (18-34) who consume social media daily and buy beverages at convenience stores, restaurants, and grocery",
  pricing: "$1.99 20oz bottle, $6.99 12-pack, $2.49 fountain drink",
  painPoint: "Young consumers are switching to energy drinks, sparkling water, and wellness beverages. Coca-Cola needs to stay culturally relevant and top-of-mind on social feeds where attention spans are 3 seconds.",
  dailyBudget: 5000,
  totalBudget: 50000,
  maxCPC: 1.20,
  targetCAC: 5,
  goal: "Maximize brand engagement and drive convenience store purchases among 18-34 year olds",
};

export const MOCK_HYPOTHESES: Hypothesis[] = [
  {
    _id: fakeId("hypotheses", 1),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    text: "Nostalgia hooks outperform trend-chasing hooks for Coca-Cola",
    reasoning:
      "Coca-Cola's strongest brand asset is emotional memory — summer BBQs, road trips, sharing with friends. A hook that opens with a nostalgic moment should drive higher engagement and purchase intent than one that tries to ride the latest TikTok trend.",
  },
  {
    _id: fakeId("hypotheses", 2),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    text: "UGC-style creator content converts better than polished brand ads",
    reasoning:
      "Gen Z trusts creators over brands. A casual, phone-shot video of someone grabbing a Coke at a gas station should feel more authentic and drive higher CVR than a studio-produced brand spot, even if the brand ad gets more initial views.",
  },
  {
    _id: fakeId("hypotheses", 3),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    text: "Sound-first ASMR hooks (cap twist, pour, fizz) stop the scroll better than music-driven intros",
    reasoning:
      "Coca-Cola's product has iconic sounds — the bottle cap pop, the fizz, the pour over ice. ASMR content performs well on TikTok/Reels. Leading with the sound of opening a Coke should hook viewers in the first second before they scroll past.",
  },
];

export const MOCK_VARIANTS: Variant[] = [
  {
    _id: fakeId("ad_variants", 1),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    hookType: "pain-point",
    scriptType: "problem-solution",
    voice: "customer",
    music: "minimal-ambient",
    pacing: "fast",
    cta: "Grab a Coke",
    audience: "Gen Z 18-24",
    script: "It's 2pm. You're crashing. The energy drink isn't hitting anymore. You know what actually works? A cold Coca-Cola. No jitters. No crash. Just that feeling. Stop overthinking your afternoon pick-me-up.",
    hypothesis: MOCK_HYPOTHESES[0].text,
    budget: 12500,
    killRule: "Kill if CAC > $8 after day 2",
    scaleRule: "Scale 2x if CAC < $3.50 and CVR > 3%",
  },
  {
    _id: fakeId("ad_variants", 2),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    hookType: "statistic",
    scriptType: "demo-walkthrough",
    voice: "narrator",
    music: "upbeat-electronic",
    pacing: "medium",
    cta: "Find Coke near you",
    audience: "Millennials 25-34",
    script: "1.9 billion Coca-Colas are enjoyed every single day. Here's why: open, pour, listen to that fizz, take the first sip. There's a reason this has been the world's favorite drink for 138 years. Some things just don't need to change.",
    hypothesis: MOCK_HYPOTHESES[0].text,
    budget: 6250,
    killRule: "Kill if CAC > $8 after day 2",
    scaleRule: "Scale 2x if CAC < $3.50 and CVR > 3%",
  },
  {
    _id: fakeId("ad_variants", 3),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    hookType: "question",
    scriptType: "problem-solution",
    voice: "customer",
    music: "none",
    pacing: "fast",
    cta: "Share a Coke",
    audience: "Gen Z 18-24",
    script: "When's the last time a drink actually made you smile? Not a protein shake. Not a wellness tonic. Just a cold Coke with someone you like. We've been doing this for over a century. Maybe there's a reason.",
    hypothesis: MOCK_HYPOTHESES[1].text,
    budget: 6250,
    killRule: "Kill if CAC > $7 after day 2",
    scaleRule: "Scale 2x if CAC < $3 and CVR > 3.5%",
  },
  {
    _id: fakeId("ad_variants", 4),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    hookType: "contrarian",
    scriptType: "before-after",
    voice: "customer",
    music: "minimal-ambient",
    pacing: "medium",
    cta: "Grab a Coke",
    audience: "Millennials 25-34",
    script: "Everyone's drinking adaptogenic mushroom water now. Cool. I'm at a taco truck with a glass-bottle Coke and I'm having a better time than all of them. Before: overcomplicated everything. After: just drink what tastes good.",
    hypothesis: MOCK_HYPOTHESES[1].text,
    budget: 6250,
    killRule: "Kill if CAC > $6.50 after day 2",
    scaleRule: "Scale 2x if CAC < $3 and CVR > 4%",
  },
  {
    _id: fakeId("ad_variants", 5),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    hookType: "pain-point",
    scriptType: "testimonial",
    voice: "customer",
    music: "upbeat-electronic",
    pacing: "medium",
    cta: "Find Coke near you",
    audience: "Gen Z 18-24",
    script: "I tried every wellness drink on TikTok. Mushroom coffee, chlorophyll water, sea moss gel. None of them made me feel the way a freezing cold Coke does on a hot day. Sometimes the classics are the move.",
    hypothesis: MOCK_HYPOTHESES[1].text,
    budget: 6250,
    killRule: "Kill if CAC > $8 after day 2",
    scaleRule: "Scale 2x if CAC < $3.50 and CVR > 3%",
  },
  {
    _id: fakeId("ad_variants", 6),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    hookType: "statistic",
    scriptType: "problem-solution",
    voice: "narrator",
    music: "minimal-ambient",
    pacing: "fast",
    cta: "Grab a Coke",
    audience: "Millennials 25-34",
    script: "The sound of a Coca-Cola opening has been recognized by 94% of people worldwide. No other product on earth has that. The pop. The fizz. The pour. You already know exactly how it tastes. That's not marketing. That's memory.",
    hypothesis: MOCK_HYPOTHESES[2].text,
    budget: 3750,
    killRule: "Kill if CAC > $9 after day 2",
    scaleRule: "Scale 2x if CAC < $4 and CVR > 2.5%",
  },
  {
    _id: fakeId("ad_variants", 7),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    hookType: "question",
    scriptType: "demo-walkthrough",
    voice: "customer",
    music: "none",
    pacing: "slow",
    cta: "Share a Coke",
    audience: "Gen Z 18-24",
    script: "*psssht* *fizzzzzz* *pour over ice* *first sip* ... You heard all of that in your head, didn't you? That's Coca-Cola. You don't need us to tell you. You already know.",
    hypothesis: MOCK_HYPOTHESES[2].text,
    budget: 5000,
    killRule: "Kill if CAC > $7 after day 2",
    scaleRule: "Scale 2x if CAC < $3 and CVR > 3.5%",
  },
  {
    _id: fakeId("ad_variants", 8),
    _creationTime: Date.now(),
    productId: MOCK_PRODUCT._id,
    batchId: MOCK_BATCH_ID,
    hookType: "contrarian",
    scriptType: "before-after",
    voice: "customer",
    music: "upbeat-electronic",
    pacing: "fast",
    cta: "Grab a Coke",
    audience: "Gen Z 18-24",
    script: "My nutritionist said cut out soda. So I did. For 3 months I drank sparkling water that tasted like someone whispered the word 'lime' near it. Then I had a Coke at a barbecue and remembered what happiness tastes like. Balance is real.",
    hypothesis: MOCK_HYPOTHESES[2].text,
    budget: 3750,
    killRule: "Kill if CAC > $8 after day 2",
    scaleRule: "Scale 2x if CAC < $3.50 and CVR > 3%",
  },
];

// Seeded metrics across 3 simulated days for all 8 variants.
// Variant 1 (pain-point + founder + fast) is the winner — lowest CAC.
// Variant 2 (statistic + narrator) gets killed on day 2 — high CAC.
function buildMetrics(): Metric[] {
  const metrics: Metric[] = [];
  let counter = 1;

  const dayData: Record<number, { impressions: number; ctr: number; cvr: number; cpc: number }[]> = {
    // Day 1: exploration — all variants get similar spend
    1: [
      { impressions: 1200, ctr: 0.042, cvr: 0.028, cpc: 2.80 },  // v1 — good
      { impressions: 1100, ctr: 0.031, cvr: 0.012, cpc: 3.90 },  // v2 — weak
      { impressions: 1050, ctr: 0.038, cvr: 0.022, cpc: 3.10 },  // v3
      { impressions: 980, ctr: 0.044, cvr: 0.025, cpc: 2.95 },   // v4
      { impressions: 1150, ctr: 0.035, cvr: 0.019, cpc: 3.40 },  // v5
      { impressions: 900, ctr: 0.029, cvr: 0.014, cpc: 4.10 },   // v6 — weak
      { impressions: 1000, ctr: 0.036, cvr: 0.020, cpc: 3.20 },  // v7
      { impressions: 950, ctr: 0.040, cvr: 0.023, cpc: 3.00 },   // v8
    ],
    // Day 2: bandit starts shifting — winners get more budget
    2: [
      { impressions: 1800, ctr: 0.045, cvr: 0.031, cpc: 2.60 },  // v1 — scaling
      { impressions: 600, ctr: 0.028, cvr: 0.010, cpc: 4.20 },   // v2 — killed
      { impressions: 1200, ctr: 0.040, cvr: 0.024, cpc: 2.90 },  // v3
      { impressions: 1400, ctr: 0.046, cvr: 0.027, cpc: 2.75 },  // v4 — rising
      { impressions: 1100, ctr: 0.033, cvr: 0.018, cpc: 3.50 },  // v5
      { impressions: 500, ctr: 0.026, cvr: 0.011, cpc: 4.40 },   // v6 — killed
      { impressions: 900, ctr: 0.034, cvr: 0.019, cpc: 3.30 },   // v7
      { impressions: 1000, ctr: 0.041, cvr: 0.024, cpc: 2.85 },  // v8
    ],
    // Day 3: exploitation — clear winners and losers
    3: [
      { impressions: 2800, ctr: 0.048, cvr: 0.034, cpc: 2.40 },  // v1 — winner
      { impressions: 0, ctr: 0, cvr: 0, cpc: 0 },                // v2 — dead
      { impressions: 1400, ctr: 0.041, cvr: 0.026, cpc: 2.80 },  // v3
      { impressions: 2200, ctr: 0.049, cvr: 0.030, cpc: 2.50 },  // v4 — strong
      { impressions: 800, ctr: 0.030, cvr: 0.016, cpc: 3.60 },   // v5 — fading
      { impressions: 0, ctr: 0, cvr: 0, cpc: 0 },                // v6 — dead
      { impressions: 700, ctr: 0.032, cvr: 0.017, cpc: 3.40 },   // v7 — fading
      { impressions: 1100, ctr: 0.043, cvr: 0.026, cpc: 2.70 },  // v8
    ],
  };

  for (let day = 1; day <= 3; day++) {
    for (let vi = 0; vi < 8; vi++) {
      const d = dayData[day][vi];
      const clicks = Math.round(d.impressions * d.ctr);
      const conversions = Math.round(d.impressions * d.cvr);
      const spend = clicks * d.cpc;
      const cac = conversions > 0 ? spend / conversions : 0;

      metrics.push({
        _id: fakeId("campaign_metrics", counter++),
        _creationTime: Date.now(),
        variantId: MOCK_VARIANTS[vi]._id,
        batchId: MOCK_BATCH_ID,
        day,
        impressions: d.impressions,
        clicks,
        conversions,
        spend: Math.round(spend * 100) / 100,
        cpc: d.cpc,
        ctr: d.ctr,
        cac: Math.round(cac * 100) / 100,
        cvr: d.cvr,
      });
    }
  }

  return metrics;
}

export const MOCK_METRICS: Metric[] = buildMetrics();

export const MOCK_EXPERIMENT: ExperimentRun = {
  _id: fakeId("experiment_runs", 1),
  _creationTime: Date.now(),
  productId: MOCK_PRODUCT._id,
  batchId: MOCK_BATCH_ID,
  status: "complete",
  startedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
};

export const MOCK_AGENT_REASONING = {
  strategist: `Analyzing Coca-Cola's positioning for Gen Z and Millennial social ads...

The core tension: Coca-Cola is the most recognized brand on Earth, but young consumers are drifting toward "wellness" beverages — energy drinks, kombucha, sparkling water. The brand doesn't have an awareness problem. It has a relevance problem. The question isn't "do they know Coca-Cola?" — it's "does Coca-Cola feel like their drink?"

Three hypotheses to test:

1. NOSTALGIA vs. TREND-CHASING
Coca-Cola's strongest asset is emotional memory. Testing whether hooks that tap into universal moments (summer, road trips, first sips) outperform hooks that try to ride current TikTok aesthetics. The risk with trends: they expire in weeks. Nostalgia is evergreen.

2. UGC CREATOR STYLE vs. POLISHED BRAND PRODUCTION
Gen Z has ad blindness for anything that looks produced. A phone-shot video of someone grabbing a Coke at a gas station might outperform a studio spot with the same message. Testing customer/creator voice against narrator voice.

3. SOUND-FIRST ASMR HOOKS
Coca-Cola has one of the most iconic product sounds in the world — the cap pop, the fizz, the pour. ASMR content performs exceptionally on short-form video. Leading with the sound (no music, no voice) might stop the scroll faster than any visual hook.

Allocating budget: $12,500 to the strongest hypothesis combo (pain-point + customer + fast), $6,250 each to dimension-testing variants, $3,750-5,000 to exploratory sound-first variants.`,
  analyst: `Campaign complete. 3 days, 8 variants, $50,000 budget.

WINNER: Variant 4 (contrarian hook + customer voice + before-after)
- Day 3 CAC: $2.85 — well under the $4.50 target
- CTR climbed from 4.4% to 4.9% across days — the "mushroom water" angle resonated
- CVR hit 3.0% by day 3 — highest in the batch

KEY FINDING: The contrarian + customer combination is 2.1x more efficient than statistic + narrator (Variant 2, killed on day 2 with $7+ CAC). Gen Z responds to irreverent, anti-wellness-culture messaging delivered by real people, not brands. This confirms Hypothesis 2.

SURPRISING: Variant 7 (ASMR sound-first, slow pacing, no music) was the #2 performer with $3.10 CAC. The "*psssht* *fizzzzzz*" opening stopped the scroll — 4.3% CTR with the highest watch-through rate in the batch. Sound-first is a real creative dimension for Coca-Cola.

KILLED: Variants 2 and 6 (both narrator voice). The narrator voice consistently read as "corporate ad" to the target demo. Polished production is actively harmful for this audience.

RECOMMENDATION FOR BATCH 2:
- Double down on contrarian hooks with customer/creator voice
- Expand ASMR sound-first to fast pacing (untested combination)
- Test "summer nostalgia" visuals with customer voice (merging H1 + H2)
- Drop narrator voice entirely — it's the anti-pattern for this demo`,
};
