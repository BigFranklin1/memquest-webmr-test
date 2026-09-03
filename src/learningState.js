import { initialLibraryState, libraryReducer, restoreLibraryState } from "./libraryState.js";
import { MEMORY_QUESTIONS } from "./revolutionData.js";
import { TIMELINE_EVENTS } from "./scanData.js";
import { CHALLENGES, LEARNING_CATALOG, LEARNING_SKILLS, REVOLUTION_UNIT_ID, getChallenge, getUnit } from "./learningData.js";

export const LEARNING_STORAGE_KEY = "memquest.learning.v1";
export const initialLearningState = {
  version: 1, units: {}, challenges: {}, attempts: [], activity: [], selectedChallengeId: null,
  legacyRecord: null, legacyImported: false,
};
export function loadLearningState(storage) {
  const read = key => { try { return JSON.parse(storage.getItem(key)); } catch { return null; } };
  return restoreLearningState(read(LEARNING_STORAGE_KEY), read("memquest.american-revolution.v2"));
}
export const unitLibrary = (state, unitId = REVOLUTION_UNIT_ID) => state.units[unitId]?.library ?? initialLibraryState;
const safeTime = value => typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : "1970-01-01T00:00:00.000Z";
const validUnit = id => getUnit(id)?.status === "available";
const recordActivity = (state, entry) => ({ ...state, activity: [entry, ...state.activity].slice(0, 80) });

export function restoreLearningState(saved, legacy) {
  if (!saved || saved.version !== 1) {
    return { ...initialLearningState, legacyRecord: legacy && typeof legacy === "object" ? restoreLibraryState(legacy) : null };
  }
  const units = {};
  for (const unit of LEARNING_CATALOG.filter(u => u.status === "available")) {
    if (saved.units?.[unit.id]) units[unit.id] = {
      library: restoreLibraryState(saved.units[unit.id].library),
      startedAt: safeTime(saved.units[unit.id].startedAt),
      completedAt: saved.units[unit.id].completedAt ? safeTime(saved.units[unit.id].completedAt) : null,
      latestMemoryScore: Number.isFinite(saved.units[unit.id].latestMemoryScore) ? Math.max(0, Math.min(100, saved.units[unit.id].latestMemoryScore)) : null,
    };
  }
  const challenges = {};
  for (const c of CHALLENGES) {
    const draft = saved.challenges?.[c.id];
    if (!draft || !["in-progress", "complete"].includes(draft.status)) continue;
    const answers = Object.fromEntries((c.questions ?? []).filter(q => q.options.some(o => o.id === draft.answers?.[q.id])).map(q => [q.id, draft.answers[q.id]]));
    const order = Array.isArray(draft.order) && draft.order.length === 4 && new Set(draft.order).size === 4 && draft.order.every(id => TIMELINE_EVENTS.some(e => e.id === id)) ? draft.order : c.initialOrder;
    const expectedCount = c.kind === "order" ? 1 : (c.questions?.length ?? 0);
    const lastResult = Number.isFinite(draft.lastResult?.correct) && draft.lastResult?.count === expectedCount ? { count: expectedCount, correct: Math.max(0, Math.min(expectedCount, draft.lastResult.correct)) } : null;
    challenges[c.id] = { status: draft.status, answers, order, startedAt: safeTime(draft.startedAt), completedAt: draft.completedAt ? safeTime(draft.completedAt) : null, everCompleted: Boolean(draft.everCompleted || draft.status === "complete"), lastResult };
  }
  const attempts = Array.isArray(saved.attempts) ? saved.attempts.filter(a => validUnit(a?.unitId) && (a.source === "memory" || getChallenge(a.source)) && Array.isArray(a.results)).slice(-100).map(a => ({ ...a, at: safeTime(a.at), results: a.results.filter(r => r && typeof r.questionId === "string" && LEARNING_SKILLS.some(s => s.id === r.skillId) && typeof r.correct === "boolean") })) : [];
  const activity = Array.isArray(saved.activity) ? saved.activity.filter(a => validUnit(a?.unitId) && typeof a.label === "string" && a.target && typeof a.target === "object").slice(0, 80).map(a => ({ ...a, at: safeTime(a.at) })) : [];
  return { ...initialLearningState, units, challenges, attempts, activity, selectedChallengeId: getChallenge(saved.selectedChallengeId) ? saved.selectedChallengeId : null, legacyRecord: saved.legacyRecord ? restoreLibraryState(saved.legacyRecord) : null, legacyImported: Boolean(saved.legacyImported) };
}

export function getUnitSummary(state, unitId) {
  const unit = getUnit(unitId);
  if (!unit || unit.status !== "available") return null;
  const lib = unitLibrary(state, unitId);
  const counts = [
    { label: "Timeline", section: "timeline", done: lib.viewedTimelineEventIds.length, total: unit.eventIds.length },
    { label: "People", section: "people", done: lib.viewedPersonIds.length, total: unit.personIds.length },
    { label: "Evidence", section: "evidence", done: lib.reviewedEvidenceIds.length, total: unit.evidenceIds.length },
    { label: "Harbor clues", section: "explore", done: lib.discoveredClueIds.length, total: unit.clueIds.length },
  ];
  const done = counts.reduce((sum, c) => sum + c.done, 0);
  const total = counts.reduce((sum, c) => sum + c.total, 0);
  const memory = state.attempts.filter(a => a.unitId === unitId && a.source === "memory").at(-1);
  const score = state.units[unitId]?.latestMemoryScore ?? (memory?.results.length ? Math.round(memory.results.filter(r => r.correct).length / memory.results.length * 100) : null);
  return { unit, counts, done, total, exploration: Math.round(done / total * 100), score, started: Boolean(state.units[unitId]), complete: Boolean(state.units[unitId]?.completedAt) || (done === total && score !== null && score >= 80) };
}

export function skillResults(state) {
  // A repeated question replaces its earlier result; retries do not inflate the sample.
  const latest = new Map();
  for (const attempt of state.attempts) for (const result of attempt.results) latest.set(`${attempt.unitId}:${attempt.source}:${result.questionId}`, { ...result, unitId: attempt.unitId, source: attempt.source });
  return LEARNING_SKILLS.map(skill => {
    const results = [...latest.values()].filter(r => r.skillId === skill.id);
    const correct = results.filter(r => r.correct).length;
    return { ...skill, count: results.length, correct, missed: results.filter(r => !r.correct), percent: results.length >= 3 ? Math.round(correct / results.length * 100) : null };
  });
}

export function challengeStatus(state, id) { return state.challenges[id]?.status ?? "not-started"; }
export function harborSteps(state) {
  const lib = unitLibrary(state);
  return getUnit(REVOLUTION_UNIT_ID).clueIds.map(id => ({ id, found: lib.discoveredClueIds.includes(id), understood: lib.explainedClueIds.includes(id) }));
}
export function getRecommendation(state) {
  const continuing = CHALLENGES.find(c => challengeStatus(state, c.id) === "in-progress");
  if (continuing) return { challenge: continuing, reason: "Pick up exactly where you left off.", continuing: true };
  const weak = skillResults(state).find(s => s.missed.length);
  if (weak) return { challenge: getChallenge(weak.challengeId), reason: `Recommended from your recent ${weak.title.toLowerCase()} answers.` };
  const next = CHALLENGES.find(c => challengeStatus(state, c.id) !== "complete") ?? CHALLENGES[1];
  return { challenge: next, reason: state.attempts.length ? "Build on the history you have explored." : "Start with a hands-on investigation. No prior knowledge needed." };
}

function applyUnitAction(state, unitId, action, at) {
  if (!validUnit(unitId)) return state;
  const before = unitLibrary(state, unitId);
  const after = libraryReducer(before, action);
  if (after === before) return state;
  let next = { ...state, units: { ...state.units, [unitId]: { ...state.units[unitId], startedAt: state.units[unitId]?.startedAt ?? at, library: after } } };
  const tracked = {
    SELECT_TIMELINE_EVENT: ["viewedTimelineEventIds", "eventId", "Explored an event", "timeline"],
    SELECT_PERSON: ["viewedPersonIds", "personId", "Explored a perspective", "people"],
    SELECT_EVIDENCE: ["reviewedEvidenceIds", "evidenceId", "Reviewed a source", "evidence"],
    DISCOVER_CLUE: ["discoveredClueIds", "clueId", "Discovered a harbor clue", "explore"],
    EXPLAIN_CLUE: ["explainedClueIds", "clueId", "Read why a clue matters", "explore"],
  }[action.type];
  if (tracked && after[tracked[0]].includes(action[tracked[1]]) && !before[tracked[0]].includes(action[tracked[1]])) next = recordActivity(next, { unitId, label: tracked[2], at, target: { section: tracked[3], [tracked[1]]: action[tracked[1]] } });
  if (action.type === "COMPLETE_MEMORY" && before.memoryCheck.status === "in-progress" && after.memoryCheck.status === "complete") {
    const results = MEMORY_QUESTIONS.map(q => ({ questionId: q.id, skillId: q.id === "synthesis" ? "evidence" : q.id, correct: after.memoryCheck.answers[q.id] === q.answerId, target: { section: q.reviewSection } }));
    next = { ...next, attempts: [...next.attempts, { unitId, source: "memory", at, results }].slice(-100) };
    next.units = { ...next.units, [unitId]: { ...next.units[unitId], latestMemoryScore: after.memoryCheck.score } };
    next = recordActivity(next, { unitId, label: `Memory Check · ${after.memoryCheck.score}%`, at, target: { section: "memory" } });
  }
  if (getUnitSummary(next, unitId).complete && !next.units[unitId].completedAt) {
    next = { ...next, units: { ...next.units, [unitId]: { ...next.units[unitId], completedAt: at } } };
    next = recordActivity(next, { unitId, label: "Completed the historical unit", at, target: { section: "explore" } });
  }
  return next;
}

export function learningReducer(state, action) {
  const at = safeTime(action.at);
  switch (action.type) {
    case "UNIT_ACTION": return applyUnitAction(state, action.unitId, action.action, at);
    case "OPEN_CONTENT": {
      if (!validUnit(action.unitId)) return state;
      let next = applyUnitAction(state, action.unitId, { type: "OPEN_ERA", eraId: action.unitId }, at);
      const target = action.target ?? {};
      if (target.section === "harbor" || target.clueId) {
        // Entering a scene is not discovery; the user still has to select the object.
        return applyUnitAction(next, action.unitId, { type: "ENTER_HARBOR" }, at);
      }
      for (const [key, type] of [["eventId", "SELECT_TIMELINE_EVENT"], ["personId", "SELECT_PERSON"], ["evidenceId", "SELECT_EVIDENCE"]]) {
        if (target[key]) next = applyUnitAction(next, action.unitId, { type, [key]: target[key] }, at);
      }
      return applyUnitAction(next, action.unitId, { type: "OPEN_SECTION", sectionId: target.section ?? "explore" }, at);
    }
    case "SELECT_CHALLENGE": return { ...state, selectedChallengeId: getChallenge(action.id) ? action.id : null };
    case "START_CHALLENGE": {
      const c = getChallenge(action.id);
      if (!c || (challengeStatus(state, c.id) === "in-progress" && !action.retry)) return state;
      return { ...state, units: { ...state.units, [c.unitId]: state.units[c.unitId] ?? { library: initialLibraryState, startedAt: at } }, selectedChallengeId: c.id, challenges: { ...state.challenges, [c.id]: { status: "in-progress", startedAt: at, answers: {}, order: c.initialOrder, everCompleted: Boolean(state.challenges[c.id]?.everCompleted) } } };
    }
    case "ANSWER_CHALLENGE": {
      const c = getChallenge(action.id), draft = state.challenges[action.id];
      const q = c?.questions?.find(q => q.id === action.questionId);
      if (draft?.status !== "in-progress" || draft.answers[q?.id] || !q?.options.some(o => o.id === action.answerId)) return state;
      return { ...state, challenges: { ...state.challenges, [c.id]: { ...draft, answers: { ...draft.answers, [q.id]: action.answerId } } } };
    }
    case "MOVE_EVENT": {
      const draft = state.challenges[action.id];
      if (draft?.status !== "in-progress" || !draft.order || ![-1, 1].includes(action.direction)) return state;
      const index = draft.order.indexOf(action.eventId), target = index + action.direction;
      if (index < 0 || target < 0 || target >= draft.order.length) return state;
      const order = [...draft.order];
      [order[index], order[target]] = [order[target], order[index]];
      return { ...state, challenges: { ...state.challenges, [action.id]: { ...draft, order } } };
    }
    case "SUBMIT_CHALLENGE": {
      const c = getChallenge(action.id), draft = state.challenges[action.id];
      if (!c || draft?.status !== "in-progress") return state;
      if (c.kind === "exploration" && !harborSteps(state).every(s => s.found && s.understood)) return state;
      if (c.questions?.some(q => !draft.answers[q.id])) return state;
      const results = c.kind === "order" ? [{ questionId: "event-sequence", skillId: "chronology", correct: TIMELINE_EVENTS.every((e, i) => draft.order[i] === e.id), target: { section: "timeline" } }] : (c.questions ?? []).map(q => ({ questionId: q.id, skillId: q.skillId, correct: draft.answers[q.id] === q.answerId, target: q.target }));
      let next = { ...state, challenges: { ...state.challenges, [c.id]: { ...draft, status: "complete", completedAt: at, everCompleted: true, lastResult: { count: results.length, correct: results.filter(r => r.correct).length } } }, attempts: [...state.attempts, { unitId: c.unitId, source: c.id, at, results }].slice(-100) };
      return recordActivity(next, { unitId: c.unitId, label: `Completed: ${c.title}`, at, target: { challengeId: c.id } });
    }
    case "IMPORT_LEGACY": {
      if (!state.legacyRecord) return state;
      const existing = unitLibrary(state), old = state.legacyRecord;
      const library = { ...existing };
      for (const key of ["discoveredClueIds", "viewedTimelineEventIds", "viewedPersonIds", "reviewedEvidenceIds"]) library[key] = [...new Set([...existing[key], ...old[key]])];
      return { ...state, legacyRecord: null, legacyImported: true, units: { ...state.units, [REVOLUTION_UNIT_ID]: { ...state.units[REVOLUTION_UNIT_ID], library, startedAt: state.units[REVOLUTION_UNIT_ID]?.startedAt ?? at } } };
    }
    default: return state;
  }
}
