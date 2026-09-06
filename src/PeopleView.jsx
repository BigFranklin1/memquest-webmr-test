import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowsIn, ArrowsOut, Books, Check, FileText, Graph, Megaphone, Scroll, UsersThree, Bank } from "@phosphor-icons/react";
import { REVOLUTION_EVIDENCE, REVOLUTION_PEOPLE } from "./revolutionData.js";
import { TIMELINE_EVENTS } from "./scanData.js";
import { PEOPLE_PROFILES } from "./peopleProfiles.js";
import johnHero from "./assets/archive/john-adams-people-hero.png";
import samuelHero from "./assets/archive/samuel-adams-people-hero.png";
import peopleTriptych from "./assets/archive/revolution-people-triptych.jpg";
import "./people.css";

const ICONS = { people: UsersThree, print: Megaphone, document: FileText, institution: Bank };
const PORTRAITS = {
  "john-adams": { src: johnHero, position: "100% 30%" },
  "samuel-adams": { src: samuelHero, position: "100% 30%" },
  "thomas-hutchinson": { src: peopleTriptych, offset: "0%" },
  "george-hewes": { src: peopleTriptych, offset: "-100%" },
  "john-hancock": { src: peopleTriptych, offset: "-200%" },
};

function Portrait({ personId, className = "", descriptive = false }) {
  const portrait = PORTRAITS[personId];
  const person = REVOLUTION_PEOPLE.find((entry) => entry.id === personId);
  return <span className={`people-portrait ${portrait.offset !== undefined ? "is-triptych" : ""} ${className}`} style={{ "--people-portrait-offset": portrait.offset }}>
    <img src={portrait.src} alt={descriptive ? `Illustrated portrait of ${person.name}` : ""} style={{ objectPosition: portrait.position }} decoding="async" />
  </span>;
}

function RelationshipMap({ person, profile, onSelectPerson }) {
  const panelRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const selected = profile.connections.find((entry) => entry.id === selectedId);
  const resizeMap = () => {
    setExpanded(!expanded);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  };
  return <section ref={panelRef} className={`people-panel people-network ${expanded ? "is-expanded" : ""}`} aria-labelledby="people-network-title">
    <header className="people-panel-heading">
      <h2 id="people-network-title"><Graph size={24} weight="duotone" /> Network</h2>
      <button type="button" className="people-map-expand" aria-expanded={expanded} onClick={resizeMap}>
        {expanded ? <ArrowsIn size={17} /> : <ArrowsOut size={17} />}<span>{expanded ? "Compact map" : "Explore relationships"}</span>
      </button>
    </header>
    <div className="people-network-map" aria-label={`Relationship map for ${person.name}`}>
      <div className="people-network-center"><Portrait personId={person.id} /><strong>{profile.shortName}</strong><small>SELECTED PERSPECTIVE</small></div>
      {profile.connections.map((connection, index) => {
        const Icon = ICONS[connection.icon] ?? UsersThree;
        return <button type="button" key={connection.id} className={`people-network-node node-${index} is-${connection.kind} ${selectedId === connection.id ? "is-selected" : ""}`} onClick={() => setSelectedId(connection.id)} aria-pressed={selectedId === connection.id} aria-label={`${connection.label}: ${connection.caption}`}>
          {connection.personId ? <Portrait personId={connection.personId} /> : <span className="people-node-symbol"><Icon size={25} weight="duotone" /></span>}
          <strong>{connection.label}</strong><small>{connection.caption}</small>
        </button>;
      })}
    </div>
    <div className={`people-relationship-detail ${selected ? "has-selection" : ""}`} aria-live="polite">
      {selected ? <><span className={`people-relationship-type is-${selected.kind}`}>{selected.caption}</span><h3>{selected.label}</h3><p>{selected.detail}</p>{selected.personId && <button type="button" className="people-text-button" onClick={() => onSelectPerson(selected.personId)}>View profile <ArrowRight size={16} /></button>}</> : <><Graph size={23} weight="duotone" /><p>Select a person or institution to discover the connection.</p></>}
    </div>
    <div className="people-network-legend"><span>Ally / shared cause</span><span>Opposition</span><span>Historical context</span></div>
  </section>;
}

export function PeopleView({ state, dispatch }) {
  const viewRef = useRef(null);
  const switcherRef = useRef(null);
  const person = REVOLUTION_PEOPLE.find((entry) => entry.id === state.selectedPersonId) ?? REVOLUTION_PEOPLE[0];
  const profile = PEOPLE_PROFILES[person.id];
  const [showAllEvents, setShowAllEvents] = useState(false);
  useEffect(() => {
    const rail = switcherRef.current;
    const selected = rail?.querySelector('[aria-pressed="true"]');
    if (!selected) return;
    const left = rail.scrollLeft + selected.getBoundingClientRect().left - rail.getBoundingClientRect().left - (rail.clientWidth - selected.clientWidth) / 2;
    rail.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [person.id]);
  const selectPerson = (personId) => {
    setShowAllEvents(false);
    dispatch({ type: "SELECT_PERSON", personId });
    viewRef.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const openEvent = (eventId) => { dispatch({ type: "SELECT_TIMELINE_EVENT", eventId }); dispatch({ type: "OPEN_SECTION", sectionId: "timeline" }); };
  const openEvidence = (evidenceId) => { dispatch({ type: "SELECT_EVIDENCE", evidenceId }); dispatch({ type: "OPEN_SECTION", sectionId: "evidence" }); };
  const featuredIds = person.eventIds.filter((id) => id === "massacre" || id === "tea-party");
  const eventIds = showAllEvents ? person.eventIds : featuredIds;

  return <section ref={viewRef} className="unit-view people-unit-view people-dossier" aria-labelledby="unit-people-title">
    <div className="people-dossier-inner">
      <header className="people-archive-heading"><span><UsersThree size={18} weight="duotone" /> AMERICAN REVOLUTION / PEOPLE</span><small>{state.viewedPersonIds.length} of {REVOLUTION_PEOPLE.length} perspectives explored</small></header>
      <nav ref={switcherRef} className="people-switcher" aria-label="Historical people">
        {REVOLUTION_PEOPLE.map((entry) => <button type="button" key={entry.id} className={entry.id === person.id ? "is-active" : ""} aria-pressed={entry.id === person.id} onClick={() => selectPerson(entry.id)}><Portrait personId={entry.id} /><span>{PEOPLE_PROFILES[entry.id].shortName}</span>{state.viewedPersonIds.includes(entry.id) && <Check size={13} />}</button>)}
      </nav>

      <article className={`people-hero ${["samuel-adams", "john-adams"].includes(person.id) ? "is-samuel" : ""}`}>
        <Portrait personId={person.id} className="people-hero-art" descriptive />
        <div className="people-hero-scrim" />
        <div className="people-hero-copy"><span className="people-eyebrow">{person.side} perspective / Boston</span><h1 id="unit-people-title">{person.name}</h1><p className="people-hero-subtitle">{person.role} <span>| {person.lifespan}</span></p><p className="people-hero-introduction">{profile.introduction}</p></div>
        <small className="people-portrait-caption">Historical interpretation</small>
      </article>

      <div className="people-study-grid">
        <section className="people-panel people-role" aria-labelledby="people-role-title">
          <header className="people-panel-heading"><h2 id="people-role-title"><UsersThree size={24} weight="duotone" /> His Role</h2><small>01 / PERSPECTIVE</small></header>
          <div className="people-role-list">{profile.roles.map((role) => { const Icon = ICONS[role.icon]; return <div key={role.title}><span className="people-role-icon"><Icon size={24} weight="duotone" /></span><div><h3>{role.title}</h3><p>{role.body}</p></div></div>; })}</div>
          <details key={person.id} className="people-tension"><summary>What shaped his choices? <ArrowRight size={16} /></summary><div><small>WHAT HE WANTED</small><p>{person.goal}</p><small>THE CENTRAL TENSION</small><p>{person.tension}</p></div></details>
        </section>

        <RelationshipMap key={person.id} person={person} profile={profile} onSelectPerson={selectPerson} />

        <section className="people-panel people-events" aria-labelledby="people-events-title">
          <header className="people-panel-heading"><h2 id="people-events-title"><Scroll size={24} weight="duotone" /> Key Events</h2><small>02 / CHRONOLOGY</small></header>
          <div className="people-event-list">{eventIds.map((id) => { const event = TIMELINE_EVENTS.find((entry) => entry.id === id); return <button type="button" key={id} onClick={() => openEvent(id)}><small>{event.date} {event.year}</small><h3>{event.title}</h3><p>{profile.eventNotes?.[id] ?? event.cardIntro}</p><span>Explore event <ArrowRight size={15} /></span></button>; })}</div>
          {person.eventIds.length > featuredIds.length && <button type="button" className="people-text-button people-show-events" aria-expanded={showAllEvents} onClick={() => setShowAllEvents(!showAllEvents)}>{showAllEvents ? "Show key moments" : `View all ${person.eventIds.length} related events`} <ArrowRight size={16} /></button>}
          <div className="people-evidence-links"><small><Books size={16} /> RELATED EVIDENCE</small>{person.evidenceIds.map((id) => { const evidence = REVOLUTION_EVIDENCE.find((entry) => entry.id === id); return <button type="button" key={id} onClick={() => openEvidence(id)}>{evidence.title}<ArrowRight size={14} /></button>; })}</div>
        </section>
      </div>
    </div>
  </section>;
}
