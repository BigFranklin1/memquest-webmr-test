# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Product decisions

- This is a responsive mobile website, not a simulated device-frame prototype.
- Match the supplied 1254x960 AR onboarding screenshot: live camera at the edges, centered navy glass panel, three instructional rows, yellow CTA, and four-item bottom navigation.
- Use immersive WebXR with required DOM Overlay on supported Android browsers and fall back to `getUserMedia` everywhere else.
- The first version is a camera interaction prototype only: no hit testing, spatial anchors, 3D models, authentication, or persistence.
- UI copy is English and deployment target is the connected Vercel account.
- Keep README.md in Chinese while the application UI and narration remain English. Document the project-local PowerShell runner as the default Windows workflow; it must not require Corepack to write into Program Files.
- Keep the live camera visually prominent: use lighter translucent glass surfaces and a restrained full-screen scrim while preserving text contrast.
- Mobile landscape is a first-class layout at 844×390: keep the three instruction cards in one row, preserve safe-area padding, and prevent page or navigation overflow.
- The Scan tab owns the primary prototype journey: `getUserMedia` camera start, local English OCR, one of four configured American Revolution event matches (or an explicit no-match state), an event result, Samuel Adams context, HeyGen question responses, and an interactive four-event timeline. Camera frames and recognized text stay on device; the bundled Tesseract worker and English model load only while scanning.
- Voice interaction uses predefined question buttons and eight pre-generated English HeyGen clips in the mature “Norman — Serious” voice; browser speech synthesis and microphone recording remain disabled.
- Timeline events use illustrated image-and-text cards; on mobile they form a horizontal scroll-snap carousel whose centered card updates the event detail.
- The Library journey is Library home → American Revolution overview → Boston Harbor 1773. Other era cards remain visible previews but are not functional in this version.
- Keep the Library home title pill content-sized with compact horizontal padding. Era-card title rows must reserve a dedicated column for their circular icon so it remains fully visible in landscape without overlapping the title.
- Boston Harbor is a true procedural Three.js scene with four interactive clue objects. Use `immersive-vr` WebXR when supported and device-orientation look on ordinary phones, with drag-to-look as the universal fallback.
- The American Revolution unit uses one shared learning graph across Timeline, People, Evidence, and Memory Check. Cross-links preserve context, progress is stored locally, and mobile content uses horizontal scroll-snap where comparison matters.
- Challenges and Progress are global, top-level destinations spanning all historical eras and units, not American Revolution subpages. Unit-level Explore, Timeline, People, Evidence, and Memory Check remain inside Library; American Revolution is the first populated example rather than the boundary of the global information architecture.
- Global Challenges offers resumable exploration, chronology, perspective, and evidence tasks, filtered by era, skill, and completion state. Contextual content links must return to the same challenge with answers and ordering intact. Progress separates exploration from practice results and never reports a percentage of all history learned.
- Fresh learning records have no pre-filled discoveries. The versioned global save keeps unit records, drafts, practice results, and activity on this device only. Earlier prototype saves remain untouched and can be explicitly imported as exploration, with a warning about demo pre-fills; legacy scores never become new skill results. Coming-soon eras do not count toward totals.
- Challenge completion is counted once across retries. Skill feedback uses the latest answer to each distinct question within the most recent 100 sessions; event ordering is one question, not four independent samples. Earned unit completion is retained even when a later practice score is lower. Locked evidence is not counted as reviewed.
- Explore, Timeline, People, Evidence, and Memory Check should share an image-led archival visual language. Use historically relevant imagery as filtered card backgrounds, with deep navy scrims and restrained antique-gold interaction cues so text remains readable.
- People follows the supplied Samuel Adams dossier reference: cinematic right-aligned portrait blended with a navy gradient, large name and biography above a two-column His Role / Key Events / Network layout. Keep a compact horizontal person switcher; relationships are clickable and distinguish allies, opponents, and contextual links. Portraits are labeled historical interpretations, and the dossier stacks cleanly on phones.
- The Boston Harbor clue set is historically grounded in the night action: a hooded lantern, an East India Company tea chest, the Dartmouth tea ship, and a ship carpenter’s hatchet. Use translucent spatial rings plus forgiving invisible hit proxies; a drag gesture must never trigger a clue.
- Selecting a Harbor clue opens a compact card beside that object, not a centered modal. The card offers an item-specific HeyGen narration and an in-place “Why it matters” expansion with related history; audio stops when the clue changes, closes, or the scene exits.
