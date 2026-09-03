import { MEMORY_QUESTIONS, REVOLUTION_EVIDENCE, REVOLUTION_PEOPLE } from "./revolutionData.js";
import { TIMELINE_EVENTS } from "./scanData.js";
import { HARBOR_CLUES } from "./libraryData.js";

export const LIBRARY_STAGES = Object.freeze({
  HOME: "home",
  OVERVIEW: "overview",
  HARBOR: "harbor",
});

export const LIBRARY_STORAGE_KEY = "memquest.american-revolution.v2";

export const initialLibraryState = Object.freeze({
  stage: LIBRARY_STAGES.HOME,
  selectedEraId: null,
  discoveredClueIds: [],
  explainedClueIds: [],
  selectedClueId: null,
  activeSection: "explore",
  timelineMode: "events",
  selectedTimelineEventId: "tea-party",
  selectedCauseId: "punishment-unity",
  viewedTimelineEventIds: [],
  selectedPersonId: "samuel-adams",
  viewedPersonIds: [],
  evidenceFilter: "all",
  selectedEvidenceId: "lantern",
  reviewedEvidenceIds: [],
  memoryCheck: Object.freeze({
    status: "idle",
    currentIndex: 0,
    answers: Object.freeze({}),
    score: 0,
    bestScore: 0,
  }),
});

const appendUnique = (items, value) => (items.includes(value) ? items : [...items, value]);

export function calculateUnitProgress(state) {
  const done = state.viewedTimelineEventIds.length + state.viewedPersonIds.length + state.reviewedEvidenceIds.length + state.discoveredClueIds.length;
  const total = TIMELINE_EVENTS.length + REVOLUTION_PEOPLE.length + REVOLUTION_EVIDENCE.length + HARBOR_CLUES.length;
  return Math.min(100, Math.round(done / total * 100));
}

export function restoreLibraryState(savedState) {
  if (!savedState || typeof savedState !== "object") return initialLibraryState;
  const savedMemory = savedState.memoryCheck && typeof savedState.memoryCheck === "object"
    ? savedState.memoryCheck
    : {};
  const validIds = (values, entries) => [...new Set(Array.isArray(values) ? values.filter(id => entries.some(e => e.id === id)) : [])];
  const answers = Object.fromEntries(MEMORY_QUESTIONS.filter(q => q.options.some(o => o.id === savedMemory.answers?.[q.id])).map(q => [q.id, savedMemory.answers[q.id]]));
  return {
    ...initialLibraryState,
    ...savedState,
    stage: LIBRARY_STAGES.HOME,
    selectedClueId: null,
    selectedTimelineEventId: TIMELINE_EVENTS.some(e => e.id === savedState.selectedTimelineEventId) ? savedState.selectedTimelineEventId : initialLibraryState.selectedTimelineEventId,
    selectedPersonId: REVOLUTION_PEOPLE.some(p => p.id === savedState.selectedPersonId) ? savedState.selectedPersonId : initialLibraryState.selectedPersonId,
    selectedEvidenceId: REVOLUTION_EVIDENCE.some(e => e.id === savedState.selectedEvidenceId) ? savedState.selectedEvidenceId : initialLibraryState.selectedEvidenceId,
    discoveredClueIds: validIds(savedState.discoveredClueIds, HARBOR_CLUES),
    explainedClueIds: validIds(savedState.explainedClueIds, HARBOR_CLUES),
    viewedTimelineEventIds: validIds(savedState.viewedTimelineEventIds, TIMELINE_EVENTS),
    viewedPersonIds: validIds(savedState.viewedPersonIds, REVOLUTION_PEOPLE),
    reviewedEvidenceIds: validIds(savedState.reviewedEvidenceIds, REVOLUTION_EVIDENCE),
    activeSection: ["explore", "timeline", "people", "evidence", "memory"].includes(savedState.activeSection) ? savedState.activeSection : "explore",
    memoryCheck: {
      ...initialLibraryState.memoryCheck,
      ...savedMemory,
      status: ["complete", "in-progress"].includes(savedMemory.status) ? savedMemory.status : "idle",
      currentIndex: Math.max(0, Math.min(MEMORY_QUESTIONS.length - 1, Number(savedMemory.currentIndex) || 0)),
      score: Math.max(0, Math.min(100, Number(savedMemory.score) || 0)),
      bestScore: Math.max(0, Math.min(100, Number(savedMemory.bestScore) || 0)),
      answers,
    },
  };
}

export function libraryReducer(state, action) {
  switch (action.type) {
    case "OPEN_ERA":
      if (action.eraId !== "american-revolution") return state;
      return {
        ...state,
        stage: LIBRARY_STAGES.OVERVIEW,
        selectedEraId: action.eraId,
        selectedClueId: null,
        activeSection: "explore",
      };
    case "ENTER_HARBOR":
      return {
        ...state,
        stage: LIBRARY_STAGES.HARBOR,
        selectedEraId: "american-revolution",
        selectedClueId: null,
      };
    case "EXIT_HARBOR":
      return { ...state, stage: LIBRARY_STAGES.OVERVIEW, selectedClueId: null, activeSection: "explore" };
    case "BACK_HOME":
      return { ...state, stage: LIBRARY_STAGES.HOME, selectedClueId: null };
    case "DISCOVER_CLUE": {
      if (!HARBOR_CLUES.some(c => c.id === action.clueId)) return state;
      const discoveredClueIds = state.discoveredClueIds.includes(action.clueId)
        ? state.discoveredClueIds
        : [...state.discoveredClueIds, action.clueId];
      return { ...state, discoveredClueIds, selectedClueId: action.clueId };
    }
    case "EXPLAIN_CLUE":
      if (!state.discoveredClueIds.includes(action.clueId)) return state;
      return { ...state, explainedClueIds: appendUnique(state.explainedClueIds, action.clueId) };
    case "CLOSE_CLUE":
      return { ...state, selectedClueId: null };
    case "OPEN_SECTION":
      if (!["explore", "timeline", "people", "evidence", "memory"].includes(action.sectionId)) return state;
      return { ...state, activeSection: action.sectionId };
    case "SET_TIMELINE_MODE":
      if (!["events", "causes"].includes(action.mode)) return state;
      return { ...state, timelineMode: action.mode };
    case "SELECT_TIMELINE_EVENT":
      if (!TIMELINE_EVENTS.some(e => e.id === action.eventId)) return state;
      if (state.selectedTimelineEventId === action.eventId && state.viewedTimelineEventIds.includes(action.eventId)) return state;
      return {
        ...state,
        selectedTimelineEventId: action.eventId,
        viewedTimelineEventIds: appendUnique(state.viewedTimelineEventIds, action.eventId),
      };
    case "SELECT_CAUSE":
      return { ...state, selectedCauseId: action.causeId };
    case "SELECT_PERSON":
      if (!REVOLUTION_PEOPLE.some(p => p.id === action.personId)) return state;
      if (state.selectedPersonId === action.personId && state.viewedPersonIds.includes(action.personId)) return state;
      return {
        ...state,
        selectedPersonId: action.personId,
        viewedPersonIds: appendUnique(state.viewedPersonIds, action.personId),
      };
    case "SET_EVIDENCE_FILTER":
      return { ...state, evidenceFilter: action.filter };
    case "SELECT_EVIDENCE":
      if (!REVOLUTION_EVIDENCE.some(e => e.id === action.evidenceId)) return state;
      if (REVOLUTION_EVIDENCE.find(e => e.id === action.evidenceId).clueId && !state.discoveredClueIds.includes(REVOLUTION_EVIDENCE.find(e => e.id === action.evidenceId).clueId)) {
        return state.selectedEvidenceId === action.evidenceId ? state : { ...state, selectedEvidenceId: action.evidenceId };
      }
      if (state.selectedEvidenceId === action.evidenceId && state.reviewedEvidenceIds.includes(action.evidenceId)) return state;
      return {
        ...state,
        selectedEvidenceId: action.evidenceId,
        reviewedEvidenceIds: appendUnique(state.reviewedEvidenceIds, action.evidenceId),
      };
    case "START_MEMORY":
      return {
        ...state,
        memoryCheck: { ...state.memoryCheck, status: "in-progress", currentIndex: 0, answers: {}, score: 0 },
      };
    case "ANSWER_MEMORY":
      if (state.memoryCheck.status !== "in-progress" || state.memoryCheck.answers[action.questionId]) return state;
      if (!MEMORY_QUESTIONS.find(q => q.id === action.questionId)?.options.some(o => o.id === action.answerId)) return state;
      return {
        ...state,
        memoryCheck: {
          ...state.memoryCheck,
          answers: { ...state.memoryCheck.answers, [action.questionId]: action.answerId },
        },
      };
    case "NEXT_MEMORY":
      return {
        ...state,
        memoryCheck: {
          ...state.memoryCheck,
          currentIndex: Math.min(MEMORY_QUESTIONS.length - 1, state.memoryCheck.currentIndex + 1),
        },
      };
    case "COMPLETE_MEMORY": {
      if (state.memoryCheck.status !== "in-progress" || MEMORY_QUESTIONS.some(q => !state.memoryCheck.answers[q.id])) return state;
      const correctCount = MEMORY_QUESTIONS.filter((question) => state.memoryCheck.answers[question.id] === question.answerId).length;
      const score = Math.round((correctCount / MEMORY_QUESTIONS.length) * 100);
      return {
        ...state,
        memoryCheck: {
          ...state.memoryCheck,
          status: "complete",
          score,
          bestScore: Math.max(state.memoryCheck.bestScore, score),
        },
      };
    }
    case "RESET_MEMORY":
      return {
        ...state,
        memoryCheck: { ...state.memoryCheck, status: "in-progress", currentIndex: 0, answers: {}, score: 0 },
      };
    default:
      return state;
  }
}
