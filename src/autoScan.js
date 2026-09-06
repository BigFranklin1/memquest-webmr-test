// One winner per session. OCR and image matching share a compute gate, not a camera.
export function createAutoScan({ createOcr, createSearch, targets, onMatch, onConflict,
  onNoMatch, onError, onStatus = () => {}, imageEnabled = true,
  setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now }) {
  let active = false, scanner, search, timer, deadline, headStart, settle, busy = false;
  let candidate = null, repeats = 0, pendingText = null, textDone = false, textError = false, noMatchDetails = {};
  const abort = new AbortController();
  const stop = () => { active = false; abort.abort(); clearTimer(timer); clearTimer(deadline); clearTimer(headStart); clearTimer(settle); scanner?.stop(); search?.stop(); };
  const finish = result => { if (!active) return; stop(); onMatch(result); };
  const noResult = () => { if (!active) return; stop(); textError ? onError() : onNoMatch(noMatchDetails); };
  const imageResult = index => {
    const target = targets[index];
    if (!target || !active) return;
    const result = { eventId: target.eventId, recognitionSource: 'image', confidence: null,
      recognizedTextExcerpt: target.label, targetId: target.id };
    if (pendingText && pendingText.eventId !== result.eventId) {
      const text = pendingText; stop(); onConflict([result, text]);
    } else finish(result);
  };
  const loop = async () => {
    if (!active) return;
    if (search && !busy) {
      busy = true;
      try {
        const index = await search.detect();
        if (!active) return;
        repeats = index !== null && index === candidate ? repeats + 1 : index === null ? 0 : 1;
        candidate = index;
        if (repeats >= 3) imageResult(index);
      } catch { search.stop(); search = null; onStatus('Image matching unavailable · Text only'); if (pendingText) finish(pendingText); else if (textDone) noResult(); }
      finally { busy = false; }
    }
    if (active) timer = setTimer(loop, 400);
  };
  const withCompute = async task => {
    while (active && busy) await new Promise(resolve => setTimer(resolve, 40));
    if (!active) throw Object.assign(new Error('Cancelled'), { name: 'AbortError' });
    busy = true;
    try { return await task(); } finally { busy = false; }
  };
  return { stop, async start() {
    active = true;
    deadline = setTimer(noResult, 45000);
    scanner = createOcr({ withCompute,
      onMatch: result => {
        if (!active) return;
        textDone = true; pendingText = { ...result, recognitionSource: 'text' };
        if (!imageEnabled || !search) finish(pendingText);
        else { onStatus('Text matched · Checking reference image'); settle = setTimer(() => finish(pendingText), 1800); }
      },
      onNoMatch: result => { textDone = true; noMatchDetails = result; if (!imageEnabled || !search) noResult(); else { onStatus('No text match · Checking covers'); settle = setTimer(noResult, 5000); } },
      onError: () => { textDone = true; textError = true; if (!imageEnabled || !search) noResult(); else { onStatus('Text unavailable · Checking covers'); settle = setTimer(noResult, 5000); } },
    });
    // Give image initialization a bounded head start; OCR remains usable on failure.
    if (imageEnabled) {
      onStatus('Preparing reference images');
      headStart = setTimer(() => { if (active) { onStatus('Loading slowly · Text recognition available'); scanner.start(); } }, 3500);
      try { search = await createSearch(abort.signal); if (!active) { search.stop(); return; } }
      catch { if (!active) return; onStatus('Image matching unavailable · Text only'); }
      clearTimer(headStart);
    }
    if (!active) return;
    scanner.start(); loop();
  } };
}
