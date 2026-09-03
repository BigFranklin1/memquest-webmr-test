import { TIMELINE_EVENTS } from "./scanData.js";
import { HARBOR_CLUES } from "./libraryData.js";
import { REVOLUTION_EVIDENCE, REVOLUTION_PEOPLE } from "./revolutionData.js";

export const REVOLUTION_UNIT_ID = "american-revolution";
export const LEARNING_CATALOG = [
  { id: REVOLUTION_UNIT_ID, eraId: REVOLUTION_UNIT_ID, title: "American Revolution", dates: "1765–1783", status: "available", eventIds: TIMELINE_EVENTS.map(e => e.id), personIds: REVOLUTION_PEOPLE.map(p => p.id), evidenceIds: REVOLUTION_EVIDENCE.map(e => e.id), clueIds: HARBOR_CLUES.map(c => c.id) },
  { id: "ancient-china", eraId: "ancient-china", title: "Ancient China", dates: "2070 BC–220 AD", status: "coming-soon" },
  { id: "silk-road", eraId: "silk-road", title: "Silk Road Civilizations", dates: "130 BC–1453 AD", status: "coming-soon" },
  { id: "world-war-ii", eraId: "world-war-ii", title: "World War II", dates: "1939–1945", status: "coming-soon" },
];

export const LEARNING_SKILLS = [
  { id: "chronology", title: "Chronology", description: "Place events in time.", challengeId: "order-events" },
  { id: "causality", title: "Cause & consequence", description: "Connect decisions to their effects.", challengeId: "read-evidence" },
  { id: "perspective", title: "People & perspectives", description: "Understand different positions.", challengeId: "connect-people" },
  { id: "evidence", title: "Evidence reasoning", description: "Support a claim and question a source.", challengeId: "read-evidence" },
];

export const CHALLENGES = [
  { id: "harbor-investigation", unitId: REVOLUTION_UNIT_ID, title: "Investigate the harbor", description: "Find four objects. Uncover the history behind each one.", kind: "exploration", skillId: "exploration", duration: "5–8 min", image: "harbor", section: "explore" },
  { id: "order-events", unitId: REVOLUTION_UNIT_ID, title: "A revolution in sequence", description: "Arrange four turning points, from resistance to collective action.", kind: "order", skillId: "chronology", duration: "2 min", image: "timeline", section: "timeline", initialOrder: ["tea-party", "stamp-act", "congress", "massacre"] },
  { id: "connect-people", unitId: REVOLUTION_UNIT_ID, title: "Whose side of the story?", description: "Connect people with their positions, allies, and responsibilities.", kind: "questions", skillId: "perspective", duration: "3 min", image: "people", section: "people", questions: [
    { id: "ally", skillId: "perspective", prompt: "Which merchant was a political ally of Samuel Adams?", options: [{ id: "hancock", label: "John Hancock" }, { id: "hutchinson", label: "Thomas Hutchinson" }, { id: "hewes", label: "George Hewes" }], answerId: "hancock", explanation: "Hancock connected merchant influence with Patriot political leadership and worked alongside Adams.", target: { section: "people", personId: "john-hancock" } },
    { id: "governor", skillId: "perspective", prompt: "Whose responsibility was to uphold royal authority in Massachusetts?", options: [{ id: "adams", label: "Samuel Adams" }, { id: "hutchinson", label: "Thomas Hutchinson" }, { id: "hancock", label: "John Hancock" }], answerId: "hutchinson", explanation: "As royal governor, Hutchinson defended imperial authority. His refusal to let the tea ships depart sharpened the dispute.", target: { section: "people", personId: "thomas-hutchinson" } },
    { id: "witness", skillId: "perspective", prompt: "Which account gives an artisan’s perspective, recorded decades after the Tea Party?", options: [{ id: "hutchinson", label: "Hutchinson’s official position" }, { id: "hancock", label: "Hancock’s merchant network" }, { id: "hewes", label: "George Hewes’s recollections" }], answerId: "hewes", explanation: "Hewes was a shoemaker and participant. His later recollections offer a personal perspective that should be compared with contemporary records.", target: { section: "people", personId: "george-hewes" } },
  ] },
  { id: "read-evidence", unitId: REVOLUTION_UNIT_ID, title: "Build a case from evidence", description: "Choose what a source supports—and what it cannot tell you.", kind: "questions", skillId: "evidence", duration: "3 min", image: "evidence", section: "evidence", questions: [
    { id: "source-limit", skillId: "evidence", prompt: "What can a reconstructed tea chest NOT establish?", options: [{ id: "cargo", label: "The kind of cargo targeted" }, { id: "identity", label: "The identity of the person who broke it" }, { id: "commodity", label: "The commodity at the center of the dispute" }], answerId: "identity", explanation: "A reconstructed object illustrates a category of cargo. It cannot identify who handled an original chest.", target: { section: "evidence", evidenceId: "tea-chest" } },
    { id: "framing", skillId: "evidence", prompt: "Why compare the Boston Gazette report with other accounts?", options: [{ id: "late", label: "It was written a century later" }, { id: "neutral", label: "Newspapers never reflect a viewpoint" }, { id: "patriot", label: "Its Patriot perspective shaped how it presented the protest" }], answerId: "patriot", explanation: "The Gazette’s contemporary account is valuable, but its support for the Patriot cause matters when evaluating its framing.", target: { section: "evidence", evidenceId: "gazette-report" } },
    { id: "response", skillId: "causality", prompt: "What connects the Tea Party to the First Continental Congress?", options: [{ id: "punishment", label: "Punitive measures against Massachusetts encouraged colonial coordination" }, { id: "repeal", label: "Parliament repealed all colonial taxes immediately" }, { id: "independence", label: "Britain immediately recognized colonial independence" }], answerId: "punishment", explanation: "Britain’s coercive response alarmed other colonies, helping bring delegates together in 1774.", target: { section: "timeline", eventId: "congress" } },
  ] },
];

export const getChallenge = id => CHALLENGES.find(c => c.id === id);
export const getUnit = id => LEARNING_CATALOG.find(u => u.id === id);
