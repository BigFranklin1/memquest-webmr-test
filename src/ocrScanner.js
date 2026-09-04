import { createTextExcerpt, matchHistoricalEvent } from "./scanMatcher.js";

async function loadLocalEnglishRecognizer(onProgress) {
  const { createLocalEnglishRecognizer } = await import("./ocrRuntime.js");
  return createLocalEnglishRecognizer(onProgress);
}

const DEFAULTS = Object.freeze({
  stabilityIntervalMs: 450,
  retryDelayMs: 1_200,
  forceCaptureAfterMs: 8_000,
  stabilityThreshold: 18,
  maxAttempts: 3,
});

// Map the visible reading frame back through object-fit: cover to sensor pixels.
// A portrait phone only shows a narrow slice of a landscape camera stream.
export function calculateCaptureRegion(videoWidth, videoHeight, videoBounds, captureBounds) {
  if (!(videoWidth > 0 && videoHeight > 0 && videoBounds?.width > 0 && videoBounds?.height > 0)) return null;
  const view = videoBounds;
  const frame = captureBounds ?? {
    left: view.left + view.width * 0.07,
    top: view.top + view.height * 0.22,
    width: view.width * 0.86,
    height: view.height * 0.56,
  };
  const left = Math.max(view.left, frame.left);
  const top = Math.max(view.top, frame.top);
  const right = Math.min(view.left + view.width, frame.left + frame.width);
  const bottom = Math.min(view.top + view.height, frame.top + frame.height);
  if (!(right > left && bottom > top)) return null;
  const scale = Math.max(view.width / videoWidth, view.height / videoHeight);
  const offsetX = (videoWidth * scale - view.width) / 2;
  const offsetY = (videoHeight * scale - view.height) / 2;
  return {
    x: (left - view.left + offsetX) / scale,
    y: (top - view.top + offsetY) / scale,
    width: (right - left) / scale,
    height: (bottom - top) / scale,
  };
}

function drawRegion(videoElement, canvas, region, width, height, filter = "none") {
  if (!region || videoElement.readyState < 2) return null;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.filter = filter;
  context.drawImage(videoElement, region.x, region.y, region.width, region.height, 0, 0, width, height);
  context.filter = "none";
  return context;
}

export function createFrameTools(documentObject = document, getCaptureBounds = () => null) {
  const stabilityCanvas = documentObject.createElement("canvas");
  const recognitionCanvas = documentObject.createElement("canvas");
  const getRegion = (video) => calculateCaptureRegion(
    video.videoWidth,
    video.videoHeight,
    video.getBoundingClientRect?.() ?? { left: 0, top: 0, width: video.clientWidth || video.videoWidth, height: video.clientHeight || video.videoHeight },
    getCaptureBounds(),
  );

  return {
    sample(videoElement) {
      const context = drawRegion(videoElement, stabilityCanvas, getRegion(videoElement), 64, 48, "grayscale(1)");
      if (!context) return null;
      const pixels = context.getImageData(0, 0, 64, 48).data;
      const sample = new Uint8Array(64 * 48);
      for (let pixelIndex = 0, sampleIndex = 0; pixelIndex < pixels.length; pixelIndex += 4, sampleIndex += 1) {
        sample[sampleIndex] = pixels[pixelIndex];
      }
      return sample;
    },
    capture(videoElement) {
      const region = getRegion(videoElement);
      if (!region) throw new Error("Camera frame is not ready");
      const scale = 1280 / Math.max(region.width, region.height);
      const width = Math.max(1, Math.round(region.width * scale));
      const height = Math.max(1, Math.round(region.height * scale));
      const context = drawRegion(videoElement, recognitionCanvas, region, width, height, "grayscale(1) contrast(1.35)");
      if (!context) throw new Error("Camera frame is not ready");
      return recognitionCanvas;
    },
  };
}

export function calculateFrameDifference(previous, current) {
  if (!previous || !current || previous.length !== current.length || current.length === 0) return Infinity;
  let total = 0;
  for (let index = 0; index < current.length; index += 1) total += Math.abs(previous[index] - current[index]);
  return total / current.length;
}

export function createOcrScanner({
  videoElement,
  onProgress = () => {},
  onMatch = () => {},
  onNoMatch = () => {},
  onError = () => {},
  recognizerFactory = loadLocalEnglishRecognizer,
  frameTools = createFrameTools(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  now = () => performance.now(),
  options = {},
}) {
  const settings = { ...DEFAULTS, ...options };
  let active = false;
  let generation = 0;
  let timerId = null;
  let recognizer = null;
  let recognizerPromise = null;
  let previousSample = null;
  let stableComparisons = 0;
  let attemptCount = 0;
  let startedAt = 0;
  let processing = false;

  const clearScheduled = () => {
    if (timerId !== null) clearTimer(timerId);
    timerId = null;
  };

  const terminateRecognizer = async () => {
    const current = recognizer;
    recognizer = null;
    recognizerPromise = null;
    if (current) await current.terminate().catch(() => {});
  };

  const stop = async () => {
    active = false;
    generation += 1;
    clearScheduled();
    await terminateRecognizer();
  };

  const schedule = (callback, delay) => {
    clearScheduled();
    timerId = setTimer(callback, delay);
  };

  const ensureRecognizer = (runGeneration) => {
    if (recognizerPromise) return recognizerPromise;
    recognizerPromise = recognizerFactory((message) => {
      if (!active || generation !== runGeneration) return;
      const progress = Number.isFinite(message?.progress) ? message.progress : 0;
      const status = message?.status?.includes("recognizing") ? "recognizing" : "loading";
      onProgress({ status, progress, attemptCount });
    }).then((createdRecognizer) => {
      if (!active || generation !== runGeneration) {
        createdRecognizer.terminate().catch(() => {});
        throw Object.assign(new Error("OCR scan cancelled"), { name: "AbortError" });
      }
      recognizer = createdRecognizer;
      return createdRecognizer;
    });
    return recognizerPromise;
  };

  const analyze = async (runGeneration) => {
    if (!active || generation !== runGeneration || processing) return;
    processing = true;
    onProgress({ status: "recognizing", progress: 0, attemptCount });

    try {
      const frame = frameTools.capture(videoElement);
      const activeRecognizer = await ensureRecognizer(runGeneration);
      const result = await activeRecognizer.recognize(frame);
      if (!active || generation !== runGeneration) return;

      attemptCount += 1;
      const eventMatch = matchHistoricalEvent(result.text);
      const recognizedTextExcerpt = createTextExcerpt(result.text);
      if (eventMatch) {
        onMatch({
          ...eventMatch,
          recognizedTextExcerpt,
          ocrConfidence: Math.round(result.confidence || 0),
          attemptCount,
        });
        await stop();
        return;
      }

      if (attemptCount >= settings.maxAttempts) {
        onNoMatch({ recognizedTextExcerpt, attemptCount });
        await stop();
        return;
      }

      previousSample = null;
      stableComparisons = 0;
      processing = false;
      onProgress({ status: "stabilizing", progress: 0, attemptCount });
      schedule(() => checkStability(runGeneration), settings.retryDelayMs);
    } catch (error) {
      if (error?.name === "AbortError" || !active || generation !== runGeneration) return;
      onError(error);
      await stop();
    } finally {
      processing = false;
    }
  };

  const checkStability = (runGeneration) => {
    if (!active || generation !== runGeneration || processing) return;
    const sample = frameTools.sample(videoElement);
    if (sample) {
      const difference = calculateFrameDifference(previousSample, sample);
      stableComparisons = difference <= settings.stabilityThreshold ? stableComparisons + 1 : 0;
      previousSample = sample;
      const forced = now() - startedAt >= settings.forceCaptureAfterMs;
      if (stableComparisons >= 1 || forced) {
        analyze(runGeneration);
        return;
      }
    }
    onProgress({ status: "stabilizing", progress: 0, attemptCount });
    schedule(() => checkStability(runGeneration), settings.stabilityIntervalMs);
  };

  const start = () => {
    if (active) return;
    active = true;
    generation += 1;
    const runGeneration = generation;
    startedAt = now();
    attemptCount = 0;
    previousSample = null;
    stableComparisons = 0;
    processing = false;
    onProgress({ status: "loading", progress: 0, attemptCount: 0 });
    ensureRecognizer(runGeneration).catch((error) => {
      if (error?.name !== "AbortError" && active && generation === runGeneration) {
        onError(error);
        stop();
      }
    });
    checkStability(runGeneration);
  };

  return {
    start,
    stop,
    get active() {
      return active;
    },
  };
}
