export const SAMUEL_ADAMS = Object.freeze({
  id: "samuel-adams",
  name: "Samuel Adams",
  lifespan: "1722-1803",
  role: "Revolutionary organizer · Massachusetts",
  scanContext: "Boston, circa 1773",
  summary: "A leading organizer of colonial resistance, member of the Sons of Liberty, and later a signer of the Declaration of Independence.",
  introduction: "I am Samuel Adams of Boston. In 1773, we believed Parliament could not tax the colonies while denying us a voice. Our resistance was meant to protect self-government, not merely to oppose tea.",
});

export const DIALOGUE_PROMPTS = Object.freeze([
  {
    id: "identity",
    label: "Who are you?",
    category: "Query identity",
    answer: "I am Samuel Adams, a writer, organizer, and representative from Massachusetts. I worked with fellow colonists to turn local protest into a common cause.",
  },
  {
    id: "motive",
    label: "Why resist the tea tax?",
    category: "Query motive",
    answer: "The price of tea was not the heart of the matter. Parliament claimed the right to tax us without our consent, and accepting that claim would weaken every colonial assembly.",
  },
  {
    id: "alliance",
    label: "Who supported you?",
    category: "Query alliance",
    answer: "Merchants, printers, artisans, and many members of the Sons of Liberty carried the message. Committees of correspondence helped the colonies share news and act together.",
  },
]);

export const TIMELINE_EVENTS = Object.freeze([
  {
    id: "stamp-act",
    year: "1765",
    date: "March 22",
    title: "Stamp Act",
    shortTitle: "Tax resistance",
    cardIntro: "Printed paper became a flashpoint as colonists challenged Parliament's right to tax them without representation.",
    imageAlt: "Colonial printers and merchants examining stamped papers in a Boston print shop",
    detail: "Adams helped organize opposition to the Stamp Act and argued that taxation without colonial representation threatened self-government.",
  },
  {
    id: "massacre",
    year: "1770",
    date: "March 5",
    title: "Boston Massacre",
    shortTitle: "Public memory",
    cardIntro: "A deadly confrontation transformed fear of standing armies into a powerful shared memory across the colonies.",
    imageAlt: "British soldiers and Boston townspeople confronting each other on a snowy street at night",
    detail: "After British soldiers killed five colonists, Adams pressed for the troops' removal and helped frame the event as a warning about military rule.",
  },
  {
    id: "tea-party",
    year: "1773",
    date: "December 16",
    title: "Boston Tea Party",
    shortTitle: "Defiance in Boston",
    cardIntro: "Tea chests entered Boston Harbor in a dramatic rejection of Parliament's tax and the East India Company's monopoly.",
    imageAlt: "Colonial protesters tipping tea chests from a ship into Boston Harbor at night",
    detail: "Following a mass meeting at Old South Meeting House, protesters destroyed East India Company tea to reject Parliament's claim to tax the colonies.",
  },
  {
    id: "congress",
    year: "1774",
    date: "September 5",
    title: "First Continental Congress",
    shortTitle: "Colonial unity",
    cardIntro: "Delegates met in Philadelphia to coordinate a common response to Britain's punishment of Massachusetts.",
    imageAlt: "Delegates debating around a candlelit table at the First Continental Congress",
    detail: "As a Massachusetts delegate, Adams supported coordinated colonial resistance after the Intolerable Acts closed Boston's port and restricted local government.",
  },
]);

export const SCAN_EVENT_PRESETS = Object.freeze([
  {
    eventId: "stamp-act",
    title: "Stamp Act",
    year: "1765",
    signaturePhrases: ["stamped paper", "taxation without representation", "stamp duty"],
    supportingKeywords: ["parliament", "printed paper", "colonies", "samuel adams"],
  },
  {
    eventId: "massacre",
    title: "Boston Massacre",
    year: "1770",
    signaturePhrases: ["bloody massacre", "soldiers killed five colonists", "king street"],
    supportingKeywords: ["british soldiers", "march 5", "standing army", "boston townspeople"],
  },
  {
    eventId: "tea-party",
    title: "Boston Tea Party",
    year: "1773",
    signaturePhrases: ["east india company tea", "tea chests", "griffin s wharf", "tea act"],
    supportingKeywords: ["old south meeting house", "parliament", "harbor", "december 16"],
  },
  {
    eventId: "congress",
    title: "First Continental Congress",
    year: "1774",
    signaturePhrases: ["first continental congress", "delegates met in philadelphia", "intolerable acts"],
    supportingKeywords: ["colonial delegates", "philadelphia", "massachusetts", "colonial unity"],
  },
]);
