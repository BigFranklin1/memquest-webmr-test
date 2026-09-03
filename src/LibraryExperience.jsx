import { useEffect } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarBlank,
  ChartLineUp,
  CheckSquare,
  Compass,
  FolderOpen,
  Headset,
  LockSimple,
  MapTrifold,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react";
import harborPreview from "./assets/timeline/boston-tea-party-1773.webp";
import { HarborScene } from "./HarborScene.jsx";
import { LIBRARY_ERAS, REVOLUTION_SECTIONS } from "./libraryData.js";
import { calculateUnitProgress, LIBRARY_STAGES } from "./libraryState.js";
import { RevolutionUnitContent } from "./RevolutionUnit.jsx";

const SECTION_ICONS = {
  explore: Compass,
  timeline: ChartLineUp,
  people: UsersThree,
  evidence: FolderOpen,
  memory: CheckSquare,
};

function EraCard({ era, onOpen, onUnavailable }) {
  const active = era.status === "active";
  const locked = era.status === "locked";
  return (
    <article
      className={`library-era-card ${active ? "is-active" : ""} ${locked ? "is-locked" : ""}`}
      onClick={active ? onOpen : undefined}
    >
      <div className="library-era-title-row">
        <h2>{era.title}</h2>
        {active && <span className="library-era-orbit"><Compass size={24} weight="duotone" /></span>}
        {locked && <LockSimple size={18} weight="fill" aria-label="Locked" />}
      </div>
      <p>{era.dates}</p>
      {active && <small>{era.description}</small>}
      {active && <div className="library-era-progress">
        <div><span>Exploration</span><strong>{era.progress}%</strong></div>
        <div className="library-card-track"><span style={{ width: `${era.progress}%` }} /></div>
      </div>}
      {active ? (
        <div className="library-era-actions">
          <button type="button" onClick={onOpen}><Headset size={23} weight="duotone" /> Explore unit</button>
          <button type="button" className="library-icon-button" onClick={onOpen} aria-label="Open American Revolution overview"><Compass size={22} /></button>
        </div>
      ) : (
        <button type="button" className="library-era-preview" onClick={onUnavailable} disabled>
          Coming soon
        </button>
      )}
    </article>
  );
}

function LibraryHome({ dispatch, onUnavailable, progress, onProfile }) {
  return (
    <section className="library-page library-home" aria-labelledby="library-home-title">
      <header className="library-page-header">
        <div className="library-title-pill"><BookOpen size={23} weight="duotone" /><span>Library</span></div>
        <button type="button" aria-label="Open learning progress" onClick={onProfile}><Sparkle size={20} weight="duotone" /></button>
      </header>

      <div className="library-home-content">
        <header className="library-hero glass-surface">
          <span className="library-hero-kicker"><Sparkle size={18} weight="fill" /> Curated memory archive</span>
          <h1 id="library-home-title">What do you want to explore today?</h1>
          <p>Select a historical era to begin your journey.</p>
        </header>

        <div className="library-era-grid">
          {LIBRARY_ERAS.map((era) => (
            <EraCard
              key={era.id}
              era={era.id === "american-revolution" ? { ...era, progress } : era}
              onOpen={() => dispatch({ type: "OPEN_ERA", eraId: era.id })}
              onUnavailable={() => onUnavailable(`${era.title} is coming in a future archive update`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function UnitNavigation({ activeSection, dispatch, className = "" }) {
  return (
    <nav className={className} aria-label="American Revolution unit">
      {REVOLUTION_SECTIONS.map((section) => {
        const Icon = SECTION_ICONS[section.id];
        return (
          <button
            type="button"
            className={section.id === activeSection ? "is-active" : ""}
            key={section.id}
            onClick={() => dispatch({ type: "OPEN_SECTION", sectionId: section.id })}
            aria-current={section.id === activeSection ? "page" : undefined}
          >
            <Icon size={21} weight="duotone" /> <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function RevolutionOverview({ state, dispatch }) {
  const activeSection = state.activeSection ?? "explore";
  const progress = calculateUnitProgress(state);
  const remainingClues = Math.max(0, 4 - state.discoveredClueIds.length);

  return (
    <section className="revolution-overview" aria-labelledby="revolution-title">
      <aside className="revolution-sidebar">
        <div className="revolution-brand"><span><Sparkle size={19} weight="fill" /></span><strong>MemQuest</strong></div>
        <button type="button" className="revolution-back" onClick={() => dispatch({ type: "BACK_HOME" })}><ArrowLeft size={18} /> All eras</button>
        <UnitNavigation activeSection={activeSection} dispatch={dispatch} />
        <div className="revolution-sidebar-progress"><span>UNIT EXPLORATION: {progress}%</span><div><i style={{ width: `${progress}%` }} /></div></div>
      </aside>

      <main className={`revolution-stage ${activeSection !== "explore" ? "is-content-section" : ""}`} style={{ "--overview-image": `url(${harborPreview})` }}>
        <header className="revolution-mobile-header">
          <button type="button" onClick={() => dispatch({ type: "BACK_HOME" })}><ArrowLeft size={18} /> Library</button>
          <span>{REVOLUTION_SECTIONS.find((section) => section.id === activeSection)?.label ?? "American Revolution"}</span>
          <Bell size={19} />
        </header>
        <UnitNavigation activeSection={activeSection} dispatch={dispatch} className="revolution-mobile-tabs" />

        {activeSection === "explore" ? (
          <>
            <div className="revolution-stage-scrim" aria-hidden="true" />
            <header className="revolution-title-card glass-surface">
              <div className="revolution-title-heading">
                <span><MapTrifold size={26} weight="duotone" /></span>
                <div><small>AMERICAN REVOLUTION</small><h1 id="revolution-title">The road to independence</h1></div>
              </div>
              <div className="revolution-era-meta"><small>UNIT WINDOW</small><strong>1765 - 1783</strong></div>
            </header>

            <button type="button" className="revolution-explore-card glass-surface" onClick={() => dispatch({ type: "ENTER_HARBOR" })}>
              <span className="revolution-location-dot" aria-hidden="true" />
              <small>BOSTON HARBOR / DECEMBER 1773</small>
              <strong>Explore Boston Harbor</strong>
              <p>Investigate the wharf, inspect interactive evidence, and discover what drove the colonies toward revolution.</p>
              <span className="revolution-enter"><Headset size={22} weight="duotone" /> Begin investigation</span>
            </button>

            <div className="revolution-clues glass-surface">
              <span className="revolution-clue-ring">{state.discoveredClueIds.length}/4</span>
              <div><strong>Clues Found</strong><small>{remainingClues === 0 ? "Harbor archive complete" : `${remainingClues} harbor ${remainingClues === 1 ? "record" : "records"} remain`}</small></div>
            </div>

            <div className="revolution-actions">
              <button type="button" onClick={() => dispatch({ type: "OPEN_SECTION", sectionId: "timeline" })}><CalendarBlank size={21} /> Timeline</button>
              <button type="button" onClick={() => dispatch({ type: "OPEN_SECTION", sectionId: "evidence" })}><FolderOpen size={21} /> Evidence</button>
            </div>
          </>
        ) : (
          <RevolutionUnitContent
            section={activeSection}
            state={state}
            dispatch={dispatch}
            onEnterHarbor={() => dispatch({ type: "ENTER_HARBOR" })}
          />
        )}
      </main>
    </section>
  );
}

export function LibraryExperience({ state, dispatch, onUnavailable, onProfile }) {
  useEffect(() => {
    if (state.stage !== LIBRARY_STAGES.OVERVIEW) return;
    if (state.activeSection === "timeline") dispatch({ type: "SELECT_TIMELINE_EVENT", eventId: state.selectedTimelineEventId });
    if (state.activeSection === "people") dispatch({ type: "SELECT_PERSON", personId: state.selectedPersonId });
    if (state.activeSection === "evidence") dispatch({ type: "SELECT_EVIDENCE", evidenceId: state.selectedEvidenceId });
  }, [state.stage, state.activeSection, state.selectedTimelineEventId, state.selectedPersonId, state.selectedEvidenceId, dispatch]);
  const progress = calculateUnitProgress(state);
  if (state.stage === LIBRARY_STAGES.HARBOR) {
    return (
      <HarborScene
        discoveredClueIds={state.discoveredClueIds}
        selectedClueId={state.selectedClueId}
        onDiscover={(clueId) => dispatch({ type: "DISCOVER_CLUE", clueId })}
        onCloseClue={() => dispatch({ type: "CLOSE_CLUE" })}
        onExplain={(clueId) => dispatch({ type: "EXPLAIN_CLUE", clueId })}
        onExit={() => dispatch({ type: "EXIT_HARBOR" })}
      />
    );
  }
  if (state.stage === LIBRARY_STAGES.OVERVIEW) {
    return <RevolutionOverview state={state} dispatch={dispatch} />;
  }
  return <LibraryHome dispatch={dispatch} onUnavailable={onUnavailable} progress={progress} onProfile={onProfile} />;
}
