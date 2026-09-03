import assert from "node:assert/strict";
import test from "node:test";
import { HARBOR_CLUES, LIBRARY_ERAS } from "../src/libraryData.js";
import { TIMELINE_EVENTS } from "../src/scanData.js";
import { MEMORY_QUESTIONS, REVOLUTION_CAUSES, REVOLUTION_EVIDENCE, REVOLUTION_PEOPLE } from "../src/revolutionData.js";
import { PEOPLE_PROFILES } from "../src/peopleProfiles.js";
import {
  calculateUnitProgress,
  initialLibraryState,
  libraryReducer,
  LIBRARY_STAGES,
  restoreLibraryState,
} from "../src/libraryState.js";

test("opens the American Revolution overview and enters the harbor", () => {
  let state = libraryReducer(initialLibraryState, { type: "OPEN_ERA", eraId: "american-revolution" });
  assert.equal(state.stage, LIBRARY_STAGES.OVERVIEW);
  state = libraryReducer(state, { type: "ENTER_HARBOR" });
  assert.equal(state.stage, LIBRARY_STAGES.HARBOR);
  state = libraryReducer(state, { type: "EXIT_HARBOR" });
  assert.equal(state.stage, LIBRARY_STAGES.OVERVIEW);
});

test("keeps unreleased library eras non-interactive", () => {
  const state = libraryReducer(initialLibraryState, { type: "OPEN_ERA", eraId: "ancient-china" });
  assert.equal(state.stage, LIBRARY_STAGES.HOME);
  assert.equal(LIBRARY_ERAS.filter((era) => era.status === "active").length, 1);
});

test("tracks each harbor clue only once", () => {
  let state = libraryReducer(initialLibraryState, { type: "DISCOVER_CLUE", clueId: "tea-chest" });
  state = libraryReducer(state, { type: "DISCOVER_CLUE", clueId: "tea-chest" });
  assert.equal(state.discoveredClueIds.filter((id) => id === "tea-chest").length, 1);
  assert.equal(state.selectedClueId, "tea-chest");
  assert.equal(HARBOR_CLUES.length, 4);
  assert.deepEqual(HARBOR_CLUES.map((clue) => clue.id), ["lantern", "tea-chest", "ship", "hatchet"]);
  assert.ok(HARBOR_CLUES.every((clue) => clue.body.length > 90));
  assert.ok(HARBOR_CLUES.every((clue) => clue.period && clue.location));
  assert.ok(HARBOR_CLUES.every((clue) => clue.whyItMatters.length > 120));
  assert.ok(HARBOR_CLUES.every((clue) => clue.relatedHistory.length > 100));
});

test("opens every American Revolution learning section and tracks unique study activity", () => {
  let state = libraryReducer(initialLibraryState, { type: "OPEN_SECTION", sectionId: "timeline" });
  assert.equal(state.activeSection, "timeline");
  state = libraryReducer(state, { type: "SELECT_TIMELINE_EVENT", eventId: "massacre" });
  state = libraryReducer(state, { type: "SELECT_TIMELINE_EVENT", eventId: "massacre" });
  assert.equal(state.viewedTimelineEventIds.filter((id) => id === "massacre").length, 1);

  state = libraryReducer(state, { type: "OPEN_SECTION", sectionId: "people" });
  state = libraryReducer(state, { type: "SELECT_PERSON", personId: "thomas-hutchinson" });
  assert.equal(state.activeSection, "people");
  assert.ok(state.viewedPersonIds.includes("thomas-hutchinson"));

  state = libraryReducer(state, { type: "OPEN_SECTION", sectionId: "evidence" });
  state = libraryReducer(state, { type: "SELECT_EVIDENCE", evidenceId: "tea-act" });
  assert.equal(state.activeSection, "evidence");
  assert.ok(state.reviewedEvidenceIds.includes("tea-act"));
  assert.ok(calculateUnitProgress(state) > calculateUnitProgress(initialLibraryState));
});

test("scores the Memory Check and preserves the best result across retries", () => {
  let state = libraryReducer(initialLibraryState, { type: "START_MEMORY" });
  for (const question of MEMORY_QUESTIONS) {
    state = libraryReducer(state, { type: "ANSWER_MEMORY", questionId: question.id, answerId: question.answerId });
    state = libraryReducer(state, { type: "NEXT_MEMORY" });
  }
  state = libraryReducer(state, { type: "COMPLETE_MEMORY" });
  assert.equal(state.memoryCheck.status, "complete");
  assert.equal(state.memoryCheck.score, 100);
  assert.equal(state.memoryCheck.bestScore, 100);

  state = libraryReducer(state, { type: "RESET_MEMORY" });
  for (const question of MEMORY_QUESTIONS) {
    state = libraryReducer(state, { type: "ANSWER_MEMORY", questionId: question.id, answerId: question.options.find(o => o.id !== question.answerId).id });
  }
  state = libraryReducer(state, { type: "COMPLETE_MEMORY" });
  assert.equal(state.memoryCheck.status, "complete");
  assert.equal(state.memoryCheck.score, 0);
  assert.equal(state.memoryCheck.bestScore, 100);
});

test("keeps the Revolution learning graph internally consistent", () => {
  const eventIds = new Set(TIMELINE_EVENTS.map((event) => event.id));
  const peopleIds = new Set(REVOLUTION_PEOPLE.map((person) => person.id));
  const evidenceIds = new Set(REVOLUTION_EVIDENCE.map((evidence) => evidence.id));
  assert.ok(REVOLUTION_CAUSES.every((cause) => eventIds.has(cause.fromEventId) && eventIds.has(cause.toEventId)));
  assert.ok(REVOLUTION_PEOPLE.every((person) => person.eventIds.every((id) => eventIds.has(id))));
  assert.ok(REVOLUTION_PEOPLE.every((person) => person.evidenceIds.every((id) => evidenceIds.has(id))));
  assert.ok(REVOLUTION_EVIDENCE.every((evidence) => evidence.personIds.every((id) => peopleIds.has(id))));
});

test("provides a complete People dossier and valid relationship targets for every perspective", () => {
  const peopleIds = new Set(REVOLUTION_PEOPLE.map((person) => person.id));
  for (const person of REVOLUTION_PEOPLE) {
    const profile = PEOPLE_PROFILES[person.id];
    assert.ok(profile.introduction.length > 150);
    assert.equal(profile.roles.length, 2);
    assert.equal(profile.connections.length, 5);
    assert.equal(new Set(profile.connections.map((entry) => entry.id)).size, profile.connections.length);
    for (const connection of profile.connections) {
      assert.ok(["ally", "opponent", "context"].includes(connection.kind));
      assert.ok(connection.detail.length > 75);
      if (connection.personId) {
        assert.ok(peopleIds.has(connection.personId));
        assert.notEqual(connection.personId, person.id);
      }
    }
  }
});

test("restores learning progress without reopening an immersive scene", () => {
  const restored = restoreLibraryState({
    ...initialLibraryState,
    stage: LIBRARY_STAGES.HARBOR,
    activeSection: "evidence",
    reviewedEvidenceIds: ["lantern", "tea-act"],
  });
  assert.equal(restored.stage, LIBRARY_STAGES.HOME);
  assert.equal(restored.activeSection, "evidence");
  assert.deepEqual(restored.reviewedEvidenceIds, ["lantern", "tea-act"]);
});
