import assert from "node:assert/strict";
import test from "node:test";
import { calculateFrameDifference, createOcrScanner } from "../src/ocrScanner.js";

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
