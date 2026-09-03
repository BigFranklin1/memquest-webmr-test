export const SCAN_STAGES = Object.freeze({
  IDLE: "idle",
  SCANNING: "scanning",
  RESULT: "result",
  UNMATCHED: "unmatched",
  PROFILE: "profile",
  DIALOGUE: "dialogue",
  TIMELINE: "timeline",
});

export const OCR_STATUSES = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  STABILIZING: "stabilizing",
  RECOGNIZING: "recognizing",
  MATCHED: "matched",
  UNMATCHED: "unmatched",
  ERROR: "error",
});

export const initialScanState = Object.freeze({
  stage: SCAN_STAGES.IDLE,
  selectedPromptId: null,
  selectedEventId: "tea-party",
  ocrStatus: OCR_STATUSES.IDLE,
  ocrProgress: 0,
  attemptCount: 0,
  recognizedTextExcerpt: "",
  matchedEventId: null,
  matchConfidence: null,
  ocrConfidence: null,
  matchedPhrases: [],
});

export function scanReducer(state, action) {
  switch (action.type) {
    case "START":
    case "RETRY_SCAN":
      return {
        ...initialScanState,
        stage: SCAN_STAGES.SCANNING,
        ocrStatus: OCR_STATUSES.LOADING,
      };
    case "OCR_PROGRESS":
      if (state.stage !== SCAN_STAGES.SCANNING) return state;
      return {
        ...state,
        ocrStatus: action.status ?? state.ocrStatus,
        ocrProgress: Number.isFinite(action.progress) ? action.progress : state.ocrProgress,
        attemptCount: Number.isFinite(action.attemptCount) ? action.attemptCount : state.attemptCount,
      };
    case "MATCH_EVENT":
      return {
        ...state,
        stage: SCAN_STAGES.RESULT,
        ocrStatus: OCR_STATUSES.MATCHED,
        selectedEventId: action.eventId,
        matchedEventId: action.eventId,
        matchConfidence: action.confidence,
        ocrConfidence: action.ocrConfidence,
        matchedPhrases: action.matchedPhrases ?? [],
        attemptCount: action.attemptCount ?? state.attemptCount,
        recognizedTextExcerpt: action.recognizedTextExcerpt ?? "",
      };
    case "NO_MATCH":
      return {
        ...state,
        stage: SCAN_STAGES.UNMATCHED,
        ocrStatus: OCR_STATUSES.UNMATCHED,
        attemptCount: action.attemptCount ?? state.attemptCount,
        recognizedTextExcerpt: action.recognizedTextExcerpt ?? "",
      };
    case "OCR_ERROR":
      return {
        ...state,
        stage: SCAN_STAGES.UNMATCHED,
        ocrStatus: OCR_STATUSES.ERROR,
      };
    case "OPEN_PROFILE":
      return { ...state, stage: SCAN_STAGES.PROFILE };
    case "OPEN_DIALOGUE":
      return { ...state, stage: SCAN_STAGES.DIALOGUE };
    case "OPEN_TIMELINE":
      return { ...state, stage: SCAN_STAGES.TIMELINE };
    case "SELECT_PROMPT":
      return { ...state, selectedPromptId: action.promptId };
    case "SELECT_EVENT":
      return { ...state, selectedEventId: action.eventId };
    case "RESET":
      return initialScanState;
    default:
      return state;
  }
}
