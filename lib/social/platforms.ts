// Platform metadata, posting-cadence goals, and the best-practices playbook.
// Colors are the first three slots of a colorblind-validated categorical palette,
// so the three platforms stay distinguishable when charted together.

export type Platform = "linkedin" | "instagram" | "facebook";

export const PLATFORMS: Platform[] = ["linkedin", "instagram", "facebook"];

export type PlatformInfo = {
  label: string;
  color: string;
  // Weekly posting goal — the criterion the dashboard measures you against.
  // Edit these to match your own plan.
  weeklyPostGoal: number;
  // Formats this platform supports, used for imports and best-format analysis
  formats: string[];
};

export const PLATFORM_INFO: Record<Platform, PlatformInfo> = {
  linkedin: {
    label: "LinkedIn",
    color: "#2a78d6",
    weeklyPostGoal: 3,
    formats: ["text", "image", "carousel", "document", "video", "link"],
  },
  instagram: {
    label: "Instagram",
    color: "#eb6834",
    weeklyPostGoal: 4,
    formats: ["image", "carousel", "reel", "story"],
  },
  facebook: {
    label: "Facebook",
    color: "#1baf7a",
    weeklyPostGoal: 3,
    formats: ["text", "image", "video", "reel", "link"],
  },
};

export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as string[]).includes(value);
}

// Response-time goal for leads and questions in the inbox (hours)
export const RESPONSE_GOAL_HOURS = 24;

export type Practice = { title: string; detail: string };

// Evergreen playbook. These are principles, not algorithm secrets — your own
// data on the Insights page should overrule any of them.
export const BEST_PRACTICES: Record<Platform | "all", Practice[]> = {
  all: [
    {
      title: "Set a cadence goal you can hit 4 weeks straight",
      detail:
        "Consistency beats volume. Pick a weekly post count you'll reliably hit, track it here, and only raise the criterion after a month at 100%. Same shaping logic you'd use with a client.",
    },
    {
      title: "Batch create, schedule, then engage live",
      detail:
        "Write and schedule a week of posts in one block. Spend the first 30–60 minutes after a post goes live replying to comments — early conversation is the strongest signal every platform's feed uses.",
    },
    {
      title: "Treat replies as reinforcement",
      detail:
        "Fast, specific replies reinforce commenting. Leads and questions should get a reply inside 24 hours; the inbox flags anything past that.",
    },
    {
      title: "One idea, three native versions",
      detail:
        "Repurpose a single concept per platform instead of cross-posting identical content: a LinkedIn text post or document, an Instagram carousel or Reel, a Facebook post with a question.",
    },
    {
      title: "Run one experiment at a time",
      detail:
        "Change a single variable (hook, format, time of day) for 2–3 weeks and compare engagement rate against your baseline. Use the Insights page as your phase-change graph.",
    },
    {
      title: "Every post gets one clear call to action",
      detail:
        "Comment a keyword, save for later, book a call, or reply to a question. Pick one; multiple CTAs dilute response.",
    },
  ],
  linkedin: [
    {
      title: "Hook in the first two lines",
      detail:
        "Only ~2 lines show before \"…see more\". Lead with a specific claim, number, or tension — e.g. a client outcome framed as behavior change, not a fitness platitude.",
    },
    {
      title: "Document (PDF carousel) posts for frameworks",
      detail:
        "Multi-slide documents are a strong format for teaching frameworks — habit loops, reinforcement schedules, a coaching system. They earn saves and dwell time.",
    },
    {
      title: "Keep links out of the post body",
      detail:
        "Posts with external links tend to get less reach. Put the link in the first comment or say \"link in comments\".",
    },
    {
      title: "Comment on 5–10 relevant posts a day",
      detail:
        "Thoughtful comments on peers' and prospects' posts (OBM, HR, wellness leaders) build visibility faster than posting alone.",
    },
    {
      title: "Post when your buyers are working",
      detail:
        "For a B2B or professional audience, weekday mornings are a sensible starting point. Check the best-day and best-hour cards on Insights once you have 20+ posts.",
    },
  ],
  instagram: [
    {
      title: "Reels for reach, carousels for saves",
      detail:
        "Short-form video is the main discovery format. Carousels drive saves and shares from existing followers — use them for how-tos and checklists.",
    },
    {
      title: "Win the first 3 seconds",
      detail:
        "Open Reels with on-screen text that states the payoff. Add captions — many people watch muted.",
    },
    {
      title: "Optimize for saves and shares, not likes",
      detail:
        "Saves and shares (sends) are stronger signals of value than likes. Ask for them directly on reference-style content.",
    },
    {
      title: "Stories keep current followers warm",
      detail:
        "Daily-ish Stories with polls, question boxes, and behind-the-scenes coaching content create low-effort interactions and DM openings.",
    },
    {
      title: "Use keyword-rich captions",
      detail:
        "Instagram search leans on captions and on-screen text. Use plain terms people search (\"habit tracker\", \"exercise consistency\") over hashtag stacks.",
    },
  ],
  facebook: [
    {
      title: "Ask questions that invite stories",
      detail:
        "Facebook rewards comment threads. Prompts like \"What's the one habit that stuck for you?\" outperform broadcast-style posts.",
    },
    {
      title: "Native video and Reels over links",
      detail:
        "Uploaded video and Reels usually reach further than posts linking off-platform.",
    },
    {
      title: "Groups for community, Page for authority",
      detail:
        "If you want accountability-style engagement, a Group (e.g. a challenge or cohort) creates more interaction than a Page alone.",
    },
    {
      title: "Respond to Page messages quickly",
      detail:
        "Facebook shows Page responsiveness publicly. Keep Messenger replies inside a day.",
    },
  ],
};
