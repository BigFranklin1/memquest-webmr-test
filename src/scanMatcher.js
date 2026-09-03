import { SCAN_EVENT_PRESETS } from "./scanData.js";

const MATCH_THRESHOLD = 0.65;
const AMBIGUITY_MARGIN = 0.15;
const FUZZY_PHRASE_THRESHOLD = 0.82;

export function normalizeScannedText(value = "") {
  return value
    .normalize("NFKD")
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        substitution,
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function similarity(left, right) {
  const longest = Math.max(left.length, right.length);
  if (!longest) return 1;
  return 1 - (editDistance(left, right) / longest);
}

export function containsPhrase(scannedText, phrase) {
  const normalizedText = normalizeScannedText(scannedText);
  const normalizedPhrase = normalizeScannedText(phrase);
  if (!normalizedText || !normalizedPhrase) return false;
  if (normalizedText.includes(normalizedPhrase)) return true;

  const textTokens = normalizedText.split(" ");
  const phraseTokens = normalizedPhrase.split(" ");
  if (textTokens.length < phraseTokens.length) {
    return similarity(normalizedText, normalizedPhrase) >= FUZZY_PHRASE_THRESHOLD;
  }

  const windowSizes = new Set([
    Math.max(1, phraseTokens.length - 1),
    phraseTokens.length,
    phraseTokens.length + 1,
  ]);
  for (const windowSize of windowSizes) {
    for (let index = 0; index <= textTokens.length - windowSize; index += 1) {
      const windowText = textTokens.slice(index, index + windowSize).join(" ");
      if (similarity(windowText, normalizedPhrase) >= FUZZY_PHRASE_THRESHOLD) return true;
    }
  }
  return false;
}

export function scoreEventPreset(scannedText, preset) {
  const normalizedText = normalizeScannedText(scannedText);
  if (!normalizedText) return { preset, score: 0, hasSignature: false, matches: [] };

  const titleMatched = containsPhrase(normalizedText, preset.title);
  const signatureMatches = preset.signaturePhrases.filter((phrase) => containsPhrase(normalizedText, phrase));
  const keywordMatches = preset.supportingKeywords.filter((keyword) => containsPhrase(normalizedText, keyword));
  const yearMatched = normalizedText.split(" ").includes(preset.year);
  const hasSignature = titleMatched || signatureMatches.length > 0;
  const score = (titleMatched ? 0.75 : 0)
    + (signatureMatches.length > 0 ? 0.5 : 0)
    + (yearMatched ? 0.15 : 0)
    + Math.min(0.3, keywordMatches.length * 0.1);

  return {
    preset,
    score: Number(score.toFixed(2)),
    hasSignature,
    matches: [
      ...(titleMatched ? [preset.title] : []),
      ...signatureMatches,
      ...keywordMatches,
      ...(yearMatched ? [preset.year] : []),
    ],
  };
}

export function matchHistoricalEvent(scannedText, presets = SCAN_EVENT_PRESETS) {
  const ranked = presets
    .map((preset) => scoreEventPreset(scannedText, preset))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const runnerUp = ranked[1];

  if (!best?.hasSignature || best.score < MATCH_THRESHOLD) return null;
  if (runnerUp?.score >= MATCH_THRESHOLD && best.score - runnerUp.score < AMBIGUITY_MARGIN) return null;

  return {
    eventId: best.preset.eventId,
    confidence: Math.min(99, Math.round(best.score * 100)),
    matchedPhrases: best.matches,
  };
}

export function createTextExcerpt(value = "", maxLength = 180) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}
