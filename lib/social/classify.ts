// Keyword-based triage for inbox messages. Simple, transparent rules — edit the
// word lists to tune what counts as a lead for your business.

export type MessageCategory = "lead" | "question" | "praise" | "spam" | "general";

const LEAD_WORDS = [
  "coach", "coaching", "program", "price", "pricing", "cost", "rate", "rates",
  "sign up", "signup", "join", "enroll", "consult", "book", "call", "hire",
  "work with you", "interested", "how much", "available", "services", "speak",
  "workshop", "training for", "my team", "our team",
];

const SPAM_WORDS = [
  "crypto", "bitcoin", "promote your", "promotion", "followers fast",
  "collab? dm", "send pic", "investment opportunity", "forex", "giveaway winner",
];

const PRAISE_WORDS = [
  "love this", "great post", "so true", "thank you", "thanks", "amazing",
  "awesome", "helpful", "needed this", "well said", "🔥", "🙌", "👏", "❤️",
];

// Whole-word match for plain words (so "book" doesn't match "facebook"),
// substring match for emoji and punctuation
function hasAny(text: string, words: string[]) {
  return words.some((w) =>
    /^[a-z\s]+$/.test(w) ? new RegExp(`\\b${w}\\b`).test(text) : text.includes(w)
  );
}

export function classifyMessage(text: string): MessageCategory {
  const t = text.toLowerCase();
  if (hasAny(t, SPAM_WORDS)) return "spam";
  if (hasAny(t, LEAD_WORDS)) return "lead";
  if (t.includes("?")) return "question";
  if (hasAny(t, PRAISE_WORDS)) return "praise";
  return "general";
}

// Lower number = handle first
export const CATEGORY_PRIORITY: Record<MessageCategory, number> = {
  lead: 0,
  question: 1,
  general: 2,
  praise: 3,
  spam: 4,
};
