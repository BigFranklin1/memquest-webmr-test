# Design QA

## People dossier: reference-led refresh (2026-09-03)

### Visual evidence and normalization

- Source visual truth: `C:/Users/Yilin/AppData/Local/Temp/codex-clipboard-8de19550-9c40-45c3-8e05-ce62e0d5e8a9.png`, 1722 x 1508 pixels.
- Implementation: `http://localhost:4173/`, Library > American Revolution > People, Samuel Adams selected.
- Desktop comparison: `E:/code/webxr-test/qa-people-desktop.png`, a 1280 x 720 browser capture containing the real People component in a 1722 x 1508 CSS-pixel iframe. The iframe is uniformly scaled by 0.47745358; its top-left 822 x 720 region is the app content. The right-hand blank area and measurement readout belong only to the QA harness and are excluded from the design comparison.
- Responsive evidence: `E:/code/webxr-test/qa-people-portrait.png` (390 x 844 CSS viewport, scaled by 0.85308 within the capture) and `E:/code/webxr-test/qa-people-landscape.png` (844 x 390 CSS viewport at 1:1 inside the capture).
- Focused interaction evidence: `E:/code/webxr-test/qa-people-network.png`, the Network and relationship-detail region in the actual 449 x 1272 browser pane. This is a responsive adaptation, not a claim of a supplied phone reference.
- The source and revised desktop capture were opened together in the same comparison input. The real app's Network was also inspected at full browser resolution for portrait crops, label wrapping, selected-state contrast, and touch boundaries.

### Findings and iteration history

- [P2, fixed] The mobile fixed navigation overlapped the archive heading. The dossier top inset is now 130px; the 390px check shows tabs ending at y=114 and the heading starting at y=130.
- [P2, fixed] The first desktop composition was too inset and extended beyond the target frame. The content maximum increased to 1600px and the hero height was rebalanced. At 1722 x 1508, the study grid now runs from y=493 to y=1456 and the full default dossier fits the viewport.
- [P2, fixed] The wide hero cropped too much of the portrait. Its image slot now caps at 1000px with a top-aligned crop so the face remains recognizable before fading into the navy scrim.
- [P2, fixed] A negative hero margin introduced approximately 2px of landscape overflow. Landscape now matches its 16px inset, with the hero at x=0 and width=834 inside the scrollable viewport.
- [P2, fixed] The bottom portrait-mode network hit area crossed the map boundary. Narrower node columns and an adjusted lower-node position keep every hit area inside the map. Labels and mobile evidence controls were subsequently enlarged for legibility and 44px tap targets.
- Post-fix DOM checks: no horizontal overflow at 1722 x 1508, 390 x 844, or 844 x 390; all five network nodes are contained in the map at each size.

### Required fidelity surfaces

- Typography: Georgia display names and section headings reproduce the reference's editorial hierarchy; warm-gold metadata contrasts with cool-light body text. Existing system UI typography is retained for navigation. The Hewes long-name state wraps without horizontal overflow.
- Spacing and layout: the desktop hero leads into a roughly 40/60 Role + Key Events / Network composition. The compact perspective selector and related-evidence links are intentional additions preserving the existing learning journey. Phones stack Role, Events, then Network with independent horizontal perspective navigation.
- Colors and tokens: deep navy fields, restrained translucent panels, gold selection states, and muted green/red/context-blue relationships follow the reference. Gradients are readable overlays on real imagery, not substitutes for portraits.
- Imagery: a new built-in Image Gen portrait is used for Samuel Adams, including his network thumbnail. The other three existing historical interpretations remain available. The image is marked "Historical interpretation" and its prompt/provenance is stored in `src/assets/archive/people-hero-source.md`.
- Copy: role, motive, tension, chronology, and source links are retained. The network uses the four configured historical people and relevant institutions, rather than adding nonfunctional Revere/John Adams profiles from the mockup. Contextual movement links explicitly avoid implying unverified personal coordination.

### Functional verification

- Opened Library > American Revolution > People in the real app.
- Expanded the motive/tension disclosure; selected a relationship; followed View profile to Hancock; verified the relationship detail resets for the new person.
- Expanded and compacted the relationship map. Opened the Boston Massacre event with its selected context intact, then returned to People and opened the Tea Act evidence entry.
- Verified Hutchinson and Samuel Adams selection by click, and Hewes selection by keyboard in the horizontally scrolling selector. Selected perspectives scroll into view and the biography returns to the top.
- Expanded all four related events and collapsed back to key moments. After the final page reload, there are no new browser warning/error entries; an earlier temporary Vite reload error from the in-progress asset import is resolved.
- 28 application tests and 4 Sites packaging tests pass. Production build succeeds; the existing large Three.js bundle warning remains a separate performance follow-up.

### Follow-up polish

- [P3] Real iOS/Android touch and accessibility testing remains useful; responsive browser dimensions do not replace physical-device testing.
- [P3] Curator review should precede classroom publication of any imagined portrait or editorial historical interpretation.

final result: passed

## Evidence

- Visual sources:
  - `C:\Users\Yilin\Downloads\Angela Topic\MemQuest AR - Bring to Life.png`
  - `C:\Users\Yilin\Downloads\Angela Topic\MemQuest AR - Character Interaction.png`
  - `C:\Users\Yilin\Downloads\Angela Topic\MemQuest AR - Connect Causes.png`
  - `C:\Users\Yilin\Downloads\Angela Topic\MemQuest AR - Explore Objects.png`
- Final Scan captures:
  - `E:\code\webxr-test\qa-scan-profile-844x390.png`
  - `E:\code\webxr-test\qa-scan-dialogue-844x390.png`
  - `E:\code\webxr-test\qa-scan-timeline-844x390.png`
  - `E:\code\webxr-test\qa-scan-timeline-390x844.png`
  - `E:\code\webxr-test\qa-scan-profile-390x844.png`
- Reference and implementation were viewed together during QA. The references establish the visual system and state anatomy; the implementation targets browser-native phone viewports rather than recreating the tablet bezel.

## Findings

- No actionable P0/P1/P2 findings remain.
- Brand and hierarchy: the MemQuest mark, Archive Overseer identity, navy glass surfaces, antique-gold highlight, serif display type, and fixed four-item navigation reproduce the supplied visual language.
- Scan state: selecting Scan forces the ordinary rear-camera path so frames are available to the bundled on-device English OCR worker. The view exposes initialization, stabilization, recognition, matched-event, no-match, and unavailable states without claiming face or object recognition.
- Subject profile: the generated Samuel Adams portrait is a real RGBA raster asset, optimized to a 143 KB WebP for mobile delivery. The profile is linked through the matched event rather than showing a fabricated subject-recognition percentage; role, summary, voice introduction, dialogue, timeline, and rescan actions remain visible and functional.
- Voice interaction: the profile introduction, three prompt answers, and four timeline events use eight pre-generated English HeyGen WAV clips in one consistent mature male voice (“Norman — Serious”). Selecting a new clip cancels the prior playback; changing Scan subviews also releases the active audio. The UI explicitly describes device-speaker output and does not imply that microphone recording is active.
- Timeline: four historically ordered events now use dedicated archival-style 16:9 scene images, year/date metadata, titles, and short narrative copy. The selected card updates the full event detail, check state, and the text sent to “Hear event.”
- Landscape responsiveness: at 844×390, profile, dialogue, and timeline remain fully inside the 844×390 document. The bottom navigation ends at y≈380 with a 10px safe edge; all primary tap targets are at least 42px high.
- Portrait responsiveness: at 390×844, the subject profile and all four actions fit above the fixed navigation. Dialogue uses a dedicated scroll container; an off-screen third question was automatically brought into view and selected, proving keyboard/touch-scroll reachability. Timeline cards use a centered horizontal scroll-snap carousel: one full card plus neighboring card edges remain visible as a clear swipe cue.
- Accessibility: semantic headings, buttons, navigation, live regions, visible focus treatment, reduced-motion handling, descriptive image alt text, and non-color selected states are present.
- Runtime quality: camera mode, profile, dialogue, third-question selection, timeline navigation, and event switching were exercised in the in-app browser; console warnings/errors were empty.
- Audio runtime: the HeyGen introduction and first dialogue response were played from local assets in the 844×390 browser viewport. Both entered the visible “Speaking…” state, view changes stopped prior playback, and the console remained clean.

## Comparison history

1. Initial landscape implementation matched the reference state anatomy but portrait actions extended underneath the fixed navigation.
2. The portrait subject actions changed to a compact two-column grid and the portrait stage height was reduced. The final profile leaves roughly 35px between the actions and the navigation.
3. The first portrait dialogue frame only showed two prompt cards. Browser-driven selection of the third prompt scrolled the dialogue container to `scrollTop≈201`, exposed the control above the navigation, updated the transcript, and triggered speech synthesis.
4. The 1.77 MB generated PNG was converted to an alpha-preserving 143 KB WebP, reducing the primary mobile image transfer by roughly 92% without changing composition.
5. The annotated plain-text timeline row was replaced with four image-and-copy cards. At 390×844 the active card centers with adjacent-card previews; at 844×390 each card becomes a compact left-image/right-copy layout so three moments remain visible without colliding with the safe-area navigation.
6. The 1250×1000 implementation and the supplied `Connect Causes` reference were viewed together. The implementation preserves the navy glass, antique-gold chronology, large serif hierarchy, sequential event imagery, and fixed navigation while adapting the tablet composition to a browser-native responsive carousel.

## Follow-up polish

- P3: the HeyGen historical voice is a character interpretation rather than an authenticated recording of Samuel Adams.
- P3: current OCR covers printed English for four configured American Revolution events; handwriting, Chinese text, faces, and general object recognition remain out of scope.
- P3: final `immersive-ar` composition still requires an ARCore-capable Android device because desktop verification cannot emulate the system XR compositor.

## Library / Boston Harbor refinement

- Visual source: `C:\Users\Yilin\AppData\Local\Temp\codex-clipboard-613124a5-3120-4882-af93-67ba062014df.png` was viewed beside the final procedural scene at 1254×960; the implementation preserves the dark harbor, fog, warm lantern focal point, clue objective, period cargo, ship silhouette, gold cues, and edge-aligned controls without copying the screenshot as a flat background.
- Historical clue mapping: the four interactive objects are now a hooded lantern, a detailed East India Company tea chest, the Dartmouth tea ship, and a correctly scaled ship carpenter’s hatchet. The earlier cannon was removed because it did not directly explain the Tea Party action.
- Source check: a December 18, 1773 eyewitness account identifies hatchets or axes and records that the tea chests were knocked apart; the contemporary Boston Gazette account emphasizes that the ships and unrelated property were not damaged. The clue copy now explains this deliberate targeting.
- Visual cues: marker halos, rings, and center dots use layered transparency, subtle pulsing, hover emphasis, and a quieter discovered state. Near-camera rings were reduced in scale after same-state visual comparison so they no longer dominate the scene.
- Hit testing: every clue has a simplified invisible hit proxy, mobile taps receive an offset retry pattern, pointer duration and movement thresholds separate taps from look gestures, and visible marker proxies take precedence over overlapping near-camera object proxies.
- Interaction QA at 844×390: the hatchet, tea chest, Dartmouth, and lantern each opened the correct clue; tapping the hatchet marker specifically reproduced and then passed the overlapping-lantern regression case. Dragging through a clue marker rotated the camera without opening any clue.
- Runtime QA: final Vite reload produced no new Three.js warnings or errors. Deprecated `THREE.Clock` and `PCFSoftShadowMap` usage was replaced with `THREE.Timer` and `PCFShadowMap`.
- Verification: 13 application tests, the production build, and all 4 Sites worker tests pass. Library and Harbor have no remaining actionable P0/P1/P2 findings.

## Object clue card refinement

- Comparison evidence: the supplied Boston Harbor reference and `E:\code\webxr-test\qa-harbor-clue-844x390.png` were viewed together in one QA comparison. The final state keeps the reference’s dark navy glass, antique-gold actions, historical serif hierarchy, foggy scene visibility, and edge controls while adding the requested object-adjacent interaction layer.
- Spatial placement: selecting a clue projects its Three.js marker into screen coordinates and opens a compact card to the marker’s left or right. The position is clamped to the viewport so the card stays visible near edge objects and in the 844×390 safe layout.
- Content states: the collapsed card includes the artifact name, period, location, concise introduction, and exactly two primary choices. “Why it matters” expands the same card with a deeper interpretation and related-history note; the expanded card remains within y=60–340 and uses an internal touch-scroll area when the phone is short.
- Audio interaction: all four clues now ship with dedicated English HeyGen “Norman — Serious” WAV narrations. “Listen to the story” changes to “Pause story” during playback; changing clues, closing the card, or exiting the scene releases the active audio.
- Interaction safety: the card has its own pointer/touch surface above the canvas, so its buttons do not trigger Three.js hit targets. A live regression check started the hatchet narration, selected the lantern marker, and confirmed that the old audio stopped and the new card returned to its unplayed state.
- Runtime and responsiveness: the interactive card, narration state, expansion state, and clue switching were exercised in the in-app browser at 844×390. No browser warnings or errors were recorded, 13 application tests pass, the production bundle builds successfully, and all 4 Sites worker tests pass.

## American Revolution learning sections

- Source visual truth: `C:\Users\Yilin\AppData\Local\Temp\codex-clipboard-4ee15237-8a9b-495c-b927-657451aaaf34.png` (1351×1080 px).
- Browser-rendered implementation evidence:
  - `E:\code\webxr-test\qa-revolution-overview-1351x1080.png` (1351×1080 px; 1351×1080 CSS viewport; device scale factor 1).
  - `E:\code\webxr-test\qa-revolution-timeline-844x390.png` (844×390 px; 844×390 CSS viewport; device scale factor 1).
- State: American Revolution overview for the normalized full-view comparison; Timeline / Events with Boston Tea Party selected for the focused mobile-landscape check.
- Normalization: source and overview implementation are both unframed browser-native views at 1351×1080 and require no density resampling. The 844×390 capture is a separate responsive evidence pass, not a pixel comparison to the desktop source.
- Full-view comparison evidence: the source and implementation overview were opened together in one comparison input. Both preserve the fixed deep-navy sidebar, five-section hierarchy, gold active state, large centered serif unit title, glass chronology pill, photographic harbor stage, centered action card, bottom-left clue status, and bottom-right scene actions. The implementation intentionally omits the source’s account utility bar and uses the approved darker generated 1773 harbor artwork; neither deviation changes the requested unit-navigation hierarchy.
- Focused region evidence: the 844×390 Timeline capture confirms readable serif event hierarchy, four real 16:9 archival illustrations, gold chronology, selected state, horizontal swipe cue, and an image-and-text detail card. Separate browser checks covered People selection, Evidence filters/source analysis, and Memory Check answer feedback because these states do not exist in the source visual.

### Findings

- No actionable P0/P1/P2 findings remain.
- Fonts and typography: Georgia-based historical display type and compact sans-serif interface copy preserve the source’s archival hierarchy. Landscape headings, labels, and card copy remain readable without collision; long card summaries clamp only in the overview rail and remain complete in the detail view.
- Spacing and layout rhythm: desktop retains the source’s left-rail/main-stage proportions. Mobile uses a safe-area-aware horizontal chapter rail; Timeline, People, and Evidence comparison rows use scroll-snap, while detail content remains vertically scrollable.
- Colors and visual tokens: deep navy, desaturated blue glass, thin blue-gray borders, antique gold actions, and green/orange answer feedback are consistent and retain non-color selected indicators.
- Image quality and assets: Timeline uses four dedicated WebP illustrations with correct event subjects and cover crops. Samuel Adams keeps the existing generated portrait; Hutchinson, Hewes, and Hancock now use distinct crops from a generated archival triptych. Evidence cards use a separate generated period still life with semantic crops for material objects and documents.
- Copy and content: all learner-facing copy is English and historically organized around chronology, motive, source limits, supported claims, and causal explanation. Evidence entries explicitly distinguish reconstructions, laws, records, and partisan newspaper reporting.
- Interaction states: Timeline event/causality modes, person selection, evidence filters, locked Harbor discoveries, cross-links, five-question feedback, score, retry, and best-score persistence were exercised. A fresh browser load traversed all four sections with no warnings or errors.
- Accessibility: semantic buttons/headings, pressed/current states, descriptive event-image alt text, keyboard focus rings, 40px-class primary actions, safe-area padding, and horizontal/vertical scroll reachability are present.

### Comparison history

1. Initial 844×390 Evidence layout allocated too little width to the source grid, causing archive names to wrap into narrow columns. The grid track was increased to 350px and rebalanced against the analysis panel; the post-fix browser check retains both the evidence selector and readable analysis above the fold.
2. Initial landscape Memory Check rendered its question progress as a full-height decorative line, which obscured actual completion. It was restored to a proportional horizontal progress bar; answer selection, corrective explanation, and review/next actions remain in one viewport.
3. The final overview was recaptured at the exact 1351×1080 source dimensions and compared together with the source. No further P0/P1/P2 typography, spacing, color, imagery, or content corrections were identified.

### Primary interactions tested

- Open Library → American Revolution overview.
- Switch Timeline Events/Causes, select events, and expose the Harbor link.
- Select Thomas Hutchinson and follow shared event/evidence relationships.
- Filter and inspect evidence; preserve undiscovered Harbor-source behavior.
- Begin Memory Check, submit an incorrect answer, display the correct answer and explanation, and expose the contextual review link.
- Reload from a clean tab, traverse all four sections, and verify an empty warning/error console.

### Follow-up polish

- P3: the three new supporting portraits are historically informed editorial interpretations and should receive curator review before classroom publication.
- P3: an end-to-end real-device pass can validate momentum and touch ergonomics of the horizontal card rails under iOS Safari and Android Chrome.

final result: passed

## Library home landscape alignment

- The Library title pill now sizes to its icon and label instead of reserving a 250px minimum width; at the reviewed desktop viewport its width is approximately 176px.
- The active era title row now uses a protected two-column layout. The American Revolution title scales down at narrower widths while the circular compass remains entirely inside the card border.
- Browser geometry checks confirmed the orbit is contained by the active card and the document has no horizontal overflow. The updated wide-screen capture also shows clear separation between the title and compass.
- Verification: 27 application tests and all 4 Sites worker tests pass; the production bundle succeeds and the browser console contains no warning or error entries.

final result: passed

## Image-led learning section refresh

- Design read: preserve-redesign for a mobile historical learning product, using a cinematic archival language with `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 4`, and `VISUAL_DENSITY 6`.
- Explore: the full-viewport Boston Harbor image remains the primary scene. The title and investigation prompt now use offset, lighter navy glass surfaces, while Timeline and Evidence are distinct supporting actions rather than duplicate VR entry buttons.
- Timeline: all four event selectors are full-bleed filtered image cards with compact date plaques, bottom narrative scrims, selected-state borders, and horizontal scroll-snap below 900px. The causal path inherits a restrained image layer without reducing text contrast.
- People: Hutchinson, Hewes, and Hancock now have distinct image crops from a generated historical triptych; Samuel Adams keeps the existing portrait. The selector rail is image-led and the chosen portrait remains visible beside motive, tension, relationships, events, and evidence.
- Evidence: a generated 1773 archive-table still life supplies semantic background crops for the lantern, hatchet, tea chest, shipping record, newspaper, and legislation. The selected source receives a wider contextual image while locked states retain their Harbor search behavior.
- Memory Check: intro, question, feedback, and result states now carry contextual imagery. The image treatment stays subordinate to the answer controls, and reduced-transparency and reduced-motion fallbacks remain available.
- Responsive review: the in-app browser was exercised in its 596px portrait pane and a 1280x720 desktop tab. Existing 390x844 and 844x390 rules were retained and extended for the new image rails, portrait crops, evidence cards, and two-column landscape Memory Check.
- Accessibility and copy: card images have appropriate empty or descriptive alt text, keyboard focus remains visible, controls preserve pressed/current states, and all visible em/en dash characters were replaced with plain punctuation per the selected design skill.
- Runtime quality: Explore, Timeline events and causes, People selection, Evidence analysis, Memory Check intro, question, correct-answer feedback, and cross-section navigation were exercised. Browser warning/error logs remained empty.

final result: passed

## Scan on-device OCR

- Visual truth and evidence: `C:\Users\Yilin\Downloads\Angela Topic\MemQuest AR - Bring to Life.png` and `E:\code\webxr-test\qa-scan-ocr-landscape.png` were viewed together in one QA comparison. The implementation preserves the reference's edge-to-edge camera, deep-navy glass, antique-gold Scan emphasis, compact archive identity, and fixed four-item navigation while replacing the reference's illustrative target with a functional OCR failure state.
- Responsive evidence: `E:\code\webxr-test\qa-scan-ocr-portrait.png` (390×844) shows the central English text frame, privacy disclosure, three-pass progress, and safe-area navigation; `E:\code\webxr-test\qa-scan-ocr-landscape.png` (844×390) shows all four supported events and both recovery actions without overflow.
- Real runtime path: a browser-only fixture rendered `BOSTON TEA PARTY 1773` plus East India Company and Boston Harbor context onto a canvas. The deployed Tesseract Worker read the full text at 95% OCR confidence, and the production matcher selected `tea-party` with the expected title, signature, keyword, and year signals.
- Failure behavior: a live Scan pass over a frame without supported text completed three serial attempts and rendered `No historical match found`; the worker terminated and the camera view remained available for retry. A fresh-tab repeat produced no browser warnings or errors.
- Privacy and loading: Tesseract.js, the Worker, compatible WASM core, and `eng.traineddata.gz` load only after Scan starts. The model is emitted at `dist/client/assets/ocr/eng.traineddata.gz`; no camera frame or recognized text leaves the browser or enters persistent storage.
- Interaction continuity: event results retain the matched event across `Explore timeline` and `Meet Samuel Adams`; the profile labels the relationship as `Linked through {event}`. `Scan again`, tab changes, page hiding, and unmounting cancel pending timers and discard late recognition results.
- Verification: 27 application tests and all 4 Sites worker tests pass. Coverage includes all four events, punctuation/case variation, a light OCR typo, year-only rejection, ambiguity rejection, three misses, serial execution, stale-result cancellation, camera-only Scan startup, permission handling, and constraint fallback.
- No actionable P0/P1/P2 OCR or responsive-layout findings remain.

final result: passed

## Global Challenges and Progress (2026-09-03)

- Information architecture: both tabs are global destinations across the archive. American Revolution is the first published unit, not a parent of these pages. Other eras are explicitly Coming soon and excluded from totals; unit-level sections remain inside Library.
- Visual direction: the existing navy, antique-gold, image-led archival design carries into a recommended challenge, filtered challenge cards, and a personal learning archive. Existing local historical illustrations supply the filtered backgrounds; no new mockup was used as a pixel-match target.
- Responsive evidence: `qa-global-challenges-desktop.png` captures 1254×960; `qa-global-progress-portrait.png` captures 390×844; `qa-global-challenges-landscape.png` captures 844×390. DOM checks show document width equals viewport width at all three sizes. Bottom navigation ends at approximately y=834 in portrait and y=380 in landscape, leaving the configured edge spacing. Long content scrolls above the navigation with bottom padding.
- Functional browser QA uses `/tests/global-browser-fixture.html`, the real application with isolated in-memory storage, so test completions do not change the user's saved learning record.
- Harbor investigation: entered the actual Three.js scene, selected all four clue objects, opened every Why it matters explanation, returned to the challenge, and completed it at 4/4. Entering the scene alone does not count as a discovery.
- Practice journeys: reordered all four historical events; answered people questions including an incorrect answer; completed all three evidence questions; followed contextual person/event links and returned without losing locked answers or order. Completed the five-question Memory Check and verified its 100% result in global Progress independently from 5/18 exploration records.
- Filters and states: verified the unpublished-era empty state and reset action, initial zero totals, in-progress/complete tasks, recommended continuation, feedback, retry, and contextual return navigation. Unit tests cover saved drafts, optional legacy import, invalid records, denied storage, and bounded history.
- Metrics corrections: removed the Harbor footer's fixed 65% demo baseline; locked evidence no longer counts as reviewed; the four-event ordering task counts as one assessment question, not four independent samples. Memory Check labels describe a practice result instead of claiming mastery. Repeated completion does not duplicate earned milestones.
- Accessibility: native labeled filters, semantic headings and buttons, visible focus, 44px-class action targets, non-color feedback, and reduced-motion styling are included. Portrait content stacks; landscape uses the available width without joining words at hidden line breaks.
- Verification: all 45 application tests and all 4 Sites tests pass. Production build succeeds and includes `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`. Browser warning/error logs are empty after the tested workflows. The existing large-JavaScript-chunk build warning remains a performance follow-up.
- Scope: local prototype verified; no Vercel deployment performed in this update. Physical Android/iPhone hardware and immersive-headset behavior were not revalidated in this pass.

final result: passed (local functional and responsive QA)

## Camera-first mobile Scan (2026-09-04)

- Request: keep the camera readable while acquiring text; show the full UI only after a match, no-match, or error. The existing visual language remains the source; no generated mockup or background image was added.
- Acquisition: removed the large instruction panel, brand header, bottom navigation and camera-ready toast from the scanning stage. The live video has no brightness filter or full-screen scrim. Only Exit scan, a clear reading-frame outline, short hint, and compact bottom status remain. Result/error cards restore the normal workspace; Scan again returns to acquisition. A paused camera has an explicit Resume control.
- Portrait 390×844: video fills the viewport. The transparent reading frame is x=18, y=96, width=354, height=632 (about 75% of viewport height). The status begins below the frame. No horizontal overflow. Result actions end at y≈759, before the bottom navigation at y≈777.
- Landscape 844×390: video fills the viewport; the transparent frame is x=30, y=68, width=784, height=240. The compact status begins at y≈312, below the frame. Brand and primary navigation are absent during acquisition. Safe-area insets are included in edge controls, frame and status positioning.
- Evidence: local `qa-scan-camera-portrait.png`, `qa-scan-camera-landscape.png` and `qa-scan-camera-result.png`. The developer-only `/tests/scan-camera-browser-fixture.html` uses a clearly labeled synthetic camera and isolated in-memory storage, not the user's camera or saved progress.
- OCR integration: the real bundled English Tesseract worker read the synthetic page through the production video-to-frame crop in 390×844 and selected Boston Tea Party (99% preset-match score, not OCR confidence). Cropping now accounts for object-fit: cover and recalculates after rotation; it does not read hidden sensor edges. Sampling and OCR use the same rectangle, with the longest output dimension capped at 1280px.
- Interaction checks: success, three unmatched attempts, OCR execution error, permission denial, retry and exit. The fixture reported zero live media tracks after Exit scan and terminated workers after outcomes/exit. Camera permission responses arriving after exit cannot reopen the camera or error state. WebXR cancellation and unsupported DOM Overlay fallback have regression coverage.
- Verification: 54 application tests and 4 Sites tests pass; production build succeeds with all three required Sites outputs. A clean browser session has no warnings/errors. The existing large-bundle build warning remains unchanged. During fixture hot-reload, a duplicate-root warning was observed; the fixture now disposes its React root on reload, and clean-session verification passed.
- Scope: local responsive and functional checks passed. Physical Android/iPhone camera quality, permission UI and safe-area hardware remain manual checks. No Vercel deployment or GitHub push was performed in this update.

final result: passed (local camera-first Scan QA)

## Boston Harbor environment refinement (2026-09-04)

- Scope: modeling and visual treatment only. The interactive target set remains exactly the hooded lantern, East India Company tea chest, Dartmouth and ship carpenter's hatchet; no new learning target or clue data was added.
- Modeling: replaced the box-like Dartmouth hull with a tapered station-built BufferGeometry and added bulwarks, rails, stern cabin, bowsprit, furled sails, rigging and hull trim. The foreground wharf now includes structural stringers, crossbeams, capped pilings and mooring ropes.
- Scene density: added non-interactive period dressing only—a timber loading crane, handcart, sacks, rope coils, puddles, cargo bracing, stone quay, gabled waterfront warehouses, chimneys, window light and two distant harbor sloops.
- Material and atmosphere: generated deterministic local wood grain for dry timber, wet timber and painted hull surfaces; introduced animated subdivided water, moon haze, reflected glints, restrained window warmth and a brighter blue night fill while preserving the low-fog night setting.
- Mobile performance: the 144 deck planks render as two InstancedMesh batches; warehouse windows are instanced per building. Pixel ratio remains capped at 1.6, shadow map at 1024, and decorative ships have no interaction proxies or dynamic shadows.
- Evidence: `qa-harbor-final.png` at 1254×960 and `qa-harbor-landscape.png` at 844×390 show the final real Three.js scene through `/tests/harbor-browser-fixture.html`. The fixture uses the production HarborScene and isolated React state.
- Responsive result: the four gold cues remain visually distinct at both sizes; desktop retains near/mid/far depth and mobile landscape keeps all controls inside the viewport without covering the central investigation corridor.
- Verification: 54 application tests and production build pass. Existing clue identities, audio, explanation cards, hit proxies, drag threshold, device orientation and WebXR session code were not changed. The known large-JavaScript-chunk warning remains.
- Scope boundary: local headless-browser visual QA passed. Physical phone GPU frame pacing, device-orientation motion and immersive WebXR remain manual hardware checks; no Vercel deployment was performed.

final result: passed (local visual and regression QA)

## Boston Harbor skybox and waterfront architecture (2026-09-04)

- Background: removed the camera-facing sky plane and assigned a deterministic six-face `THREE.CubeTexture` to `scene.background`. Night gradients, sparse stars, horizon haze and the moon are now part of a directionally stable sky environment when the user turns.
- Fog: raised exponential scene fog moderately and added five translucent low-altitude fog banks with slow independent drift. The foreground investigation corridor and all four gold clue cues remain readable.
- Architecture: rebuilt each warehouse around an extruded house-shaped facade with a complete triangular gable. Roof pitch and slab length derive from the same rise; each chimney starts at its calculated roof-surface height and has a separate cap, eliminating the former gable penetration.
- Composition: replaced the uniform eleven-building strip with fifteen varied warehouses in staggered near and far rows. Height, width, depth, yaw, facade tone, doors, cornices, timber gable braces and attic windows vary without adding interactive targets.
- Evidence: `qa-harbor-skybox.png` at 1254×960 and `qa-harbor-skybox-landscape.png` at 844×390 render the production HarborScene through `/tests/harbor-browser-fixture.html`.
- Verification: 54 application tests, the production build, all 4 Sites worker tests and `git diff --check` pass. The only build note remains the existing large-JavaScript-chunk warning.
- Scope boundary: local headless-browser visual QA passed. Physical phone GPU frame pacing, device orientation and immersive WebXR still require manual hardware checks; no deployment was performed.

final result: passed (local skybox, fog and architecture QA)
