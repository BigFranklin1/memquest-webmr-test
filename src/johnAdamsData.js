// Educational first-person dramatization, not verbatim historical quotations.
export const JOHN_ADAMS = Object.freeze({
  id: "john-adams",
  name: "John Adams",
  lifespan: "1735–1826",
  role: "Lawyer & Patriot · Massachusetts",
  scanContext: "Boston, 1770 · The trials after the Massacre",
  summary: "A Massachusetts lawyer who defended British soldiers after the Boston Massacre. His role invites us to separate political allegiance from legal guilt, and public anger from evidence. The confrontation occurred on March 5; the trials followed later in 1770.",
  introduction: "I am John Adams, a Massachusetts lawyer. In 1770, I defended British soldiers charged after the Boston Massacre. I opposed Parliament's policies, but I believed an accused person deserved a fair hearing. Let us examine the evidence before reaching a judgment.",
});

export const JOHN_ADAMS_PROMPTS = Object.freeze([
  { id: "identity", label: "Who are you?", category: "Meet the lawyer", answer: "I am John Adams of Massachusetts. In 1770, I was a lawyer, not yet a president. My work in the Boston Massacre trials asked a difficult question: could justice be fair even when the accused were deeply unpopular?" },
  { id: "motive", label: "Why defend the soldiers?", category: "Fairness & evidence", answer: "I defended the soldiers because a fair trial must depend on evidence, not public anger. Representing them did not mean approving British rule. A lawyer's duty can require defending someone whose cause is unpopular." },
  { id: "alliance", label: "Were you supporting Britain?", category: "A different perspective", answer: "No. Defending the soldiers did not make me a supporter of Parliament's policies. Political disagreement and legal guilt are different questions. Each defendant's actions had to be judged on the evidence." },
]);

export const JOHN_ADAMS_STORY = "The Boston Massacre took place on March fifth, 1770. Five colonists died following a confrontation with British soldiers. The trials came later that year. As a defense lawyer, I challenged conflicting testimony. Six soldiers were acquitted, while two were convicted of manslaughter. The episode asks us to distinguish political images, eyewitness accounts, and legal proof.";

export const JOHN_ADAMS_SOURCES = [
  "https://home.nps.gov/adam/learn/historyculture/john-adams-1735-1826.htm",
  "https://founders.archives.gov/documents/Adams/05-03-02-0001-0004-0016",
];
