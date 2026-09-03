import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, CheckCircle, Clock, Compass, Flag, Medal, Sparkle, Target, TrendUp, WarningCircle } from "@phosphor-icons/react";
import { CHALLENGES, LEARNING_CATALOG, LEARNING_SKILLS, REVOLUTION_UNIT_ID, getChallenge, getUnit } from "./learningData.js";
import { challengeStatus, getRecommendation, getUnitSummary, harborSteps, skillResults, unitLibrary } from "./learningState.js";
import { HARBOR_CLUES } from "./libraryData.js";
import { TIMELINE_EVENTS } from "./scanData.js";
import harborImage from "./assets/timeline/boston-tea-party-1773.webp";
import timelineImage from "./assets/timeline/continental-congress-1774.webp";
import peopleImage from "./assets/archive/revolution-people-triptych.jpg";
import evidenceImage from "./assets/archive/tea-party-evidence-table.jpg";
import "./global.css";

const IMAGES = { harbor: harborImage, timeline: timelineImage, people: peopleImage, evidence: evidenceImage };
const STATUS_LABELS = { "not-started": "Not started", "in-progress": "In progress", complete: "Completed" };
const dateLabel = date => new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" });

function ActionButton({ children, onClick, secondary = false, ...props }) {
  return <button type="button" className={`journey-button ${secondary ? "is-secondary" : ""}`} onClick={onClick} {...props}>{children}</button>;
}

function ChallengeCard({ challenge, state, onSelect }) {
  const status = challengeStatus(state, challenge.id);
  return <button type="button" className="challenge-card" onClick={() => onSelect(challenge.id)}>
    <div className={`challenge-card-image is-${challenge.image}`} style={{ backgroundImage: `linear-gradient(180deg, transparent 15%, #111c2e 100%), url(${IMAGES[challenge.image]})` }}><span className={`journey-status status-${status}`}>{STATUS_LABELS[status]}</span></div>
    <div className="challenge-card-copy"><small>{getUnit(challenge.unitId).title}</small><h3>{challenge.title}</h3><p>{challenge.description}</p><div><span><Clock size={15} />{challenge.duration}</span><ArrowRight size={21} /></div></div>
  </button>;
}

function ChallengeHome({ state, dispatch }) {
  const [era, setEra] = useState("all");
  const [skill, setSkill] = useState("all");
  const [status, setStatus] = useState("all");
  const recommended = getRecommendation(state);
  const select = id => dispatch({ type: "SELECT_CHALLENGE", id });
  const visible = CHALLENGES.filter(c => (era === "all" || c.unitId === era) && (skill === "all" || c.skillId === skill || c.questions?.some(q => q.skillId === skill)) && (status === "all" || challengeStatus(state, c.id) === status));
  return <>
    <header className="journey-intro"><span className="journey-eyebrow">YOUR NEXT DISCOVERY</span><h1 tabIndex={-1}>Put your knowledge{" "}<br />to work.</h1><p>Follow your curiosity. Explore, connect, and make a case for history.</p></header>
    <section className="challenge-feature" style={{ "--feature-image": `url(${IMAGES[recommended.challenge.image]})` }} aria-label="Recommended challenge">
      <div className="challenge-feature-copy"><span className="journey-eyebrow">{recommended.continuing ? "CONTINUE YOUR CHALLENGE" : "RECOMMENDED FOR YOU"}</span><h2>{recommended.challenge.title}</h2><p>{recommended.reason}</p><small>{getUnit(recommended.challenge.unitId).title} · {recommended.challenge.duration}</small><ActionButton onClick={() => { dispatch({ type: "START_CHALLENGE", id: recommended.challenge.id }); select(recommended.challenge.id); }}>{recommended.continuing ? "Continue challenge" : "Start challenge"}<ArrowRight size={18} /></ActionButton></div>
      <span className="challenge-feature-caption">Historical interpretation</span>
    </section>
    <section className="challenge-catalog" aria-labelledby="all-challenges-title">
      <div className="journey-section-title"><div><h2 id="all-challenges-title">Find your next challenge</h2><p>One learning journey. Many ways to explore.</p></div><span>{visible.length} available</span></div>
      <div className="journey-filters">
        <label>Era<select value={era} onChange={e => setEra(e.target.value)}><option value="all">All eras</option>{LEARNING_CATALOG.map(u => <option key={u.id} value={u.id}>{u.title}{u.status !== "available" ? " · Coming soon" : ""}</option>)}</select></label>
        <label>Skill<select value={skill} onChange={e => setSkill(e.target.value)}><option value="all">All skills</option><option value="exploration">Exploration</option>{LEARNING_SKILLS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      </div>
      <div className="challenge-grid">{visible.map(c => <ChallengeCard key={c.id} challenge={c} state={state} onSelect={select} />)}</div>
      {!visible.length && <div className="journey-empty"><Compass size={28} /><h3>{era !== "all" && getUnit(era)?.status !== "available" ? "This era is still being prepared" : "No challenges match these filters"}</h3><p>Only published challenges are included in your progress.</p><ActionButton secondary onClick={() => { setEra("all"); setSkill("all"); setStatus("all"); }}>Show available challenges</ActionButton></div>}
    </section>
    <aside className="journey-future"><BookOpen size={27} /><div><h3>Across eras, beyond memorization.</h3><p>Cross-era challenges will arrive as more archives open. Ancient China, the Silk Road, and World War II are coming soon.</p></div><span>IN DEVELOPMENT</span></aside>
  </>;
}

function ChallengeDetail({ challenge: c, state, dispatch, onOpenContent, onProgress }) {
  const draft = state.challenges[c.id];
  const status = draft?.status ?? "not-started";
  const completed = status === "complete";
  const lastAttempt = state.attempts.filter(a => a.source === c.id).at(-1);
  const resultSummary = c.kind === "exploration" ? "Four clues found, with their historical context explored." : c.kind === "order" ? `${TIMELINE_EVENTS.filter((e, i) => draft?.order?.[i] === e.id).length} of 4 events correctly placed. The sequence counts as one practice question.` : `${draft?.lastResult?.correct ?? lastAttempt?.results.filter(r => r.correct).length ?? 0} of ${draft?.lastResult?.count ?? lastAttempt?.results.length ?? 0} correct. Review your explanations below.`;
  const steps = harborSteps(state);
  const allReady = c.kind === "exploration" ? steps.every(s => s.found && s.understood) : c.kind === "order" || c.questions.every(q => draft?.answers[q.id]);
  const review = target => onOpenContent({ unitId: c.unitId, ...target }, "challenges");
  const start = retry => dispatch({ type: "START_CHALLENGE", id: c.id, retry });
  return <>
    <button className="journey-back" type="button" onClick={() => dispatch({ type: "SELECT_CHALLENGE", id: null })}><ArrowLeft size={18} /> All challenges</button>
    <header className="challenge-detail-header" style={{ "--feature-image": `url(${IMAGES[c.image]})` }}><div><span className="journey-eyebrow">{getUnit(c.unitId).title} · {c.duration}</span><h1>{c.title}</h1><p>{c.description}</p><span className={`journey-status status-${status}`}>{STATUS_LABELS[status]}</span></div></header>
    {status === "not-started" ? <section className="journey-panel challenge-start"><Target size={32} /><h2>{c.kind === "exploration" ? "Look closely. Find the connections." : "A little practice, a deeper understanding."}</h2><p>{c.kind === "exploration" ? "Find all four harbor objects and open “Why it matters” on each object’s card. Return here to complete your investigation." : "Your first answer is recorded for each question. Review the explanation, then try again whenever you like. Repeats never add duplicate achievements."}</p><ActionButton onClick={() => start(false)}>Begin challenge<ArrowRight size={18} /></ActionButton></section> : <>
      {completed && <section className="challenge-result" role="status"><CheckCircle size={36} weight="duotone" /><div><h2>{c.kind === "exploration" ? "Investigation complete" : "Practice complete"}</h2><p>{resultSummary}</p></div><ActionButton onClick={onProgress}>View my progress<ArrowRight size={17} /></ActionButton></section>}
      {c.kind === "exploration" ? <section className="journey-panel harbor-checklist"><div className="journey-section-title"><h2>Your field notes</h2><strong>{steps.filter(s => s.found && s.understood).length} / 4</strong></div><p>Tap objects in the 3D harbor, then read “Why it matters”. Opening the scene alone does not count.</p><div className="harbor-check-grid">{steps.map(s => <div key={s.id}><span className={s.found && s.understood ? "is-done" : ""}><CheckCircle size={25} /></span><div><h3>{HARBOR_CLUES.find(c => c.id === s.id).shortLabel}</h3><small>{!s.found ? "Not discovered" : s.understood ? "Found · Context explored" : "Found · Read why it matters"}</small></div></div>)}</div><ActionButton onClick={() => review({ section: "harbor" })}><Compass size={18} />{steps.some(s => s.found) ? "Return to the harbor" : "Enter Boston Harbor"}</ActionButton></section> : c.kind === "order" ? <section className="journey-panel order-challenge"><h2>From earliest to latest</h2><p>Use the arrows to move each event. Dates are revealed after you check your sequence.</p><ol>{(draft.order ?? c.initialOrder).map((id, i) => { const e = TIMELINE_EVENTS.find(e => e.id === id); return <li key={id}><span className="order-index">{i + 1}</span><div><strong>{e.title}</strong>{completed && <small>{e.year} · {TIMELINE_EVENTS[i].id === id ? "Correct position" : `Correct position: ${TIMELINE_EVENTS.findIndex(e => e.id === id) + 1}`}</small>}</div><div className="order-controls"><button type="button" aria-label={`Move ${e.title} earlier`} disabled={completed || i === 0} onClick={() => dispatch({ type: "MOVE_EVENT", id: c.id, eventId: id, direction: -1 })}><ArrowUp size={19} /></button><button type="button" aria-label={`Move ${e.title} later`} disabled={completed || i === 3} onClick={() => dispatch({ type: "MOVE_EVENT", id: c.id, eventId: id, direction: 1 })}><ArrowDown size={19} /></button></div></li>; })}</ol>{completed && <div className="journey-feedback"><h3>The path through the archive</h3><p>{TIMELINE_EVENTS.map(e => `${e.year}: ${e.title}`).join(" → ")}</p></div>}<ActionButton secondary onClick={() => review({ section: "timeline" })}>Review the timeline<BookOpen size={18} /></ActionButton></section> : <div className="challenge-questions">{c.questions.map((q, index) => {
        const answer = draft.answers[q.id];
        return <section className="journey-panel challenge-question" key={q.id} aria-labelledby={`question-${q.id}`}><span className="journey-eyebrow">QUESTION {index + 1} / {c.questions.length}</span><h2 id={`question-${q.id}`}>{q.prompt}</h2><div className="challenge-options">{q.options.map(o => <button type="button" key={o.id} disabled={Boolean(answer) || completed} className={answer === o.id ? o.id === q.answerId ? "is-correct" : "is-incorrect" : ""} aria-pressed={answer === o.id} onClick={() => dispatch({ type: "ANSWER_CHALLENGE", id: c.id, questionId: q.id, answerId: o.id })}><span>{o.label}</span>{answer === o.id && (o.id === q.answerId ? <Check size={20} /> : <WarningCircle size={20} />)}</button>)}</div>{answer && <div className="journey-feedback" role="status"><strong>{answer === q.answerId ? "That’s right." : "A useful distinction."}</strong><p>{q.explanation}</p><button type="button" className="journey-text-link" onClick={() => review(q.target)}>Explore the source<ArrowRight size={16} /></button></div>}</section>;
      })}</div>}
      <footer className="challenge-submit">{completed ? <ActionButton secondary onClick={() => start(true)}>Practice again</ActionButton> : <><p>{allReady ? "Ready to record this challenge." : c.kind === "exploration" ? "Explore all four clues and their context to finish." : "Answer every question to finish."}</p><ActionButton disabled={!allReady} onClick={() => dispatch({ type: "SUBMIT_CHALLENGE", id: c.id })}>{c.kind === "order" ? "Check my sequence" : "Complete challenge"}<CheckCircle size={18} /></ActionButton></>}</footer>
    </>}
  </>;
}

function ProgressView({ state, dispatch, onOpenContent, onChallenge }) {
  const summaries = LEARNING_CATALOG.filter(u => u.status === "available").map(u => getUnitSummary(state, u.id));
  const skills = skillResults(state);
  const missed = skills.reduce((sum, s) => sum + s.missed.length, 0);
  const completed = Object.values(state.challenges).filter(c => c.everCompleted).length;
  const [showActivity, setShowActivity] = useState(false);
  const open = (target, unitId = REVOLUTION_UNIT_ID) => onOpenContent({ unitId, ...target }, "progress");
  const achievements = [
    { title: "First steps", detail: "Explore your first historical record", earned: summaries.some(s => s.done > 0), Icon: Compass },
    { title: "Case closed", detail: "Complete your first challenge", earned: completed > 0, Icon: Medal },
    { title: "Harbor investigator", detail: "Finish the four-clue investigation", earned: state.challenges["harbor-investigation"]?.everCompleted, Icon: Flag },
    { title: "Archive explorer", detail: "Finish a unit’s exploration with a Memory Check score of at least 80%", earned: summaries.some(s => s.complete), Icon: BookOpen },
  ];
  return <>
    <header className="journey-intro"><span className="journey-eyebrow">YOUR PERSONAL ARCHIVE</span><h1 tabIndex={-1}>Your journey{" "}<br />through history.</h1><p>See where you’ve been—and what you’re ready to discover next.</p></header>
    <section className="journey-stats" aria-label="Learning overview">{[{ value: summaries.filter(s => s.started).length, label: "Units explored" }, { value: summaries.filter(s => s.complete).length, label: "Units completed" }, { value: completed, label: "Challenges completed" }, { value: missed, label: "Questions to revisit" }].map(s => <div key={s.label}><strong>{s.value.toString().padStart(2, "0")}</strong><span>{s.label}</span></div>)}</section>
    {state.legacyRecord && <details className="journey-import"><summary>Earlier prototype progress is available to review</summary><p>The previous save is untouched. It may contain pre-filled demo discoveries. New progress starts without those defaults. Import only if you want those exploration records included; old scores will not count toward skill results.</p><p>Earlier record: {state.legacyRecord.viewedTimelineEventIds.length} events, {state.legacyRecord.viewedPersonIds.length} people, {state.legacyRecord.reviewedEvidenceIds.length} sources, {state.legacyRecord.discoveredClueIds.length} clues.</p><ActionButton secondary onClick={() => dispatch({ type: "IMPORT_LEGACY" })}>Include earlier exploration</ActionButton></details>}
    {state.legacyImported && <p className="journey-storage-note">Exploration includes records you imported from the earlier prototype. Skills use new practice results only.</p>}
    <div className="progress-columns"><section aria-labelledby="my-eras-title"><div className="journey-section-title"><div><h2 id="my-eras-title">Your historical journey</h2><p>Exploration and understanding, shown separately.</p></div></div>
      {summaries.map(s => <article className="progress-unit journey-panel" key={s.unit.id}><div className="progress-unit-cover" style={{ backgroundImage: `linear-gradient(180deg, #0b162322, #111c2e), url(${harborImage})` }}><span className="journey-status">{s.complete ? "Completed" : s.started ? "In progress" : "Not started"}</span><h3>{s.unit.title}</h3><small>{s.unit.dates}</small></div><div className="progress-unit-body"><div className="progress-unit-metrics"><div><small>EXPLORATION</small><strong>{s.done} / {s.total}</strong><span>records explored</span></div><div><small>LATEST MEMORY CHECK</small><strong>{s.score === null ? "—" : `${s.score}%`}</strong><span>{s.score === null ? "Not taken yet" : "Practice result, not a mastery rating"}</span></div></div><div className="journey-track" role="progressbar" aria-label={`${s.unit.title} exploration`} aria-valuenow={s.done} aria-valuemin={0} aria-valuemax={s.total}><span style={{ width: `${s.exploration}%` }} /></div><details><summary>View unit breakdown</summary><div className="progress-breakdown">{s.counts.map(c => <button type="button" key={c.label} onClick={() => open({ section: c.section }, s.unit.id)}><span>{c.label}</span><strong>{c.done} / {c.total}</strong><ArrowRight size={16} /></button>)}<button type="button" onClick={() => open({ section: "memory" }, s.unit.id)}>Memory Check<ArrowRight size={16} /></button></div><p className="journey-storage-note">Complete all {s.total} records and reach 80% on a Memory Check to earn unit completion. Once earned, completion is kept; your latest score is shown separately.</p></details><ActionButton onClick={() => open({ section: unitLibrary(state, s.unit.id).activeSection }, s.unit.id)}>{s.started ? "Continue learning" : "Explore this era"}<ArrowRight size={18} /></ActionButton></div></article>)}
      <div className="future-era-list">{LEARNING_CATALOG.filter(u => u.status !== "available").map(u => <div key={u.id}><span>{u.title}</span><small>Coming soon</small></div>)}</div><p className="journey-storage-note">Unreleased eras are not included in your totals.</p>
    </section><section className="journey-panel skill-panel" aria-labelledby="skill-panel-title"><div className="journey-section-title"><div><h2 id="skill-panel-title">Think like a historian</h2><p>Built from practice across your learning journey.</p></div><TrendUp size={26} /></div>{skills.map(s => <article className="skill-row" key={s.id}><div><h3>{s.title}</h3><p>{s.description}</p></div><div className="skill-readout"><span>{s.percent === null ? "Not enough practice yet" : `${s.percent}% correct`}</span><small>{s.count ? `${s.correct} / ${s.count} distinct questions correct` : "No practice recorded"}</small></div><button type="button" className="journey-text-link" onClick={() => onChallenge(s.challengeId)}>Practice<ArrowRight size={16} /></button></article>)}<p className="journey-storage-note">Across the latest 100 practice sessions, each question counts once using its latest attempt. Percentages need 3 distinct questions. Exploring content alone does not raise these results.</p></section></div>
    <section aria-labelledby="achievements-title"><div className="journey-section-title"><h2 id="achievements-title">Milestones, not a leaderboard.</h2><span>{achievements.filter(a => a.earned).length} / {achievements.length} earned</span></div><div className="achievement-grid">{achievements.map(({ title, detail, earned, Icon }) => <article key={title} className={`journey-panel achievement ${earned ? "is-earned" : ""}`}><Icon size={30} weight="duotone" /><small>{earned ? "EARNED" : "NOT YET EARNED"}</small><h3>{title}</h3><p>{detail}</p></article>)}</div></section>
    <section className="journey-panel activity-panel" aria-labelledby="activity-title"><div className="journey-section-title"><h2 id="activity-title">Recent discoveries</h2><Clock size={23} /></div>{!state.activity.length ? <p>Your first discovery belongs here. Open an era or begin a challenge to get started.</p> : <ol>{state.activity.slice(0, showActivity ? 80 : 5).map((a, i) => <li key={`${a.at}-${i}`}><span className="activity-mark"><Check size={16} /></span><button type="button" onClick={() => a.target.challengeId ? onChallenge(a.target.challengeId) : onOpenContent({ unitId: a.unitId, ...a.target }, "progress")}><strong>{a.label}</strong><small>{getUnit(a.unitId).title} · {dateLabel(a.at)}</small></button><ArrowRight size={17} /></li>)}</ol>}{state.activity.length > 5 && <button type="button" className="journey-text-link" onClick={() => setShowActivity(!showActivity)}>{showActivity ? "Show less" : "Show more activity"}</button>}</section>
  </>;
}

export function GlobalWorkspace({ tab, state, dispatch, onOpenContent, onChangeTab, storageAvailable }) {
  const rootRef = useRef(null);
  const selected = tab === "challenges" ? getChallenge(state.selectedChallengeId) : null;
  useEffect(() => { rootRef.current?.scrollTo({ top: 0 }); rootRef.current?.querySelector("h1")?.focus({ preventScroll: true }); }, [tab, selected?.id]);
  const openChallenge = id => { dispatch({ type: "SELECT_CHALLENGE", id }); onChangeTab("challenges"); };
  return <section className="global-workspace" ref={rootRef} aria-label={`${tab === "challenges" ? "Challenges" : "Progress"} across all eras`}>
    <header className="journey-topbar"><div className="journey-brand"><span><Sparkle size={23} weight="fill" /></span><strong>MemQuest</strong></div><span className="journey-global-label">{tab === "challenges" ? <Medal size={18} /> : <TrendUp size={18} />}{tab === "challenges" ? "Challenges" : "Progress"}<small>ALL ERAS</small></span><span className="journey-save-status">{storageAvailable ? "Saved on this device" : "Session only · storage unavailable"}</span></header>
    <div className="journey-content">{tab === "progress" ? <ProgressView state={state} dispatch={dispatch} onOpenContent={onOpenContent} onChallenge={openChallenge} /> : selected ? <ChallengeDetail challenge={selected} state={state} dispatch={dispatch} onOpenContent={onOpenContent} onProgress={() => onChangeTab("progress")} /> : <ChallengeHome state={state} dispatch={dispatch} />}</div>
  </section>;
}
