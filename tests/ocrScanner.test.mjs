import assert from "node:assert/strict";
import test from "node:test";
import { calculateCaptureRegion, calculateFrameDifference, createFrameTools, createOcrScanner } from "../src/ocrScanner.js";

test("portrait crop is the visible frame, not the hidden edges of the camera sensor", () => {
  const view = { left: 0, top: 0, width: 390, height: 844 };
  const frame = { left: 18, top: 96, width: 354, height: 632 };
  const crop = calculateCaptureRegion(1920, 1080, view, frame);
  const scale = 844 / 1080;
  assert.ok(Math.abs(crop.width - 354 / scale) < .001);
  assert.ok(Math.abs(crop.height - 632 / scale) < .001);
  assert.ok(Math.abs(crop.x + crop.width / 2 - 960) < .001);
  assert.ok(crop.x > 700, "unseen left side of sensor must not be recognized");
});

test("landscape crop handles cover, viewport offsets and frame clipping", () => {
  const view = { left: 20, top: 10, width: 844, height: 390 };
  const crop = calculateCaptureRegion(1920, 1080, view, { left: 50, top: 78, width: 784, height: 240 });
  assert.ok(Math.abs(crop.x - 30 / (844 / 1920)) < .001);
  assert.ok(crop.y > 100);
  const clipped = calculateCaptureRegion(100, 100, { left: 0, top: 0, width: 100, height: 100 }, { left: -20, top: -20, width: 140, height: 140 });
  assert.deepEqual(clipped, { x: 0, y: 0, width: 100, height: 100 });
  assert.equal(calculateCaptureRegion(0, 0, view), null);
  assert.equal(calculateCaptureRegion(1920, 1080, view, { left: 1000, top: 0, width: 20, height: 20 }), null);
});

test("sampling and OCR share the frame crop, adapt on rotation and cap the longest side", () => {
  const calls = [];
  const context = { drawImage: (...args) => calls.push(args), getImageData: () => ({ data: new Uint8Array(64 * 48 * 4) }) };
  const doc = { createElement: () => ({ getContext: () => context }) };
  let view = { left: 0, top: 0, width: 390, height: 844 };
  let frame = { left: 18, top: 96, width: 354, height: 632 };
  const video = { videoWidth: 1920, videoHeight: 1080, readyState: 4, getBoundingClientRect: () => view };
  const frameTools = createFrameTools(doc, () => frame);
  frameTools.sample(video);
  const portrait = frameTools.capture(video);
  assert.deepEqual(calls[0].slice(1, 5), calls[1].slice(1, 5));
  assert.equal(portrait.height, 1280);
  assert.ok(Math.abs(portrait.width / portrait.height - frame.width / frame.height) < .001);
  view = { left: 0, top: 0, width: 844, height: 390 };
  frame = { left: 30, top: 68, width: 784, height: 240 };
  const landscape = frameTools.capture(video);
  assert.equal(landscape.width, 1280);
  assert.ok(landscape.height < 400);
  assert.notDeepEqual(calls[1].slice(1, 5), calls[2].slice(1, 5));
});

function waitFor(setup, timeoutMs = 500) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for scanner callback")), timeoutMs);
    setup((value) => {
      clearTimeout(timeout);
      resolve(value);
    });
  });
}

function stableFrameTools() {
  const pixels = new Uint8Array([12, 24, 36, 48]);
  return {
    sample: () => pixels,
    capture: () => ({ frame: "central-crop" }),
  };
}

const FAST_OPTIONS = Object.freeze({
  stabilityIntervalMs: 1,
  retryDelayMs: 1,
  forceCaptureAfterMs: 20,
  maxAttempts: 3,
});

test("calculates a mean grayscale frame difference", () => {
  assert.equal(calculateFrameDifference(new Uint8Array([0, 10]), new Uint8Array([10, 20])), 10);
  assert.equal(calculateFrameDifference(null, new Uint8Array([10])), Infinity);
});

test("matches a stable frame once and terminates the reused recognizer", async () => {
  let recognizeCalls = 0;
  let terminateCalls = 0;
  const result = await waitFor((done) => {
    const scanner = createOcrScanner({
      videoElement: {},
      frameTools: stableFrameTools(),
      options: FAST_OPTIONS,
      recognizerFactory: async () => ({
        recognize: async () => {
          recognizeCalls += 1;
          return { text: "Boston Tea Party 1773 tea chests in the harbor", confidence: 92 };
        },
        terminate: async () => { terminateCalls += 1; },
      }),
      onMatch: done,
      onError: (error) => { throw error; },
    });
    scanner.start();
  });

  assert.equal(result.eventId, "tea-party");
  assert.equal(result.attemptCount, 1);
  assert.equal(result.ocrConfidence, 92);
  assert.equal(recognizeCalls, 1);
  assert.equal(terminateCalls, 1);
});

test("runs at most one OCR job at a time and stops after three misses", async () => {
  let activeJobs = 0;
  let maximumConcurrency = 0;
  let recognizeCalls = 0;
  let terminateCalls = 0;
  const result = await waitFor((done) => {
    const scanner = createOcrScanner({
      videoElement: {},
      frameTools: stableFrameTools(),
      options: FAST_OPTIONS,
      recognizerFactory: async () => ({
        recognize: async () => {
          recognizeCalls += 1;
          activeJobs += 1;
          maximumConcurrency = Math.max(maximumConcurrency, activeJobs);
          await new Promise((resolve) => setTimeout(resolve, 3));
          activeJobs -= 1;
          return { text: `Unrelated archive page ${recognizeCalls}`, confidence: 71 };
        },
        terminate: async () => { terminateCalls += 1; },
      }),
      onNoMatch: done,
      onError: (error) => { throw error; },
    });
    scanner.start();
  });

  assert.equal(result.attemptCount, 3);
  assert.equal(recognizeCalls, 3);
  assert.equal(maximumConcurrency, 1);
  assert.equal(terminateCalls, 1);
});

test("ignores a recognition result that resolves after cancellation", async () => {
  let resolveRecognition;
  let terminateCalls = 0;
  let deliveredCallbacks = 0;
  let scanner;
  const recognitionStarted = new Promise((resolve) => {
    scanner = createOcrScanner({
      videoElement: {},
      frameTools: stableFrameTools(),
      options: FAST_OPTIONS,
      recognizerFactory: async () => ({
        recognize: () => {
          resolve();
          return new Promise((resolveResult) => { resolveRecognition = resolveResult; });
        },
        terminate: async () => { terminateCalls += 1; },
      }),
      onMatch: () => { deliveredCallbacks += 1; },
      onNoMatch: () => { deliveredCallbacks += 1; },
      onError: () => { deliveredCallbacks += 1; },
    });
    scanner.start();
  });

  await recognitionStarted;
  await scanner.stop();
  resolveRecognition({ text: "Boston Massacre 1770", confidence: 90 });
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(deliveredCallbacks, 0);
  assert.equal(terminateCalls, 1);
});
