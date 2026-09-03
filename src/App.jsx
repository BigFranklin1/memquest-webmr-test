import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowLeft,
  Books,
  ChartLineUp,
  Crosshair,
  HandTap,
  MapPin,
  Medal,
  Scan,
  Sparkle,
  User,
} from "@phosphor-icons/react";
import {
  createExperienceController,
  EXPERIENCE_MODES,
} from "./experience.js";
import { ScanExperience } from "./ScanExperience.jsx";
import { TIMELINE_EVENTS } from "./scanData.js";
import { initialScanState, scanReducer } from "./scanState.js";
import { LibraryExperience } from "./LibraryExperience.jsx";
import {
  LIBRARY_STAGES,
} from "./libraryState.js";
import { GlobalWorkspace } from "./GlobalWorkspace.jsx";
import { LEARNING_STORAGE_KEY, learningReducer, loadLearningState, restoreLearningState, unitLibrary } from "./learningState.js";
import { REVOLUTION_UNIT_ID, getChallenge } from "./learningData.js";

const instructions = [
  {
    title: "Position",
    description: "Keep your phone 1-2 feet from the page for stable spatial tracking and artifact rendering.",
    Icon: MapPin,
  },
  {
    title: "Anchor",
    description: "Once the gold reticle settles on the text, tap to initialize the historical reconstruction.",
    Icon: Crosshair,
  },
  {
    title: "Interact",
    description: "Use intuitive touch gestures to converse with figures and inspect multi-layered artifacts.",
    Icon: HandTap,
  },
];

const tabs = [
  { id: "scan", label: "Scan", Icon: Scan },
  { id: "library", label: "Library", Icon: Books },
  { id: "challenges", label: "Challenges", Icon: Medal },
  { id: "progress", label: "Progress", Icon: ChartLineUp },
];

const isActiveMode = (mode) => (
  mode === EXPERIENCE_MODES.WEBXR || mode === EXPERIENCE_MODES.CAMERA
);

function TabNav({ activeTab, onTabChange, scanLayout = false }) {
  return (
    <nav className={scanLayout ? "scan-bottom-nav" : "bottom-nav"} aria-label="Primary navigation">
      {tabs.map(({ id, label, Icon }) => (
        <button
          type="button"
          key={id}
          className={activeTab === id ? "is-active" : ""}
          aria-current={activeTab === id ? "page" : undefined}
          onClick={() => onTabChange({ id, label })}
        >
          {scanLayout && <Icon size={20} weight="duotone" aria-hidden="true" />}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function App({ storage, initialTab = "welcome" } = {}) {
  const appRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const [experience, setExperience] = useState({
    mode: EXPERIENCE_MODES.IDLE,
    code: null,
    message: "",
  });
  const [activeTab, setActiveTab] = useState(initialTab);
  const [returnTarget, setReturnTarget] = useState(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [toast, setToast] = useState("");
  const [scanState, dispatchScan] = useReducer(scanReducer, initialScanState);
  const [learningState, dispatchLearning] = useReducer(learningReducer, undefined, () => {
    try {
      const savedStorage = storage ?? window.localStorage;
      return loadLearningState(savedStorage);
    } catch {
      return restoreLearningState(null);
    }
  });
  const libraryState = unitLibrary(learningState);
  const dispatchGlobal = useCallback(action => dispatchLearning({ ...action, at: new Date().toISOString() }), []);
  const dispatchLibrary = useCallback(action => dispatchLearning({ type: "UNIT_ACTION", unitId: REVOLUTION_UNIT_ID, action, at: new Date().toISOString() }), []);

  useEffect(() => {
    try {
      (storage ?? window.localStorage).setItem(LEARNING_STORAGE_KEY, JSON.stringify(learningState));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [learningState, storage]);

  useEffect(() => {
    const overlayElement = appRef.current;
    const controller = createExperienceController({
      videoElement: videoRef.current,
      overlayElement,
      canvasElement: canvasRef.current,
      onStateChange: setExperience,
    });
    controllerRef.current = controller;
    controller.probeSupport();

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") controller.stopExperience();
    };
    const handlePageHide = () => controller.stopExperience();
    const preventXrSelect = (event) => {
      if (event.target?.closest?.("button")) event.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    overlayElement?.addEventListener("beforexrselect", preventXrSelect);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      overlayElement?.removeEventListener("beforexrselect", preventXrSelect);
      controller.stopExperience();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const announce = useCallback((message) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2200);
  }, []);

  const beginScan = useCallback(async () => {
    setActiveTab("scan");
    dispatchScan({ type: "START" });

    if (experience.mode === EXPERIENCE_MODES.CAMERA) {
      announce("Camera ready. Local text recognition is active");
      return;
    }

    if (experience.mode === EXPERIENCE_MODES.WEBXR) {
      await controllerRef.current?.stopExperience();
    }

    const result = await controllerRef.current?.startExperience({ preferWebXR: false });
    if (result?.mode === EXPERIENCE_MODES.CAMERA) announce("Camera ready. Local text recognition is active");
  }, [announce, experience.mode]);

  const handleMatchedEvent = useCallback((match) => {
    dispatchScan({ type: "MATCH_EVENT", ...match });
    const event = TIMELINE_EVENTS.find((item) => item.id === match.eventId);
    announce(`${event?.title ?? "Historical event"} matched · ${match.confidence}%`);
  }, [announce]);

  const handlePrimaryAction = async () => {
    if (isActiveMode(experience.mode)) {
      await beginScan();
      return;
    }
    await controllerRef.current?.startExperience();
  };

  const handleTabChange = (tab) => {
    setReturnTarget(null);
    if (tab.id === "scan") {
      beginScan();
      return;
    }
    if (isActiveMode(experience.mode)) controllerRef.current?.stopExperience();
    setActiveTab(tab.id);
    announce(`Switched to ${tab.label}`);
  };

  const openLearningContent = (target, sourceTab) => {
    setReturnTarget({ tab: sourceTab, challengeId: sourceTab === "challenges" ? learningState.selectedChallengeId : null });
    dispatchGlobal({ type: "OPEN_CONTENT", unitId: target.unitId, target });
    setActiveTab("library");
  };

  const isBusy = experience.mode === EXPERIENCE_MODES.STARTING;
  const hasError = [
    EXPERIENCE_MODES.DENIED,
    EXPERIENCE_MODES.UNSUPPORTED,
    EXPERIENCE_MODES.ERROR,
  ].includes(experience.mode);

  const primaryLabel = isBusy
    ? "Starting…"
    : isActiveMode(experience.mode)
      ? "Start Learning"
      : hasError
        ? "Try Again"
        : "Enable AR Camera";

  const scanIsOpen = activeTab === "scan";
  const libraryIsOpen = activeTab === "library";
  const globalIsOpen = activeTab === "challenges" || activeTab === "progress";
  const libraryIsHarbor = libraryIsOpen && libraryState.stage === LIBRARY_STAGES.HARBOR;

  return (
    <main
      ref={appRef}
      className={`experience-app ${scanIsOpen ? "has-scan-workspace" : ""} ${libraryIsOpen ? "has-library-workspace" : ""} ${libraryIsHarbor ? "has-harbor-workspace" : ""} ${globalIsOpen ? "has-global-workspace" : ""}`}
      data-mode={experience.mode}
    >
      <video
        ref={videoRef}
        className="camera-feed"
        autoPlay
        muted
        playsInline
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="xr-canvas" aria-hidden="true" />
      <div className="camera-scrim" aria-hidden="true" />

      {scanIsOpen ? (
        <section className="scan-shell" aria-label="MemQuest scan experience">
          <header className="scan-app-header">
            <div className="scan-brand">
              <span className="scan-brand-mark"><Sparkle size={22} weight="fill" /></span>
              <strong>MemQuest</strong>
            </div>
            <div className="scan-user">
              <span>History Explorer<small>Your personal archive</small></span>
              <span className="scan-user-icon"><User size={21} weight="duotone" /></span>
            </div>
          </header>

          <div className="scan-content">
            <ScanExperience
              scanState={scanState}
              dispatchScan={dispatchScan}
              experience={experience}
              onRetryCamera={beginScan}
              onMatchedEvent={handleMatchedEvent}
              videoElement={videoRef.current}
            />
          </div>

          <TabNav activeTab={activeTab} onTabChange={handleTabChange} scanLayout />
        </section>
      ) : libraryIsOpen ? (
        <section className={`library-shell ${returnTarget ? "has-learning-return" : ""}`} aria-label="MemQuest historical library">
          {returnTarget && <div className="learning-return-bar"><button type="button" onClick={() => { setActiveTab(returnTarget.tab); setReturnTarget(null); }}><ArrowLeft size={17} />Back to {returnTarget.tab === "challenges" ? "challenge" : "progress"}</button><span>{returnTarget.challengeId ? getChallenge(returnTarget.challengeId)?.title : "Your historical journey"}</span></div>}
          <LibraryExperience
            state={libraryState}
            dispatch={dispatchLibrary}
            onUnavailable={announce}
            onProfile={() => handleTabChange({ id: "progress", label: "Progress" })}
          />
          {libraryState.stage === LIBRARY_STAGES.HOME && (
            <TabNav activeTab={activeTab} onTabChange={handleTabChange} scanLayout />
          )}
        </section>
      ) : globalIsOpen ? (
        <>
          <GlobalWorkspace tab={activeTab} state={learningState} dispatch={dispatchGlobal} onOpenContent={openLearningContent} onChangeTab={setActiveTab} storageAvailable={storageAvailable} />
          <TabNav activeTab={activeTab} onTabChange={handleTabChange} scanLayout />
        </>
      ) : (
        <section className="guide-panel" aria-labelledby="guide-title">
          <div className="guide-scroll">
            <header className="guide-header">
              <h1 id="guide-title">Bring History to Life with AR</h1>
              <p className="subtitle">
                <span>Prepare to bridge the gap between archival text and</span>
                <span>tangible, holographic reality.</span>
              </p>
            </header>

            <div className="instruction-list">
              {instructions.map(({ title, description, Icon }) => (
                <article className="instruction-card" key={title}>
                  <div className="instruction-icon" aria-hidden="true">
                    <Icon size={27} weight="duotone" />
                  </div>
                  <div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>

            {hasError && (
              <div className="status-notice" role="alert">
                <span>{experience.message}</span>
              </div>
            )}

            <button
              type="button"
              className="primary-action"
              onClick={handlePrimaryAction}
              disabled={isBusy}
            >
              {primaryLabel}
            </button>
          </div>

          <TabNav activeTab={activeTab} onTabChange={handleTabChange} />
        </section>
      )}

      <div className={`toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </main>
  );
}
