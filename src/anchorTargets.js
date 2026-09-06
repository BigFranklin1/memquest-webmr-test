// Order is the targetIndex order inside each compiled .mind file. Keep stable.
export const ANCHOR_TARGET_SETS = Object.freeze({
  massacre: {
    eventId: "massacre", subjectId: "john-adams", compiledFile: "massacre-targets.mind",
    images: [
      { id: "massacre-hinderaker", file: "massacre-hinderaker.png", label: "Boston's Massacre · Eric Hinderaker" },
      { id: "massacre-zobel", file: "massacre-zobel.png", label: "The Boston Massacre · Hiller B. Zobel" },
    ],
  },
  "stamp-act": {
    eventId: "stamp-act", subjectId: "samuel-adams", compiledFile: "stamp-act-targets.mind",
    images: [
      { id: "stamp-act-shumate", file: "stamp-act-shumate.png", label: "The Stamp Act and the American Revolution" },
      { id: "stamp-act-burgan", file: "stamp-act-burgan.png", label: "The Stamp Act of 1765" },
    ],
  },
  "tea-party": {
    eventId: "tea-party", subjectId: "samuel-adams", compiledFile: "tea-party-targets.mind",
    images: [
      { id: "tea-party-perspectives", file: "boston-tea-party-cover.png", label: "The Boston Tea Party · Perspectives" },
      { id: "tea-party-hourly-history", file: "tea-party-hourly-history.png", label: "Boston Tea Party · Hourly History" },
    ],
  },
});

export const AUTO_SCAN_TARGET_SET = Object.freeze({
  compiledFile: 'auto-scan-targets.mind',
  images: Object.values(ANCHOR_TARGET_SETS).flatMap(set => set.images.map(image => ({ ...image, eventId: set.eventId, subjectId: set.subjectId }))),
});

export function getAnchorTargetSet(eventId) {
  return Object.hasOwn(ANCHOR_TARGET_SETS, eventId) ? ANCHOR_TARGET_SETS[eventId] : null;
}

// Retain a single visible target, even during MindAR's old-target miss tolerance.
export function createTargetRouter(dimensions, onMatrix) {
  let active = null;
  return (update) => {
    if (update.type !== "updateMatrix" || !Number.isInteger(update.targetIndex) || !dimensions[update.targetIndex]) return;
    const index = update.targetIndex;
    if (!update.worldMatrix) {
      if (active !== index) return;
      active = null;
      onMatrix(null, { targetIndex: index, dimensions: dimensions[index] });
      return;
    }
    if (active !== null && active !== index) return;
    if (update.worldMatrix.length !== 16 || !update.worldMatrix.every(Number.isFinite)) return;
    active = index;
    onMatrix(update.worldMatrix, { targetIndex: index, dimensions: dimensions[index] });
  };
}
