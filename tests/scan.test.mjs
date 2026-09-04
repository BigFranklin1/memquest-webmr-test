import assert from "node:assert/strict";
import test from "node:test";
import { DIALOGUE_PROMPTS, SAMUEL_ADAMS, SCAN_EVENT_PRESETS, TIMELINE_EVENTS } from "../src/scanData.js";
import { createTextExcerpt, matchHistoricalEvent, normalizeScannedText } from "../src/scanMatcher.js";
import { initialScanState, isCameraFirstScan, OCR_STATUSES, scanReducer, SCAN_STAGES } from "../src/scanState.js";

test("only acquisition hides workspace chrome; outcomes and camera errors restore it", () => {
  for (const mode of ["idle", "starting", "camera", "webxr"]) assert.equal(isCameraFirstScan("scanning", mode), true);
  for (const mode of ["denied", "unsupported", "error"]) assert.equal(isCameraFirstScan("scanning", mode), false);
  for (const stage of ["idle", "result", "unmatched", "profile", "dialogue", "timeline"]) assert.equal(isCameraFirstScan(stage, "camera"), false);
  let state = scanReducer(initialScanState, { type: "START" });
  assert.equal(isCameraFirstScan(state.stage, "camera"), true);
  state = scanReducer(state, { type: "NO_MATCH" });
  assert.equal(isCameraFirstScan(state.stage, "camera"), false);
  state = scanReducer(state, { type: "RETRY_SCAN" });
  assert.equal(isCameraFirstScan(state.stage, "camera"), true);
});

test("moves through scanning, matched result, profile, dialogue, and timeline states", () => {
  let state = scanReducer(initialScanState, { type: "START" });
  assert.equal(state.stage, SCAN_STAGES.SCANNING);
  assert.equal(state.ocrStatus, OCR_STATUSES.LOADING);

  state = scanReducer(state, {
    type: "MATCH_EVENT",
    eventId: "tea-party",
    confidence: 99,
    ocrConfidence: 91,
    attemptCount: 1,
    recognizedTextExcerpt: "Boston Tea Party 1773",
    matchedPhrases: ["Boston Tea Party", "1773"],
  });
  assert.equal(state.stage, SCAN_STAGES.RESULT);
  assert.equal(state.matchedEventId, "tea-party");
  assert.equal(state.selectedEventId, "tea-party");
  assert.equal(state.recognizedTextExcerpt, "Boston Tea Party 1773");

  state = scanReducer(state, { type: "OPEN_PROFILE" });
  assert.equal(state.stage, SCAN_STAGES.PROFILE);

  state = scanReducer(state, { type: "OPEN_DIALOGUE" });
  assert.equal(state.stage, SCAN_STAGES.DIALOGUE);

  state = scanReducer(state, { type: "OPEN_TIMELINE" });
  assert.equal(state.stage, SCAN_STAGES.TIMELINE);
});

test("reports no match or OCR failure and resets cleanly for retry", () => {
  let state = scanReducer(initialScanState, { type: "START" });
  state = scanReducer(state, {
    type: "NO_MATCH",
    attemptCount: 3,
    recognizedTextExcerpt: "A completely different period of history",
  });
  assert.equal(state.stage, SCAN_STAGES.UNMATCHED);
  assert.equal(state.ocrStatus, OCR_STATUSES.UNMATCHED);
  assert.equal(state.attemptCount, 3);

  state = scanReducer(state, { type: "RETRY_SCAN" });
  assert.equal(state.stage, SCAN_STAGES.SCANNING);
  assert.equal(state.attemptCount, 0);
  assert.equal(state.recognizedTextExcerpt, "");

  state = scanReducer(state, { type: "OCR_ERROR" });
  assert.equal(state.stage, SCAN_STAGES.UNMATCHED);
  assert.equal(state.ocrStatus, OCR_STATUSES.ERROR);
});

test("matches all four configured American Revolution events", () => {
  const examples = new Map([
    ["stamp-act", "The Stamp Act of 1765 placed a stamp duty on printed paper in the colonies."],
    ["massacre", "The Boston Massacre took place on March 5, 1770, when British soldiers confronted townspeople."],
    ["tea-party", "At the Boston Tea Party in 1773, tea chests from the East India Company entered the harbor."],
    ["congress", "The First Continental Congress brought colonial delegates to Philadelphia in 1774."],
  ]);

  assert.equal(SCAN_EVENT_PRESETS.length, 4);
  for (const [eventId, text] of examples) {
    assert.equal(matchHistoricalEvent(text)?.eventId, eventId);
  }
});

test("normalizes punctuation and tolerates a light OCR title error", () => {
  assert.equal(normalizeScannedText("BOSTON—TEA PARTY, 1773!"), "boston tea party 1773");
  assert.equal(matchHistoricalEvent("The Bostom Tea Party, 1773: tea chests at Griffin's Wharf")?.eventId, "tea-party");
});

test("rejects year-only, ambiguous, and unrelated text", () => {
  assert.equal(matchHistoricalEvent("1765 1770 1773 1774"), null);
  assert.equal(matchHistoricalEvent("Boston Massacre Boston Tea Party"), null);
  assert.equal(matchHistoricalEvent("A medieval manuscript about farming and weather"), null);
});

test("creates a compact OCR excerpt without retaining an unbounded transcript", () => {
  const excerpt = createTextExcerpt(`  ${"archive ".repeat(40)} `, 80);
  assert.ok(excerpt.length <= 80);
  assert.ok(excerpt.endsWith("…"));
});

test("preserves selected prompt and timeline event while navigating", () => {
  let state = scanReducer(initialScanState, { type: "SELECT_PROMPT", promptId: "motive" });
  state = scanReducer(state, { type: "SELECT_EVENT", eventId: "massacre" });
  state = scanReducer(state, { type: "OPEN_DIALOGUE" });

  assert.equal(state.selectedPromptId, "motive");
  assert.equal(state.selectedEventId, "massacre");
  assert.equal(state.stage, SCAN_STAGES.DIALOGUE);
});

test("ships one complete preset historical subject", () => {
  assert.equal(SAMUEL_ADAMS.name, "Samuel Adams");
  assert.ok(SAMUEL_ADAMS.introduction.length > 80);
  assert.equal(DIALOGUE_PROMPTS.length, 3);
  assert.equal(TIMELINE_EVENTS.length, 4);
  assert.equal(SCAN_EVENT_PRESETS.length, 4);
  assert.ok(DIALOGUE_PROMPTS.every((prompt) => prompt.answer.length > 60));
  assert.ok(TIMELINE_EVENTS.every((event) => event.detail.length > 80));
  assert.ok(TIMELINE_EVENTS.every((event) => event.cardIntro.length > 70));
  assert.ok(TIMELINE_EVENTS.every((event) => event.imageAlt.length > 40));
});
