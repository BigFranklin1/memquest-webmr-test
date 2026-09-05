import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowsLeftRight,
  ChatCircleDots,
  Check,
  ClockCounterClockwise,
  Crosshair,
  FileText,
  Microphone,
  Scan,
  ShieldCheck,
  SpeakerHigh,
  SpinnerGap,
  TextAa,
  UserFocus,
  Waveform,
  WarningCircle,
} from "@phosphor-icons/react";
import samuelAdamsPortrait from "./assets/samuel-adams-ar.webp";
import bostonTeaPartyAnchorImage from "./assets/tracking/boston-tea-party-cover.png";
import stampActImage from "./assets/timeline/stamp-act-1765.webp";
import bostonMassacreImage from "./assets/timeline/boston-massacre-1770.webp";
import bostonTeaPartyImage from "./assets/timeline/boston-tea-party-1773.webp";
import continentalCongressImage from "./assets/timeline/continental-congress-1774.webp";
import dialogueAllianceVoice from "./assets/voice/dialogue-alliance.wav";
import dialogueIdentityVoice from "./assets/voice/dialogue-identity.wav";
import dialogueMotiveVoice from "./assets/voice/dialogue-motive.wav";
import bostonMassacreVoice from "./assets/voice/event-boston-massacre.wav";
import bostonTeaPartyVoice from "./assets/voice/event-boston-tea-party.wav";
import continentalCongressVoice from "./assets/voice/event-continental-congress.wav";
import stampActVoice from "./assets/voice/event-stamp-act.wav";
import samuelAdamsIntroductionVoice from "./assets/voice/samuel-adams-introduction.wav";
import { DIALOGUE_PROMPTS, SAMUEL_ADAMS, SCAN_EVENT_PRESETS, TIMELINE_EVENTS } from "./scanData.js";
import { createFrameTools, createOcrScanner } from "./ocrScanner.js";
import { OCR_STATUSES, SCAN_STAGES } from "./scanState.js";
import { ScanArtifactProjection } from "./ScanArtifactProjection.jsx";
import {
  BOSTON_TEA_PARTY_ANCHOR_EVENT_ID,
  ScanImageAnchorProjection,
} from "./ScanImageAnchorProjection.jsx";
import "./scan-capture.css";

const TIMELINE_IMAGES = Object.freeze({
  "stamp-act": stampActImage,
  massacre: bostonMassacreImage,
  "tea-party": bostonTeaPartyImage,
  congress: continentalCongressImage,
});

const DIALOGUE_VOICES = Object.freeze({
  identity: dialogueIdentityVoice,
  motive: dialogueMotiveVoice,
  alliance: dialogueAllianceVoice,
});

const TIMELINE_VOICES = Object.freeze({
  "stamp-act": stampActVoice,
  massacre: bostonMassacreVoice,
  "tea-party": bostonTeaPartyVoice,
  congress: continentalCongressVoice,
});

function BackButton({ onClick, label = "Back to profile" }) {
  return (
    <button type="button" className="scan-back" onClick={onClick}>
      <ArrowLeft size={19} weight="bold" />
      <span>{label}</span>
    </button>
  );
}

const OCR_STATUS_COPY = Object.freeze({
  [OCR_STATUSES.LOADING]: {
    title: "Preparing scanner…",
    detail: "Loading English text recognition",
  },
  [OCR_STATUSES.STABILIZING]: {
    title: "Hold text steady",
    detail: "Scanning starts automatically",
  },
  [OCR_STATUSES.RECOGNIZING]: {
    title: "Reading text…",
    detail: "Looking for a historical match",
  },
});

function ScanningView({ scanState, cameraReady, captureFrameRef, onResume }) {
  const copy = cameraReady
    ? OCR_STATUS_COPY[scanState.ocrStatus] ?? OCR_STATUS_COPY[OCR_STATUSES.LOADING]
    : {
      title: onResume ? "Camera paused" : "Opening camera…",
      detail: onResume ? "Tap Resume to continue scanning" : "Allow camera access to scan text",
    };
  const progress = Math.round((scanState.ocrProgress || 0) * 100);

  return (
    <section className="scan-capture-view" aria-labelledby="scanning-title">
      <div ref={captureFrameRef} className="scan-reading-frame" aria-hidden="true">
        <span className="scan-reading-hint"><TextAa size={17} /> Frame the English title or passage</span>
      </div>
      <div className="scan-capture-status">
        <div className="scan-capture-status-row" role="status" aria-live="polite">
          <SpinnerGap className={cameraReady && scanState.ocrStatus !== OCR_STATUSES.STABILIZING ? "is-spinning" : ""} size={20} aria-hidden="true" />
          <div><h1 id="scanning-title">{copy.title}</h1><p>{copy.detail}</p></div>
          {onResume ? <button type="button" onClick={onResume}>Resume</button> : <span className="scan-capture-pass">{cameraReady && scanState.ocrStatus === OCR_STATUSES.LOADING ? `${progress}%` : `${Math.min(3, scanState.attemptCount + 1)} / 3`}</span>}
        </div>
        {cameraReady && scanState.ocrStatus !== OCR_STATUSES.STABILIZING && <div className="scan-capture-progress" role="progressbar" aria-label="Text recognition" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>}
        <p className="scan-capture-privacy"><ShieldCheck size={13} aria-hidden="true" /> On-device only · No images uploaded</p>
      </div>
    </section>
  );
}

const ANCHOR_STATUS_COPY = Object.freeze({
  off: "Optional beta",
  loading: "Preparing target…",
  searching: "Find the book cover",
  found: "Page locked",
  lost: "Target lost · realign",
  error: "Unavailable · use screen mode",
});

function EventResultView({
  scanState,
  onProfile,
  onTimeline,
  onRescan,
  onSpeak,
  speaking,
  videoElement,
  imageAnchorTrackerFactory,
}) {
  const matchedEvent = TIMELINE_EVENTS.find((event) => event.id === scanState.matchedEventId) ?? TIMELINE_EVENTS[0];
  const image = TIMELINE_IMAGES[matchedEvent.id];
  const [projectionActive, setProjectionActive] = useState(false);
  const [modelState, setModelState] = useState("loading");
  const [modelAttempt, setModelAttempt] = useState(0);
  const [pageAnchorEnabled, setPageAnchorEnabled] = useState(false);
  const [anchorTracking, setAnchorTracking] = useState({ state: "off", message: "" });
  const [anchorPoint, setAnchorPoint] = useState(null);
  const resultRef = useRef(null);
  const pageAnchorSupported = matchedEvent.id === BOSTON_TEA_PARTY_ANCHOR_EVENT_ID;
  const anchorFound = pageAnchorEnabled && anchorTracking.state === "found";

  useEffect(() => {
    setPageAnchorEnabled(false);
    setAnchorTracking({ state: "off", message: "" });
    setAnchorPoint(null);
  }, [matchedEvent.id]);

  const togglePageAnchor = () => {
    if (!pageAnchorSupported) return;
    setPageAnchorEnabled((enabled) => {
      const nextEnabled = !enabled;
      setAnchorTracking({ state: nextEnabled ? "loading" : "off", message: "" });
      setAnchorPoint(null);
      return nextEnabled;
    });
  };

  const updateAnchorPose = (pose) => {
    const bounds = resultRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const nextPoint = { x: pose.x - bounds.left, y: pose.y - bounds.top };
    setAnchorPoint((current) => {
      if (current && Math.abs(current.x - nextPoint.x) < 3 && Math.abs(current.y - nextPoint.y) < 3) return current;
      return nextPoint;
    });
  };

  const anchorStyle = anchorPoint ? {
    "--anchor-x": anchorPoint.x + "px",
    "--anchor-y": anchorPoint.y + "px",
  } : undefined;

  return (
    <section
      ref={resultRef}
      className={"scan-ar-result " + (projectionActive ? "has-active-model " : "") + (pageAnchorEnabled ? "has-page-anchor " : "") + (anchorFound ? "is-anchor-found" : "")}
      style={anchorStyle}
      aria-labelledby="ocr-result-title"
    >
      <div className="scan-ar-lock" role="status">
        <Check size={18} weight="bold" aria-hidden="true" />
        <span>
          <strong>Historical event matched</strong>
          <small>{pageAnchorEnabled ? "Reference image tracking enabled" : "Screen anchor aligned to the recognized passage"}</small>
        </span>
        <b>{scanState.matchConfidence}%</b>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={pageAnchorEnabled}
        className={"scan-anchor-toggle " + (pageAnchorEnabled ? "is-enabled" : "")}
        onClick={togglePageAnchor}
        disabled={!pageAnchorSupported}
        title={pageAnchorSupported ? "Use the supplied book cover as a spatial reference" : "Page anchoring is available for Boston Tea Party scans"}
      >
        <Crosshair size={18} weight="duotone" aria-hidden="true" />
        <span>
          <strong>Page anchor</strong>
          <small>{pageAnchorSupported ? ANCHOR_STATUS_COPY[anchorTracking.state] : "Boston Tea Party only"}</small>
        </span>
        <i aria-hidden="true"><b /></i>
      </button>

      <button
        type="button"
        className="scan-ar-record scan-ar-card"
        style={{ "--scan-record-image": "url(" + image + ")" }}
        onClick={() => !pageAnchorEnabled && setProjectionActive((value) => !value)}
        aria-expanded={pageAnchorEnabled ? anchorFound : projectionActive}
      >
        <span className="scan-ar-record-icon"><FileText size={21} weight="duotone" /></span>
        <span className="scan-ar-record-copy">
          <small>{matchedEvent.year} · {matchedEvent.date}</small>
          <strong id="ocr-result-title">{matchedEvent.title}</strong>
          <span>{matchedEvent.cardIntro}</span>
        </span>
      </button>

      {pageAnchorEnabled ? (
        <>
          <ScanImageAnchorProjection
            key={modelAttempt}
            onModelStateChange={setModelState}
            enabled
            videoElement={videoElement}
            trackerFactory={imageAnchorTrackerFactory}
            onTrackingChange={(status) => {
              setAnchorTracking(status);
              if (status.state !== "found") setAnchorPoint(null);
            }}
            onAnchorPose={updateAnchorPose}
          />
          {anchorFound && <span className="scan-anchor-pin-label"><i /> Page locked · move around the cover</span>}
          {!anchorFound && (
            <aside className={"scan-anchor-guide is-" + anchorTracking.state} role="status">
              <img src={bostonTeaPartyAnchorImage} alt="Boston Tea Party book cover used as the page anchor target" />
              <span>
                <small>REFERENCE IMAGE</small>
                <strong>{anchorTracking.state === "loading" ? "Preparing page tracking" : anchorTracking.state === "error" ? "Page tracking unavailable" : "Aim at this book cover"}</strong>
                <p>{anchorTracking.state === "error" ? anchorTracking.message || "Switch Page anchor off to keep using the screen projection." : "Keep the full cover visible and hold the phone steady."}</p>
              </span>
            </aside>
          )}
        </>
      ) : (
        <div className="scan-ar-model-stage">
          <ScanArtifactProjection key={modelAttempt} onModelStateChange={setModelState} active={projectionActive} onActivate={() => setProjectionActive((value) => !value)} />
          {modelState === "ready" && <span className="scan-ar-model-label"><i /> Samuel Adams · historical interpretation</span>}
        </div>
      )}

      {modelState !== "ready" && (
        <aside className="scan-model-status" role="status">
          <span>{modelState === "loading" ? "Bringing Samuel to life…" : "Character could not load"}</span>
          {modelState === "error" && <button type="button" onClick={() => { setModelState("loading"); setModelAttempt((attempt) => attempt + 1); }}>Retry character</button>}
        </aside>
      )}

      <button type="button" className={"scan-ar-option scan-ar-listen " + (speaking ? "is-playing" : "")} onClick={() => onSpeak(TIMELINE_VOICES[matchedEvent.id])}>
        <span>{speaking ? <Waveform size={21} weight="bold" /> : <SpeakerHigh size={21} weight="duotone" />}</span>
        <b>{speaking ? "Playing story…" : "Listen to story"}</b>
        <small>Hear the event</small>
      </button>
      <button type="button" className="scan-ar-option scan-ar-timeline" onClick={onTimeline}>
        <span><ClockCounterClockwise size={21} weight="duotone" /></span>
        <b>Explore timeline</b>
        <small>See what led here</small>
      </button>
      <button type="button" className="scan-ar-option scan-ar-person" onClick={onProfile}>
        <span><UserFocus size={21} weight="duotone" /></span>
        <b>Meet Samuel Adams</b>
        <small>Open character profile</small>
      </button>
      <button type="button" className="scan-ar-rescan" onClick={onRescan}><Scan size={17} weight="duotone" /> Scan again</button>

      <aside className={"scan-ar-transcript " + (projectionActive || anchorFound ? "is-visible" : "")} aria-live="polite">
        <FileText size={18} weight="duotone" aria-hidden="true" />
        <span><small>TEXT SEEN IN CAMERA</small>{scanState.recognizedTextExcerpt || "A matching historical phrase was recognized in the camera frame."}</span>
      </aside>
    </section>
  );
}
function UnmatchedView({ scanState, onRetry, onTimeline }) {
  const recognitionFailed = scanState.ocrStatus === OCR_STATUSES.ERROR;
  return (
    <section className="ocr-unmatched-view" aria-labelledby="ocr-unmatched-title">
      <span className="ocr-unmatched-icon"><WarningCircle size={54} weight="duotone" /></span>
      <p className="scan-kicker">{recognitionFailed ? "Recognition unavailable" : "No preset match"}</p>
      <h1 id="ocr-unmatched-title">{recognitionFailed ? "Text recognition unavailable" : "No historical match found"}</h1>
      <p>{recognitionFailed
        ? "The on-device OCR worker could not load. Keep the page open and try again."
        : "The text was read, but it did not match an event currently available in this prototype."}</p>
      {!recognitionFailed && scanState.recognizedTextExcerpt && (
        <blockquote><small>TEXT SEEN IN CAMERA</small><p>{scanState.recognizedTextExcerpt}</p></blockquote>
      )}
      <div className="ocr-supported-events" aria-label="Currently supported historical events">
        {SCAN_EVENT_PRESETS.map((preset) => <span key={preset.eventId}><strong>{preset.year}</strong>{preset.title}</span>)}
      </div>
      <div className="ocr-unmatched-actions">
        <button type="button" className="scan-primary" onClick={onRetry}><Scan size={19} weight="duotone" /> Try again</button>
        <button type="button" className="scan-secondary" onClick={onTimeline}><ClockCounterClockwise size={19} weight="duotone" /> View supported timeline</button>
      </div>
    </section>
  );
}

function ProfileView({ matchedEvent, onDialogue, onTimeline, onRescan, onSpeak, speaking }) {
  return (
    <section className="profile-layout" aria-labelledby="subject-name">
      <figure className="character-stage">
        <div className="subject-lock"><UserFocus size={18} weight="duotone" /> Subject acquired</div>
        <img src={samuelAdamsPortrait} alt="Generated full-body archival portrait of Samuel Adams" />
        <figcaption>{matchedEvent ? `Linked through ${matchedEvent.title} · ${matchedEvent.year}` : SAMUEL_ADAMS.scanContext}</figcaption>
      </figure>

      <article className="subject-card">
        <div className="subject-card-icon" aria-hidden="true"><UserFocus size={27} weight="duotone" /></div>
        <p className="scan-kicker">Historical echo detected</p>
        <h1 id="subject-name">{SAMUEL_ADAMS.name}</h1>
        <p className="subject-meta">{SAMUEL_ADAMS.lifespan} · {SAMUEL_ADAMS.role}</p>
        <p className="subject-summary">{SAMUEL_ADAMS.summary}</p>
        <div className="subject-actions">
          <button type="button" className="scan-primary" onClick={onDialogue}>
            <ChatCircleDots size={20} weight="duotone" /> Talk to Samuel
          </button>
          <button type="button" className="scan-secondary" onClick={onTimeline}>
            <ClockCounterClockwise size={20} weight="duotone" /> Explore timeline
          </button>
          <button type="button" className="scan-secondary" onClick={() => onSpeak(samuelAdamsIntroductionVoice)}>
            {speaking ? <Waveform size={20} weight="bold" /> : <SpeakerHigh size={20} weight="duotone" />}
            {speaking ? "Speaking…" : "Hear introduction"}
          </button>
          <button type="button" className="scan-quiet" onClick={onRescan}>
            <Scan size={19} weight="duotone" /> Scan again
          </button>
        </div>
      </article>
    </section>
  );
}

function DialogueView({ selectedPromptId, onSelectPrompt, onBack, onTimeline, onSpeak, speaking }) {
  const selectedPrompt = DIALOGUE_PROMPTS.find((prompt) => prompt.id === selectedPromptId) ?? null;

  const askQuestion = (prompt) => {
    onSelectPrompt(prompt.id);
    onSpeak(DIALOGUE_VOICES[prompt.id]);
  };

  return (
    <section className="dialogue-layout" aria-labelledby="dialogue-title">
      <div className="dialogue-character">
        <BackButton onClick={onBack} />
        <img src={samuelAdamsPortrait} alt="Samuel Adams archival projection" />
        <div className="voice-ready"><span /> HeyGen character voice ready</div>
      </div>

      <div className="dialogue-panel">
        <p className="scan-kicker">Subject acquired · 1773</p>
        <h1 id="dialogue-title">Speak with Samuel Adams</h1>
        <p className="dialogue-help">Tap a question to hear the character answer through your device speaker.</p>

        <div className={`transcript-card ${selectedPrompt ? "has-answer" : ""}`} aria-live="polite">
          <div className="transcript-icon" aria-hidden="true">
            {speaking ? <Waveform size={24} weight="bold" /> : <ChatCircleDots size={24} weight="duotone" />}
          </div>
          <div>
            <span>{speaking ? "Samuel is speaking" : selectedPrompt ? selectedPrompt.label : "Choose a question"}</span>
            <p>{selectedPrompt?.answer ?? "A short transcript will appear here while the spoken response plays."}</p>
          </div>
        </div>

        <div className="question-grid">
          {DIALOGUE_PROMPTS.map((prompt) => (
            <button
              type="button"
              key={prompt.id}
              className={selectedPromptId === prompt.id ? "is-selected" : ""}
              onClick={() => askQuestion(prompt)}
            >
              <Microphone size={20} weight="duotone" />
              <span><small>{prompt.category}</small>{prompt.label}</span>
            </button>
          ))}
        </div>

        <button type="button" className="timeline-link" onClick={onTimeline}>
          <ClockCounterClockwise size={19} weight="duotone" /> Connect these answers to the timeline
        </button>
      </div>
    </section>
  );
}

function TimelineView({ selectedEventId, onSelectEvent, onBack, onSpeak, speaking }) {
  const selectedEvent = TIMELINE_EVENTS.find((event) => event.id === selectedEventId) ?? TIMELINE_EVENTS[2];
  const carouselRef = useRef(null);
  const scrollFrameRef = useRef(null);

  useEffect(() => () => {
    if (scrollFrameRef.current) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  useEffect(() => {
    const initialFrame = window.requestAnimationFrame(() => {
      const selectedCard = carouselRef.current?.querySelector(`[data-event-id="${selectedEvent.id}"]`);
      selectedCard?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
    });
    return () => window.cancelAnimationFrame(initialFrame);
  }, []);

  const syncNearestCard = () => {
    if (scrollFrameRef.current) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const carousel = carouselRef.current;
      if (!carousel) return;
      const carouselCenter = carousel.getBoundingClientRect().left + (carousel.clientWidth / 2);
      const cards = [...carousel.querySelectorAll("[data-event-id]")];
      const nearest = cards.reduce((closest, card) => {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(rect.left + (rect.width / 2) - carouselCenter);
        return !closest || distance < closest.distance ? { card, distance } : closest;
      }, null);
      const nearestId = nearest?.card.dataset.eventId;
      if (nearestId && nearestId !== selectedEvent.id) onSelectEvent(nearestId);
    });
  };

  const selectCard = (eventId, card) => {
    onSelectEvent(eventId);
    card.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  return (
    <section className="timeline-layout" aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <BackButton onClick={onBack} />
        <div>
          <p className="scan-kicker">AR history · American Revolution</p>
          <h1 id="timeline-title">Connect the causes</h1>
        </div>
        <div className="timeline-subject-chip">
          <img src={samuelAdamsPortrait} alt="" aria-hidden="true" />
          <span>Samuel Adams<br /><small>Context guide</small></span>
        </div>
      </div>

      <div className="timeline-carousel-label">
        <span>Key moments in the road to revolution</span>
        <small><ArrowsLeftRight size={16} weight="bold" /> Swipe timeline</small>
      </div>

      <div
        ref={carouselRef}
        className="timeline-events"
        role="list"
        aria-label="Key historical events. Swipe horizontally to explore."
        onScroll={syncNearestCard}
      >
        {TIMELINE_EVENTS.map((event) => (
          <article className="timeline-event-card" role="listitem" key={event.id}>
            <button
              type="button"
              data-event-id={event.id}
              className={event.id === selectedEvent.id ? "is-selected" : ""}
              aria-pressed={event.id === selectedEvent.id}
              onClick={(clickEvent) => selectCard(event.id, clickEvent.currentTarget)}
            >
              <div className="timeline-event-image">
                <img src={TIMELINE_IMAGES[event.id]} alt={event.imageAlt} />
                <strong>{event.year}</strong>
                {event.id === selectedEvent.id && <Check className="event-check" size={17} weight="bold" />}
              </div>
              <div className="timeline-event-copy">
                <div className="timeline-event-meta"><span>{event.date}</span><small>{event.shortTitle}</small></div>
                <h2>{event.title}</h2>
                <p>{event.cardIntro}</p>
              </div>
            </button>
          </article>
        ))}
      </div>

      <article className="timeline-detail" aria-live="polite">
        <div className="timeline-date"><strong>{selectedEvent.year}</strong><span>{selectedEvent.date}</span></div>
        <div>
          <h2>{selectedEvent.title}</h2>
          <p>{selectedEvent.detail}</p>
        </div>
        <button type="button" className="scan-secondary" onClick={() => onSpeak(TIMELINE_VOICES[selectedEvent.id])}>
          {speaking ? <Waveform size={20} weight="bold" /> : <SpeakerHigh size={20} weight="duotone" />}
          {speaking ? "Speaking…" : "Hear event"}
        </button>
      </article>
    </section>
  );
}

export function ScanExperience({
  scanState,
  dispatchScan,
  experience,
  onRetryCamera,
  onMatchedEvent,
  videoElement,
  recognizerFactory,
  imageAnchorTrackerFactory,
}) {
  const scannerRef = useRef(null);
  const captureFrameRef = useRef(null);
  const audioRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (scanState.stage !== SCAN_STAGES.SCANNING || experience.mode !== "camera" || !videoElement) return undefined;

    const scanner = createOcrScanner({
      videoElement,
      recognizerFactory,
      frameTools: createFrameTools(document, () => captureFrameRef.current?.getBoundingClientRect()),
      onProgress: (progress) => dispatchScan({ type: "OCR_PROGRESS", ...progress }),
      onMatch: onMatchedEvent,
      onNoMatch: (result) => dispatchScan({ type: "NO_MATCH", ...result }),
      onError: () => dispatchScan({ type: "OCR_ERROR" }),
    });
    scannerRef.current = scanner;
    scanner.start();
    return () => {
      if (scannerRef.current === scanner) scannerRef.current = null;
      scanner.stop();
    };
  }, [dispatchScan, experience.mode, onMatchedEvent, recognizerFactory, scanState.stage, videoElement]);

  useEffect(() => () => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (!audio) return;
    audio.onplay = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.src = "";
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audioRef.current = null;
    audio.onplay = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.src = "";
    setSpeaking(false);
  }, [scanState.stage]);

  const speak = (source) => {
    const previousAudio = audioRef.current;
    audioRef.current = null;
    if (previousAudio) {
      previousAudio.onplay = null;
      previousAudio.onended = null;
      previousAudio.onerror = null;
      previousAudio.pause();
      previousAudio.src = "";
    }
    const audio = new window.Audio(source);
    audio.preload = "auto";
    audio.onplay = () => {
      if (audioRef.current === audio) setSpeaking(true);
    };
    audio.onended = () => {
      if (audioRef.current === audio) setSpeaking(false);
    };
    audio.onerror = () => {
      if (audioRef.current === audio) setSpeaking(false);
    };
    audioRef.current = audio;
    audio.play().catch(() => {
      if (audioRef.current === audio) setSpeaking(false);
    });
  };

  const hasCameraError = ["denied", "unsupported", "error"].includes(experience.mode);
  const matchedEvent = TIMELINE_EVENTS.find((event) => event.id === scanState.matchedEventId) ?? null;

  if (hasCameraError) {
    return (
      <section className="scan-error" role="alert">
        <Scan size={54} weight="duotone" />
        <p className="scan-kicker">Camera unavailable</p>
        <h1>Scan could not start</h1>
        <p>{experience.message}</p>
        <button type="button" className="scan-primary" onClick={onRetryCamera}>Try camera again</button>
      </section>
    );
  }

  if (scanState.stage === SCAN_STAGES.PROFILE) {
    return (
      <ProfileView
        matchedEvent={matchedEvent}
        onDialogue={() => dispatchScan({ type: "OPEN_DIALOGUE" })}
        onTimeline={() => dispatchScan({ type: "OPEN_TIMELINE" })}
        onRescan={onRetryCamera}
        onSpeak={speak}
        speaking={speaking}
      />
    );
  }

  if (scanState.stage === SCAN_STAGES.RESULT) {
    return (
      <EventResultView
        scanState={scanState}
        onProfile={() => dispatchScan({ type: "OPEN_PROFILE" })}
        onTimeline={() => dispatchScan({ type: "OPEN_TIMELINE" })}
        onRescan={onRetryCamera}
        onSpeak={speak}
        speaking={speaking}
        videoElement={videoElement}
        imageAnchorTrackerFactory={imageAnchorTrackerFactory}
      />
    );
  }

  if (scanState.stage === SCAN_STAGES.UNMATCHED) {
    return (
      <UnmatchedView
        scanState={scanState}
        onRetry={onRetryCamera}
        onTimeline={() => dispatchScan({ type: "OPEN_TIMELINE" })}
      />
    );
  }

  if (scanState.stage === SCAN_STAGES.DIALOGUE) {
    return (
      <DialogueView
        selectedPromptId={scanState.selectedPromptId}
        onSelectPrompt={(promptId) => dispatchScan({ type: "SELECT_PROMPT", promptId })}
        onBack={() => dispatchScan({ type: "OPEN_PROFILE" })}
        onTimeline={() => dispatchScan({ type: "OPEN_TIMELINE" })}
        onSpeak={speak}
        speaking={speaking}
      />
    );
  }

  if (scanState.stage === SCAN_STAGES.TIMELINE) {
    return (
      <TimelineView
        selectedEventId={scanState.selectedEventId}
        onSelectEvent={(eventId) => dispatchScan({ type: "SELECT_EVENT", eventId })}
        onBack={() => dispatchScan({ type: "OPEN_PROFILE" })}
        onSpeak={speak}
        speaking={speaking}
      />
    );
  }

  return <ScanningView scanState={scanState} cameraReady={experience.mode === "camera"} captureFrameRef={captureFrameRef} onResume={experience.mode === "idle" ? onRetryCamera : undefined} />;
}
