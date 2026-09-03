import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowsLeftRight,
  ChartLineUp,
  Check,
  CheckCircle,
  CheckSquare,
  ClockCounterClockwise,
  Compass,
  FolderOpen,
  MagnifyingGlass,
  MapTrifold,
  Pause,
  SpeakerHigh,
  UsersThree,
} from "@phosphor-icons/react";
import { PeopleView } from "./PeopleView.jsx";
import revolutionPeopleTriptych from "./assets/archive/revolution-people-triptych.jpg";
import evidenceArchiveImage from "./assets/archive/tea-party-evidence-table.jpg";
import stampActImage from "./assets/timeline/stamp-act-1765.webp";
import bostonMassacreImage from "./assets/timeline/boston-massacre-1770.webp";
import bostonTeaPartyImage from "./assets/timeline/boston-tea-party-1773.webp";
import continentalCongressImage from "./assets/timeline/continental-congress-1774.webp";
import stampActVoice from "./assets/voice/event-stamp-act.wav";
import bostonMassacreVoice from "./assets/voice/event-boston-massacre.wav";
import bostonTeaPartyVoice from "./assets/voice/event-boston-tea-party.wav";
import continentalCongressVoice from "./assets/voice/event-continental-congress.wav";
import { TIMELINE_EVENTS } from "./scanData.js";
import {
  MEMORY_QUESTIONS,
  REVOLUTION_CAUSES,
  REVOLUTION_EVIDENCE,
  REVOLUTION_PEOPLE,
} from "./revolutionData.js";

const TIMELINE_IMAGES = Object.freeze({
  "stamp-act": stampActImage,
  massacre: bostonMassacreImage,
  "tea-party": bostonTeaPartyImage,
  congress: continentalCongressImage,
});

const TIMELINE_AUDIO = Object.freeze({
  "stamp-act": stampActVoice,
  massacre: bostonMassacreVoice,
  "tea-party": bostonTeaPartyVoice,
  congress: continentalCongressVoice,
});

const EVIDENCE_IMAGE_POSITIONS = Object.freeze({
  lantern: "0% 50%",
  hatchet: "22% 62%",
  "tea-chest": "43% 48%",
  "dartmouth-record": "68% 42%",
  "gazette-report": "82% 65%",
  "tea-act": "100% 48%",
});

const EVIDENCE_IMAGE_OFFSETS = Object.freeze({
  lantern: "0%",
  hatchet: "-50%",
  "tea-chest": "-100%",
  "dartmouth-record": "-210%",
  "gazette-report": "-250%",
  "tea-act": "-300%",
});

const MEMORY_BACKGROUNDS = Object.freeze({
  timeline: bostonMassacreImage,
  people: revolutionPeopleTriptych,
  evidence: evidenceArchiveImage,
});

const SECTION_META = Object.freeze({
  timeline: {
    kicker: "CHRONOLOGY / CAUSE AND EFFECT",
    title: "Timeline of a Revolution",
    description: "Move through four turning points, then reveal how one crisis shaped the next.",
    Icon: ChartLineUp,
  },
  people: {
    kicker: "PEOPLE / PERSPECTIVE",
    title: "People in the Conflict",
    description: "Compare the goals and pressures that placed neighbors on different sides of imperial rule.",
    Icon: UsersThree,
  },
  evidence: {
    kicker: "ARCHIVE / SOURCE REASONING",
    title: "Evidence Room",
    description: "Inspect what each source can support, and what it cannot prove on its own.",
    Icon: FolderOpen,
  },
  memory: {
    kicker: "MEMORY CHECK / UNIT SYNTHESIS",
    title: "Reconstruct the Argument",
    description: "Use chronology, perspective, and evidence to explain why resistance escalated.",
    Icon: CheckSquare,
  },
});

function SectionHeader({ section, trailing }) {
  const meta = SECTION_META[section];
  const Icon = meta.Icon;
  return (
    <header className="unit-section-header">
      <div className="unit-section-title">
        <span className="unit-section-icon"><Icon size={24} weight="duotone" /></span>
        <div>
          <small>{meta.kicker}</small>
          <h1 id={`unit-${section}-title`}>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
      </div>
      {trailing}
    </header>
  );
}

function useTimelineAudio() {
  const audioRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);

  const stop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
    }
    audioRef.current = null;
    setPlayingId(null);
  };

  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
    }
  }, []);

  const toggle = async (eventId) => {
    const current = audioRef.current;
    if (current?.dataset.eventId === eventId) {
      if (current.paused) {
        try {
          await current.play();
          setPlayingId(eventId);
        } catch {
          setPlayingId(null);
        }
      } else {
        current.pause();
        setPlayingId(null);
      }
      return;
    }

    stop();
    const audio = new Audio(TIMELINE_AUDIO[eventId]);
    audio.dataset.eventId = eventId;
    audio.preload = "auto";
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audioRef.current = audio;
    try {
      await audio.play();
      setPlayingId(eventId);
    } catch {
      setPlayingId(null);
    }
  };

  return { playingId, stop, toggle };
}

function TimelineView({ state, dispatch, onEnterHarbor }) {
  const selectedEvent = TIMELINE_EVENTS.find((event) => event.id === state.selectedTimelineEventId) ?? TIMELINE_EVENTS[0];
  const selectedCause = REVOLUTION_CAUSES.find((cause) => cause.id === state.selectedCauseId) ?? REVOLUTION_CAUSES[0];
  const causeFrom = TIMELINE_EVENTS.find((event) => event.id === selectedCause.fromEventId);
  const causeTo = TIMELINE_EVENTS.find((event) => event.id === selectedCause.toEventId);
  const { playingId, stop, toggle } = useTimelineAudio();

  const selectEvent = (eventId) => {
    stop();
    dispatch({ type: "SELECT_TIMELINE_EVENT", eventId });
  };

  return (
    <section className="unit-view timeline-unit-view" aria-labelledby="unit-timeline-title">
      <SectionHeader
        section="timeline"
        trailing={(
          <div className="unit-mode-switch" aria-label="Timeline display mode">
            <button type="button" className={state.timelineMode === "events" ? "is-active" : ""} onClick={() => dispatch({ type: "SET_TIMELINE_MODE", mode: "events" })}>Events</button>
            <button type="button" className={state.timelineMode === "causes" ? "is-active" : ""} onClick={() => dispatch({ type: "SET_TIMELINE_MODE", mode: "causes" })}>Causes</button>
          </div>
        )}
      />

      {state.timelineMode === "events" ? (
        <>
          <div className="unit-timeline-rail" aria-label="American Revolution events">
            {TIMELINE_EVENTS.map((event) => (
              <button
                type="button"
                key={event.id}
                className={`unit-timeline-card ${selectedEvent.id === event.id ? "is-active" : ""}`}
                onClick={() => selectEvent(event.id)}
                aria-pressed={selectedEvent.id === event.id}
                style={{ "--timeline-card-image": `url(${TIMELINE_IMAGES[event.id]})` }}
              >
                <img src={TIMELINE_IMAGES[event.id]} alt={event.imageAlt} loading="lazy" decoding="async" />
                <span className="unit-timeline-date"><strong>{event.year}</strong><small>{event.date}</small></span>
                <div className="unit-timeline-copy"><b>{event.title}</b><p>{event.cardIntro}</p></div>
                {state.viewedTimelineEventIds.includes(event.id) && <Check size={16} weight="bold" className="unit-card-check" />}
              </button>
            ))}
          </div>

          <article className="unit-detail-card timeline-event-detail glass-surface">
            <img src={TIMELINE_IMAGES[selectedEvent.id]} alt="" aria-hidden="true" decoding="async" />
            <div className="unit-detail-copy">
              <small>{selectedEvent.year} / {selectedEvent.date}</small>
              <h2>{selectedEvent.title}</h2>
              <p>{selectedEvent.detail}</p>
              <div className="unit-action-row">
                <button type="button" className="unit-primary-button" onClick={() => toggle(selectedEvent.id)} aria-pressed={playingId === selectedEvent.id}>
                  {playingId === selectedEvent.id ? <Pause size={18} weight="fill" /> : <SpeakerHigh size={18} weight="duotone" />}
                  {playingId === selectedEvent.id ? "Pause event" : "Listen to event"}
                </button>
                {selectedEvent.id === "tea-party" && (
                  <button type="button" className="unit-secondary-button" onClick={onEnterHarbor}><Compass size={18} weight="duotone" /> Explore Harbor</button>
                )}
              </div>
            </div>
          </article>
        </>
      ) : (
        <div className="unit-causes-layout">
          <div className="unit-cause-path" aria-label="Cause and effect connections">
            {REVOLUTION_CAUSES.map((cause) => {
              const from = TIMELINE_EVENTS.find((event) => event.id === cause.fromEventId);
              const to = TIMELINE_EVENTS.find((event) => event.id === cause.toEventId);
              return (
                <button
                  type="button"
                  key={cause.id}
                  className={selectedCause.id === cause.id ? "is-active" : ""}
                  onClick={() => dispatch({ type: "SELECT_CAUSE", causeId: cause.id })}
                  style={{ "--cause-image": `url(${TIMELINE_IMAGES[to.id]})` }}
                >
                  <span><b>{from.year}</b>{from.title}</span>
                  <ArrowRight size={20} weight="bold" />
                  <span><b>{to.year}</b>{to.title}</span>
                </button>
              );
            })}
          </div>
          <article className="unit-cause-explanation glass-surface">
            <span className="unit-detail-badge"><ArrowsLeftRight size={18} /> {selectedCause.label}</span>
            <h2>{causeFrom.title} shaped {causeTo.title}</h2>
            <p>{selectedCause.detail}</p>
            <button type="button" className="unit-secondary-button" onClick={() => selectEvent(selectedCause.toEventId)}>Open {causeTo.year} event <ArrowRight size={17} /></button>
          </article>
        </div>
      )}
    </section>
  );
}

function EvidenceView({ state, dispatch, onEnterHarbor }) {
  const types = ["all", "object", "document", "newspaper", "law"];
  const visibleEvidence = state.evidenceFilter === "all"
    ? REVOLUTION_EVIDENCE
    : REVOLUTION_EVIDENCE.filter((evidence) => evidence.type === state.evidenceFilter);
  const selectedEvidence = REVOLUTION_EVIDENCE.find((evidence) => evidence.id === state.selectedEvidenceId) ?? REVOLUTION_EVIDENCE[0];
  const selectedUnlocked = !selectedEvidence.clueId || state.discoveredClueIds.includes(selectedEvidence.clueId);

  const openEvidence = (evidence) => {
    const unlocked = !evidence.clueId || state.discoveredClueIds.includes(evidence.clueId);
    if (!unlocked) {
      onEnterHarbor();
      return;
    }
    dispatch({ type: "SELECT_EVIDENCE", evidenceId: evidence.id });
  };

  const openPerson = (personId) => {
    dispatch({ type: "SELECT_PERSON", personId });
    dispatch({ type: "OPEN_SECTION", sectionId: "people" });
  };

  return (
    <section className="unit-view evidence-unit-view" aria-labelledby="unit-evidence-title">
      <SectionHeader
        section="evidence"
        trailing={<span className="unit-count-pill"><FolderOpen size={17} /> {state.reviewedEvidenceIds.length} / {REVOLUTION_EVIDENCE.length} reviewed</span>}
      />

      <div className="unit-evidence-filters" aria-label="Evidence types">
        {types.map((type) => (
          <button type="button" key={type} className={state.evidenceFilter === type ? "is-active" : ""} onClick={() => dispatch({ type: "SET_EVIDENCE_FILTER", filter: type })}>
            {type === "all" ? "All evidence" : type}
          </button>
        ))}
      </div>

      <div className="unit-evidence-layout">
        <div className="unit-evidence-grid">
          {visibleEvidence.map((evidence) => {
            const unlocked = !evidence.clueId || state.discoveredClueIds.includes(evidence.clueId);
            return (
              <button
                type="button"
                key={evidence.id}
                className={`${selectedEvidence.id === evidence.id ? "is-active" : ""} ${unlocked ? "" : "is-undiscovered"}`}
                onClick={() => openEvidence(evidence)}
              >
                <span className="unit-evidence-media" style={{ "--evidence-offset": EVIDENCE_IMAGE_OFFSETS[evidence.id] }}>
                  <img src={evidenceArchiveImage} alt="" style={{ objectPosition: EVIDENCE_IMAGE_POSITIONS[evidence.id] }} loading="lazy" decoding="async" />
                  <i>{unlocked ? <FolderOpen size={19} weight="duotone" /> : <MagnifyingGlass size={19} weight="duotone" />}</i>
                </span>
                <span><small>{unlocked ? evidence.sourceType : "UNDISCOVERED / SEARCH HARBOR"}</small><strong>{evidence.title}</strong><p>{unlocked ? evidence.summary : "Locate this material clue inside the Boston Harbor reconstruction."}</p></span>
                {state.reviewedEvidenceIds.includes(evidence.id) && <Check size={16} weight="bold" className="unit-card-check" />}
              </button>
            );
          })}
        </div>

        <article className="unit-evidence-detail glass-surface">
          {selectedUnlocked ? (
            <>
              <div className="unit-evidence-detail-media">
                <img
                  src={evidenceArchiveImage}
                  alt={`Archival still life representing ${selectedEvidence.title}`}
                  style={{ objectPosition: EVIDENCE_IMAGE_POSITIONS[selectedEvidence.id] }}
                  decoding="async"
                />
              </div>
              <span className="unit-detail-badge"><FolderOpen size={17} /> {selectedEvidence.sourceType}</span>
              <h2>{selectedEvidence.title}</h2>
              <p className="unit-detail-date">{selectedEvidence.date}</p>
              <p>{selectedEvidence.summary}</p>
              <div className="unit-source-analysis">
                <div><small>WHAT IT SHOWS</small><p>{selectedEvidence.shows}</p></div>
                <div><small>LIMITATION</small><p>{selectedEvidence.limitation}</p></div>
              </div>
              <blockquote><small>SUPPORTED CLAIM</small>{selectedEvidence.claim}</blockquote>
              <div className="unit-link-groups">
                <div><small>RELATED PEOPLE</small>{selectedEvidence.personIds.map((id) => { const person = REVOLUTION_PEOPLE.find((item) => item.id === id); return <button type="button" key={id} onClick={() => openPerson(id)}>{person.name}</button>; })}</div>
              </div>
            </>
          ) : (
            <div className="unit-undiscovered-detail">
              <MagnifyingGlass size={50} weight="duotone" />
              <small>ARCHIVE ENTRY HIDDEN</small>
              <h2>Find this clue in Boston Harbor</h2>
              <p>Inspect the gold markers in the 1773 reconstruction to unlock its source analysis.</p>
              <button type="button" className="unit-primary-button" onClick={onEnterHarbor}><MapTrifold size={18} /> Search Harbor</button>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function MemoryCheckView({ state, dispatch }) {
  const memory = state.memoryCheck;
  const currentQuestion = MEMORY_QUESTIONS[memory.currentIndex] ?? MEMORY_QUESTIONS[0];
  const selectedAnswerId = memory.answers[currentQuestion.id] ?? null;
  const answered = Boolean(selectedAnswerId);
  const currentCorrect = selectedAnswerId === currentQuestion.answerId;
  const correctCount = MEMORY_QUESTIONS.filter((question) => memory.answers[question.id] === question.answerId).length;
  const questionImage = MEMORY_BACKGROUNDS[currentQuestion.reviewSection] ?? bostonTeaPartyImage;

  const finish = () => {
    const score = Math.round((correctCount / MEMORY_QUESTIONS.length) * 100);
    dispatch({ type: "COMPLETE_MEMORY", score });
  };

  const reviewFirstMiss = () => {
    const missed = MEMORY_QUESTIONS.find((question) => memory.answers[question.id] !== question.answerId);
    dispatch({ type: "OPEN_SECTION", sectionId: missed?.reviewSection ?? "timeline" });
  };

  if (memory.status === "idle") {
    return (
      <section className="unit-view memory-unit-view" aria-labelledby="unit-memory-title">
        <SectionHeader section="memory" trailing={<span className="unit-count-pill"><ClockCounterClockwise size={17} /> About 5 minutes</span>} />
        <div className="unit-memory-intro glass-surface">
          <div className="unit-memory-art">
            <img src={evidenceArchiveImage} alt="Tea Party evidence arranged on an archive table" decoding="async" />
            <span className="unit-memory-seal"><CheckSquare size={52} weight="duotone" /></span>
          </div>
          <div>
            <small>ARCHIVE REVIEW READY</small>
            <h2>Can you reconstruct the road to revolution?</h2>
            <p>Five short questions combine chronology, people, evidence, and historical explanation. Every answer includes a review path, with no penalty for retrying.</p>
            <div className="unit-memory-dimensions">
              {["Chronology", "Perspectives", "Evidence", "Cause & Effect"].map((label) => <span key={label}><CheckCircle size={16} weight="duotone" />{label}</span>)}
            </div>
            <button type="button" className="unit-primary-button" onClick={() => dispatch({ type: "START_MEMORY" })}>Begin Memory Check <ArrowRight size={18} /></button>
          </div>
        </div>
      </section>
    );
  }

  if (memory.status === "complete") {
    const passed = memory.score >= 80;
    return (
      <section className="unit-view memory-unit-view" aria-labelledby="unit-memory-title">
        <SectionHeader section="memory" trailing={<span className="unit-count-pill"><CheckCircle size={17} /> Best {memory.bestScore}%</span>} />
        <div className="unit-memory-result glass-surface">
          <div className="unit-memory-art is-result">
            <img src={bostonTeaPartyImage} alt="Illustrated Boston Tea Party scene" decoding="async" />
            <div className={`unit-score-ring ${passed ? "is-mastered" : ""}`}><strong>{memory.score}%</strong><small>THIS CHECK</small></div>
          </div>
          <div>
            <small>MEMORY CHECK COMPLETE</small>
            <h2>{passed ? "Connections made." : "Keep exploring the connections."}</h2>
            <p>{passed ? "You answered at least four of these five questions correctly. This practice result is one part of your learning journey, not a measure of overall mastery." : "Review the missed connections, then try again when the evidence feels clearer."}</p>
            <div className="unit-result-breakdown">
              {MEMORY_QUESTIONS.map((question) => (
                <span key={question.id} className={memory.answers[question.id] === question.answerId ? "is-correct" : "is-missed"}>
                  {memory.answers[question.id] === question.answerId ? <Check size={15} weight="bold" /> : <ArrowRight size={15} />}{question.dimension}
                </span>
              ))}
            </div>
            <div className="unit-action-row">
              {memory.score < 100 && <button type="button" className="unit-secondary-button" onClick={reviewFirstMiss}>Review missed concepts</button>}
              <button type="button" className="unit-primary-button" onClick={() => dispatch({ type: "RESET_MEMORY" })}><ClockCounterClockwise size={18} /> Try again</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="unit-view memory-unit-view" aria-labelledby="unit-memory-title">
      <SectionHeader section="memory" trailing={<span className="unit-count-pill">Question {memory.currentIndex + 1} / {MEMORY_QUESTIONS.length}</span>} />
      <div className="unit-question-shell">
        <div className="unit-question-progress" aria-hidden="true"><span style={{ width: `${((memory.currentIndex + 1) / MEMORY_QUESTIONS.length) * 100}%` }} /></div>
        <article className="unit-question-card glass-surface" style={{ "--question-image": `url(${questionImage})` }}>
          <small>{currentQuestion.dimension}</small>
          <h2>{currentQuestion.prompt}</h2>
          <div className="unit-answer-list">
            {currentQuestion.options.map((option, index) => {
              const selected = selectedAnswerId === option.id;
              const correct = answered && option.id === currentQuestion.answerId;
              return (
                <button
                  type="button"
                  key={option.id}
                  className={`${selected ? "is-selected" : ""} ${correct ? "is-correct" : ""}`}
                  onClick={() => dispatch({ type: "ANSWER_MEMORY", questionId: currentQuestion.id, answerId: option.id })}
                  disabled={answered}
                >
                  <span>{String.fromCharCode(65 + index)}</span>{option.label}{correct && <Check size={18} weight="bold" />}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className={`unit-answer-feedback ${currentCorrect ? "is-correct" : "is-review"}`} role="status">
              <strong>{currentCorrect ? "Connection confirmed" : "Review this connection"}</strong>
              <p>{currentQuestion.explanation}</p>
              <div className="unit-action-row">
                {!currentCorrect && <button type="button" className="unit-secondary-button" onClick={() => dispatch({ type: "OPEN_SECTION", sectionId: currentQuestion.reviewSection })}>Open {currentQuestion.reviewSection}</button>}
                <button
                  type="button"
                  className="unit-primary-button"
                  onClick={memory.currentIndex === MEMORY_QUESTIONS.length - 1 ? finish : () => dispatch({ type: "NEXT_MEMORY" })}
                >
                  {memory.currentIndex === MEMORY_QUESTIONS.length - 1 ? "View results" : "Next question"}<ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export function RevolutionUnitContent({ section, state, dispatch, onEnterHarbor }) {
  if (section === "timeline") return <TimelineView state={state} dispatch={dispatch} onEnterHarbor={onEnterHarbor} />;
  if (section === "people") return <PeopleView state={state} dispatch={dispatch} />;
  if (section === "evidence") return <EvidenceView state={state} dispatch={dispatch} onEnterHarbor={onEnterHarbor} />;
  if (section === "memory") return <MemoryCheckView state={state} dispatch={dispatch} />;
  return null;
}
