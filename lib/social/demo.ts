// Realistic sample data so the dashboard is usable before any account is connected.
// Everything here is tagged source: "demo" and can be cleared from Settings.
import { prisma } from "@/lib/prisma";
import { classifyMessage } from "./classify";
import { PLATFORMS, type Platform } from "./platforms";

const DAY = 24 * 60 * 60 * 1000;

// Small deterministic PRNG so demo data looks the same every time
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const HOOKS = [
  "Motivation is a myth. Contingencies aren't.",
  "Your clients don't need more willpower — they need a better environment.",
  "3 reinforcement mistakes that kill exercise adherence",
  "Why your step-count goal keeps failing (and the shaping fix)",
  "The 2-minute rule for building a workout habit",
  "What behavior analysts know about New Year's resolutions",
  "Stop tracking outcomes. Track behaviors.",
  "A client went from 0 to 4 workouts/week. Here's the system.",
  "Habit stacking, explained with real data",
  "Sedentary behavior is the metric nobody coaches",
  "How I design a self-monitoring system for clients",
  "Your dashboard is a reinforcement schedule. Design it like one.",
  "The difference between a goal and a criterion",
  "Behavior change for leaders: start with one pinpoint",
];

const FORMAT_MIX: Record<Platform, { format: string; weight: number; lift: number }[]> = {
  linkedin: [
    { format: "text", weight: 0.45, lift: 1.0 },
    { format: "document", weight: 0.15, lift: 1.9 },
    { format: "image", weight: 0.25, lift: 1.1 },
    { format: "link", weight: 0.15, lift: 0.5 },
  ],
  instagram: [
    { format: "image", weight: 0.4, lift: 0.8 },
    { format: "carousel", weight: 0.2, lift: 1.6 },
    { format: "reel", weight: 0.4, lift: 1.3 },
  ],
  facebook: [
    { format: "text", weight: 0.3, lift: 1.1 },
    { format: "image", weight: 0.4, lift: 1.0 },
    { format: "video", weight: 0.15, lift: 1.4 },
    { format: "link", weight: 0.15, lift: 0.6 },
  ],
};

const BASE: Record<Platform, { impressions: number; er: number; perWeek: number; followers: number; growth: number }> = {
  linkedin: { impressions: 1400, er: 0.045, perWeek: 2.6, followers: 2850, growth: 9 },
  instagram: { impressions: 900, er: 0.055, perWeek: 3.2, followers: 1620, growth: 4 },
  facebook: { impressions: 350, er: 0.03, perWeek: 1.6, followers: 940, growth: 0.3 },
};

const MESSAGES: { platform: Platform; kind: string; author: string; text: string; hoursAgo: number; status?: string }[] = [
  { platform: "linkedin", kind: "dm", author: "Dana R. (HR Director)", text: "Hi Nick — do you run workshops on habit change for corporate teams? Our team of 40 could use this. What does pricing look like?", hoursAgo: 30 },
  { platform: "instagram", kind: "dm", author: "@fit.with.mel", text: "How much is your 1:1 coaching program? Interested in starting next month", hoursAgo: 52 },
  { platform: "instagram", kind: "comment", author: "@coach_tj", text: "Is the habit tracker template available anywhere?", hoursAgo: 8 },
  { platform: "linkedin", kind: "comment", author: "Marcus L., BCBA", text: "Great post — how do you handle extinction bursts when clients miss a week?", hoursAgo: 20 },
  { platform: "facebook", kind: "comment", author: "Jen Morales", text: "Love this, so true!", hoursAgo: 14 },
  { platform: "instagram", kind: "comment", author: "@growth_hacks_247", text: "Promote your page to 10k followers fast! DM us", hoursAgo: 5 },
  { platform: "linkedin", kind: "mention", author: "Priya S.", text: "Shoutout to Nick at BehaviorFit — his talk on OBM and wellness programs was excellent.", hoursAgo: 40 },
  { platform: "facebook", kind: "dm", author: "Tom Becker", text: "Do you work with people remotely? My doctor told me I need to get moving and I keep quitting.", hoursAgo: 75 },
  { platform: "instagram", kind: "comment", author: "@sarahlifts", text: "Needed this today 🙌", hoursAgo: 3 },
  { platform: "linkedin", kind: "comment", author: "Alex Kim", text: "Would love to see the data behind this.", hoursAgo: 60, status: "replied" },
  { platform: "facebook", kind: "comment", author: "Rita Owens", text: "What app do you use for tracking steps?", hoursAgo: 4 },
  { platform: "instagram", kind: "dm", author: "@bcba.brian", text: "Huge fan of your content. Thanks for sharing all this!", hoursAgo: 90, status: "done" },
];

function pick<T extends { weight: number }>(items: T[], r: number) {
  let acc = 0;
  for (const it of items) {
    acc += it.weight;
    if (r <= acc) return it;
  }
  return items[items.length - 1];
}

export async function seedDemoData(now = new Date()) {
  await clearDemoData();
  const rand = rng(42);

  for (const platform of PLATFORMS) {
    const base = BASE[platform];
    let n = 0;
    for (let day = 84; day >= 0; day--) {
      // Rough Poisson-ish posting: probability per day from weekly rate.
      // Facebook trails off in recent weeks to give the dashboard something to flag.
      const rate = platform === "facebook" && day < 10 ? 0 : base.perWeek / 7;
      if (rand() > rate) continue;
      const fmt = pick(FORMAT_MIX[platform], rand());
      const postedAt = new Date(now.getTime() - day * DAY);
      postedAt.setHours(7 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0, 0);
      if (postedAt > now) continue;
      // Engagement trends slightly upward on LinkedIn, dips on Instagram lately
      const trend = platform === "linkedin" ? 1 + (84 - day) / 250 : platform === "instagram" && day < 28 ? 0.8 : 1;
      const morning = postedAt.getHours() < 12 ? 1.2 : 0.9;
      const impressions = Math.round(base.impressions * (0.5 + rand()) * (fmt.format === "reel" ? 1.8 : 1));
      const eng = impressions * base.er * fmt.lift * trend * morning * (0.6 + rand() * 0.8);
      await prisma.socialPost.create({
        data: {
          platform,
          externalId: `demo-${platform}-${n++}`,
          text: HOOKS[Math.floor(rand() * HOOKS.length)],
          format: fmt.format,
          postedAt,
          impressions,
          reach: Math.round(impressions * 0.75),
          likes: Math.round(eng * 0.6),
          comments: Math.round(eng * 0.12),
          shares: Math.round(eng * 0.08),
          saves: platform === "instagram" ? Math.round(eng * 0.15) : 0,
          clicks: platform === "instagram" ? 0 : Math.round(eng * 0.15),
          source: "demo",
        },
      });
    }

    let followers = base.followers;
    for (let day = 84; day >= 0; day -= 3) {
      followers += Math.round(base.growth * 3 * (0.4 + rand() * 1.2)) - (platform === "facebook" ? Math.round(rand() * 2) : 0);
      const date = new Date(now.getTime() - day * DAY);
      date.setHours(0, 0, 0, 0);
      await prisma.followerSnapshot.create({
        data: { platform, date, followers, source: "demo" },
      });
    }
  }

  for (const [i, m] of MESSAGES.entries()) {
    await prisma.socialMessage.create({
      data: {
        platform: m.platform,
        kind: m.kind,
        externalId: `demo-msg-${i}`,
        author: m.author,
        text: m.text,
        receivedAt: new Date(now.getTime() - m.hoursAgo * 60 * 60 * 1000),
        status: m.status ?? "new",
        category: classifyMessage(m.text),
        source: "demo",
      },
    });
  }
}

export async function clearDemoData() {
  await prisma.socialPost.deleteMany({ where: { source: "demo" } });
  await prisma.socialMessage.deleteMany({ where: { source: "demo" } });
  await prisma.followerSnapshot.deleteMany({ where: { source: "demo" } });
}
