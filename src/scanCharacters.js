import { SAMUEL_ADAMS, DIALOGUE_PROMPTS } from "./scanData.js";
import { JOHN_ADAMS, JOHN_ADAMS_PROMPTS } from "./johnAdamsData.js";

const SAMUEL = Object.freeze({ ...SAMUEL_ADAMS, prompts: DIALOGUE_PROMPTS });
const JOHN = Object.freeze({ ...JOHN_ADAMS, prompts: JOHN_ADAMS_PROMPTS });

// Derive from the matched event, never the currently browsed timeline card.
export function getScanCharacter(eventId) {
  return eventId === "massacre" ? JOHN : SAMUEL;
}
