import { getAnchorTargetSet } from "./anchorTargets.js";

// URLs only; target bytes are fetched only when Page anchor is enabled.
const assets = import.meta.glob("./assets/tracking/*.{png,mind}", { eager: true, query: "?url", import: "default" });
export function getAnchorTargetAssets(eventId) {
  const preset = getAnchorTargetSet(eventId);
  if (!preset) return null;
  return {
    ...preset,
    targetUrl: assets[`./assets/tracking/${preset.compiledFile}`],
    images: preset.images.map(image => ({ ...image, url: assets[`./assets/tracking/${image.file}`], thumbnailUrl: assets[`./assets/tracking/${image.id}-thumb.png`] })),
  };
}
