import test from "node:test";
import assert from "node:assert/strict";
import { CHALLENGES, LEARNING_CATALOG, REVOLUTION_UNIT_ID as unitId, getChallenge } from "../src/learningData.js";
import { challengeStatus, getRecommendation, getUnitSummary, harborSteps, initialLearningState, learningReducer, loadLearningState, LEARNING_STORAGE_KEY, restoreLearningState, skillResults, unitLibrary } from "../src/learningState.js";
import { MEMORY_QUESTIONS, REVOLUTION_EVIDENCE, REVOLUTION_PEOPLE } from "../src/revolutionData.js";
import { TIMELINE_EVENTS } from "../src/scanData.js";
import { HARBOR_CLUES } from "../src/libraryData.js";

const at = "2026-09-03T10:00:00.000Z";
const send = (state, action) => learningReducer(state, { ...action, at });
const unit = (state, action) => send(state, { type: "UNIT_ACTION", unitId, action });
const finishQuestions = (state, id, correct = true) => {
  state = send(state, { type: "START_CHALLENGE", id, retry: true });
  for (const q of getChallenge(id).questions) state = send(state, { type: "ANSWER_CHALLENGE", id, questionId: q.id, answerId: correct ? q.answerId : q.options.find(o => o.id !== q.answerId).id });
  return send(state, { type: "SUBMIT_CHALLENGE", id });
};
const finishMemory = (state, correct = true) => {
  state = unit(state, { type: "START_MEMORY" });
  for (const q of MEMORY_QUESTIONS) state = unit(state, { type: "ANSWER_MEMORY", questionId: q.id, answerId: correct ? q.answerId : q.options.find(o => o.id !== q.answerId).id });
  return unit(state, { type: "COMPLETE_MEMORY" });
};

test("global progress starts at zero and excludes unreleased eras", () => {
  assert.equal(Object.keys(initialLearningState.units).length, 0);
  assert.equal(getUnitSummary(initialLearningState, unitId).done, 0);
  assert.equal(getUnitSummary(initialLearningState, unitId).score, null);
  assert.equal(getUnitSummary(initialLearningState, "ancient-china"), null);
  assert.ok(skillResults(initialLearningState).every(s => s.count === 0 && s.percent === null));
  assert.equal(LEARNING_CATALOG.filter(u => u.status === "available").length, 1);
});
test("an invalid legacy save cannot discard a valid new save, and storage denial is recoverable", () => {
  const saved = unit(initialLearningState, { type: "SELECT_PERSON", personId: "john-hancock" });
  const state = loadLearningState({ getItem: key => key === LEARNING_STORAGE_KEY ? JSON.stringify(saved) : "invalid json" });
  assert.equal(getUnitSummary(state, unitId).done, 1);
  assert.equal(getUnitSummary(loadLearningState({ getItem: () => { throw new Error("Storage blocked"); } }), unitId).done, 0);
});
test("legacy saves require explicit import, do not become skill results, and remain unchanged", () => {
  const legacy = { discoveredClueIds: ["lantern"], viewedPersonIds: ["samuel-adams"], memoryCheck: { bestScore: 100 } };
  let state = restoreLearningState(null, legacy);
  assert.equal(getUnitSummary(state, unitId).done, 0);
  assert.ok(state.legacyRecord);
  state = send(state, { type: "IMPORT_LEGACY" });
  assert.equal(getUnitSummary(state, unitId).done, 2);
  assert.equal(getUnitSummary(state, unitId).score, null);
  assert.equal(state.legacyImported, true);
  assert.equal(state.legacyRecord, null);
  assert.ok(skillResults(state).every(s => s.count === 0));
  assert.equal(legacy.memoryCheck.bestScore, 100);
});
test("content navigation keeps event, person, and evidence context without discovering a clue", () => {
  let state = send(initialLearningState, { type: "OPEN_CONTENT", unitId, target: { section: "people", personId: "john-hancock" } });
  assert.equal(unitLibrary(state).selectedPersonId, "john-hancock");
  assert.equal(unitLibrary(state).activeSection, "people");
  state = send(state, { type: "OPEN_CONTENT", unitId, target: { section: "timeline", eventId: "congress" } });
  assert.equal(unitLibrary(state).selectedTimelineEventId, "congress");
  state = send(state, { type: "OPEN_CONTENT", unitId, target: { section: "evidence", evidenceId: "gazette-report" } });
  assert.equal(unitLibrary(state).selectedEvidenceId, "gazette-report");
  state = send(state, { type: "OPEN_CONTENT", unitId, target: { section: "harbor" } });
  assert.equal(unitLibrary(state).stage, "harbor");
  assert.equal(unitLibrary(state).discoveredClueIds.length, 0);
});
test("viewing the same record twice is idempotent and never raises skill results", () => {
  let state = unit(initialLearningState, { type: "SELECT_PERSON", personId: "samuel-adams" });
  const second = unit(state, { type: "SELECT_PERSON", personId: "samuel-adams" });
  assert.equal(state, second);
  assert.equal(state.activity.length, 1);
  assert.equal(getUnitSummary(state, unitId).done, 1);
  assert.ok(skillResults(state).every(s => s.count === 0));
});
test("harbor challenge requires actual discoveries and each why-it-matters expansion", () => {
  let state = send(initialLearningState, { type: "START_CHALLENGE", id: "harbor-investigation" });
  for (const c of HARBOR_CLUES) state = unit(state, { type: "DISCOVER_CLUE", clueId: c.id });
  assert.equal(send(state, { type: "SUBMIT_CHALLENGE", id: "harbor-investigation" }), state);
  for (const c of HARBOR_CLUES) state = unit(state, { type: "EXPLAIN_CLUE", clueId: c.id });
  assert.ok(harborSteps(state).every(s => s.found && s.understood));
  state = send(state, { type: "SUBMIT_CHALLENGE", id: "harbor-investigation" });
  assert.equal(challengeStatus(state, "harbor-investigation"), "complete");
  assert.equal(state.attempts[0].results.length, 0);
});
test("chronology arrows reorder without duplication and score the actual submitted order", () => {
  let state = send(initialLearningState, { type: "START_CHALLENGE", id: "order-events" });
  state = send(state, { type: "MOVE_EVENT", id: "order-events", eventId: "stamp-act", direction: -1 });
  state = send(state, { type: "MOVE_EVENT", id: "order-events", eventId: "massacre", direction: -1 });
  state = send(state, { type: "MOVE_EVENT", id: "order-events", eventId: "massacre", direction: -1 });
  assert.deepEqual(state.challenges["order-events"].order, TIMELINE_EVENTS.map(e => e.id));
  state = send(state, { type: "SUBMIT_CHALLENGE", id: "order-events" });
  assert.equal(skillResults(state)[0].percent, null);
  assert.equal(skillResults(state)[0].correct, 1);
  assert.equal(state.attempts[0].results.length, 1, "one sequence is one question, not four independent samples");
});
test("answers lock on first selection; incomplete quizzes cannot submit", () => {
  let state = send(initialLearningState, { type: "START_CHALLENGE", id: "connect-people" });
  const q = getChallenge("connect-people").questions[0];
  state = send(state, { type: "ANSWER_CHALLENGE", id: "connect-people", questionId: q.id, answerId: "hutchinson" });
  assert.equal(send(state, { type: "ANSWER_CHALLENGE", id: "connect-people", questionId: q.id, answerId: q.answerId }), state);
  assert.equal(send(state, { type: "SUBMIT_CHALLENGE", id: "connect-people" }), state);
});
test("completing twice is idempotent; retries preserve attempts without duplicate milestones", () => {
  let state = finishQuestions(initialLearningState, "connect-people", false);
  assert.equal(send(state, { type: "SUBMIT_CHALLENGE", id: "connect-people" }), state);
  state = finishQuestions(state, "connect-people", true);
  assert.equal(state.attempts.length, 2);
  assert.equal(Object.values(state.challenges).filter(c => c.everCompleted).length, 1);
  const people = skillResults(state).find(s => s.id === "perspective");
  assert.equal(people.count, 3);
  assert.equal(people.percent, 100);
  assert.equal(people.missed.length, 0);
});
test("recommendations prefer unfinished challenges then weak skills", () => {
  let state = finishQuestions(initialLearningState, "connect-people", false);
  assert.equal(getRecommendation(state).challenge.id, "connect-people");
  state = send(state, { type: "START_CHALLENGE", id: "order-events" });
  assert.equal(getRecommendation(state).challenge.id, "order-events");
  assert.equal(getRecommendation(state).continuing, true);
});
test("Memory Check creates one assessment record, independent of exploration", () => {
  let state = finishMemory(initialLearningState);
  assert.equal(state.attempts.length, 1);
  assert.equal(getUnitSummary(state, unitId).score, 100);
  assert.equal(getUnitSummary(state, unitId).done, 0);
  assert.equal(unit(state, { type: "COMPLETE_MEMORY" }), state);
  state = finishMemory(state, false);
  assert.equal(state.attempts.length, 2);
  assert.equal(getUnitSummary(state, unitId).score, 0);
  assert.equal(unitLibrary(state).memoryCheck.bestScore, 100);
});
test("unit completion requires all content and a recent Memory Check of at least 80 percent", () => {
  let state = initialLearningState;
  for (const e of TIMELINE_EVENTS) state = unit(state, { type: "SELECT_TIMELINE_EVENT", eventId: e.id });
  for (const p of REVOLUTION_PEOPLE) state = unit(state, { type: "SELECT_PERSON", personId: p.id });
  for (const c of HARBOR_CLUES) state = unit(state, { type: "DISCOVER_CLUE", clueId: c.id });
  for (const e of REVOLUTION_EVIDENCE) state = unit(state, { type: "SELECT_EVIDENCE", evidenceId: e.id });
  assert.equal(getUnitSummary(state, unitId).exploration, 100);
  assert.equal(getUnitSummary(state, unitId).complete, false);
  state = finishMemory(state);
  assert.equal(getUnitSummary(state, unitId).complete, true);
  state = finishMemory(state, false);
  assert.equal(getUnitSummary(state, unitId).score, 0);
  assert.equal(getUnitSummary(state, unitId).complete, true, "earned completion is retained after a lower practice score");
});
test("storage round-trip keeps draft answers and selection, but never reopens immersive VR", () => {
  let state = send(initialLearningState, { type: "START_CHALLENGE", id: "connect-people" });
  state = send(state, { type: "ANSWER_CHALLENGE", id: "connect-people", questionId: "ally", answerId: "hancock" });
  state = send(state, { type: "OPEN_CONTENT", unitId, target: { section: "harbor" } });
  const restored = restoreLearningState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.selectedChallengeId, "connect-people");
  assert.equal(restored.challenges["connect-people"].answers.ally, "hancock");
  assert.equal(unitLibrary(restored).stage, "home");
});
test("bounded practice history preserves earned completions and the latest Memory Check score", () => {
  let state = finishMemory(initialLearningState);
  state = finishQuestions(state, "connect-people");
  for (let i = 0; i < 102; i++) state = finishQuestions(state, "read-evidence");
  state = restoreLearningState(JSON.parse(JSON.stringify(state)));
  assert.equal(state.attempts.length, 100);
  assert.equal(getUnitSummary(state, unitId).score, 100);
  assert.equal(state.challenges["connect-people"].lastResult.correct, 3);
  assert.equal(state.challenges["connect-people"].everCompleted, true);
  assert.ok(state.activity.length <= 80);
});
test("invalid or repeated ids cannot inflate restored progress or modify future units", () => {
  const state = restoreLearningState({ version: 1, units: { [unitId]: { library: { viewedPersonIds: ["samuel-adams", "samuel-adams", "fake"] } } } });
  assert.equal(getUnitSummary(state, unitId).done, 1);
  assert.equal(send(state, { type: "OPEN_CONTENT", unitId: "ancient-china" }), state);
  assert.equal(unit(state, { type: "DISCOVER_CLUE", clueId: "fake" }), state);
  assert.equal(unit(state, { type: "EXPLAIN_CLUE", clueId: "lantern" }), state);
});
test("locked evidence cannot count as reviewed through a deep link", () => {
  let state = send(initialLearningState, { type: "OPEN_CONTENT", unitId, target: { section: "evidence", evidenceId: "tea-chest" } });
  assert.equal(unitLibrary(state).selectedEvidenceId, "tea-chest");
  assert.equal(unitLibrary(state).reviewedEvidenceIds.length, 0);
  assert.equal(state.activity.length, 0);
  state = unit(state, { type: "DISCOVER_CLUE", clueId: "tea-chest" });
  state = unit(state, { type: "SELECT_EVIDENCE", evidenceId: "tea-chest" });
  assert.ok(unitLibrary(state).reviewedEvidenceIds.includes("tea-chest"));
});
test("published challenge targets all resolve to real unit content", () => {
  for (const c of CHALLENGES) {
    assert.ok(LEARNING_CATALOG.find(u => u.id === c.unitId && u.status === "available"));
    for (const q of c.questions ?? []) {
      assert.ok(q.options.some(o => o.id === q.answerId));
      if (q.target.personId) assert.ok(REVOLUTION_PEOPLE.some(p => p.id === q.target.personId));
      if (q.target.evidenceId) assert.ok(REVOLUTION_EVIDENCE.some(e => e.id === q.target.evidenceId));
      if (q.target.eventId) assert.ok(TIMELINE_EVENTS.some(e => e.id === q.target.eventId));
    }
  }
});
