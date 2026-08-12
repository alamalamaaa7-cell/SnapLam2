// Lightweight profanity filter for global chat (ID + EN common words).
// Not exhaustive — just blocks the most common abuse and masks matches.
const BAD_WORDS = [
  "anjing", "babi", "bangsat", "kontol", "memek", "ngentot", "jancok",
  "tolol", "goblok", "bajingan", "brengsek", "asu", "kampret", "pepek",
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "bastard",
];

const pattern = new RegExp(`\\b(${BAD_WORDS.join("|")})\\b`, "gi");

export function containsProfanity(text: string): boolean {
  return pattern.test(text);
}

export function maskProfanity(text: string): string {
  return text.replace(pattern, (m) => m[0] + "*".repeat(Math.max(1, m.length - 1)));
}

export function sanitizeMessage(text: string): string {
  // Trim, collapse whitespace, cap length, mask profanity.
  const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 500);
  return maskProfanity(cleaned);
}
