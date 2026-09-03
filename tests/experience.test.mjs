import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyExperienceError,
  createExperienceController,
  EXPERIENCE_MODES,
} from "../src/experience.js";

function createVideo() {
  return {
    muted: false,
    playsInline: false,
    srcObject: null,
    pause() {},
    async play() {},
  };
}

function createStream() {
  const track = { stopped: false, stop() { this.stopped = true; } };
  return { track, getTracks: () => [track] };
}

function createController(env, onStateChange = () => {}) {
  return createExperienceController({
    env,
    videoElement: createVideo(),
    overlayElement: {},
    canvasElement: {},
    onStateChange,
  });
}

test("turns a stalled camera permission request into a recoverable timeout", async () => {
  const controller = createExperienceController({
    env: {
      isSecureContext: true,
      location: { hostname: "example.com" },
      navigator: {
        mediaDevices: { getUserMedia: () => new Promise(() => {}) },
      },
    },
    videoElement: createVideo(),
    overlayElement: {},
    canvasElement: {},
    cameraTimeoutMs: 5,
  });

  const result = await controller.startExperience();
  assert.equal(result.mode, EXPERIENCE_MODES.ERROR);
  assert.equal(result.code, "permission-timeout");
});

test("maps camera permission denial to the denied state", () => {
  const result = classifyExperienceError({ name: "NotAllowedError" }, "camera");
  assert.equal(result.mode, EXPERIENCE_MODES.DENIED);
  assert.equal(result.code, "permission-denied");
});

test("falls back to getUserMedia when immersive AR is unsupported", async () => {
  const stream = createStream();
  let cameraCalls = 0;
  const controller = createController({
    isSecureContext: true,
    location: { hostname: "example.com" },
    navigator: {
      xr: { isSessionSupported: async () => false },
      mediaDevices: {
        getUserMedia: async () => {
          cameraCalls += 1;
          return stream;
        },
      },
    },
  });

  const result = await controller.startExperience();
  assert.equal(result.mode, EXPERIENCE_MODES.CAMERA);
  assert.equal(cameraCalls, 1);
  await controller.stopExperience();
  assert.equal(stream.track.stopped, true);
});

test("forces camera mode for OCR without probing or requesting immersive AR", async () => {
  const stream = createStream();
  let supportChecks = 0;
  let xrRequests = 0;
  let cameraCalls = 0;
  const controller = createController({
    isSecureContext: true,
    location: { hostname: "example.com" },
    navigator: {
      xr: {
        isSessionSupported: async () => {
          supportChecks += 1;
          return true;
        },
        requestSession: async () => {
          xrRequests += 1;
          throw new Error("WebXR should not be requested by Scan");
        },
      },
      mediaDevices: {
        getUserMedia: async () => {
          cameraCalls += 1;
          return stream;
        },
      },
    },
  });

  const result = await controller.startExperience({ preferWebXR: false });
  assert.equal(result.mode, EXPERIENCE_MODES.CAMERA);
  assert.equal(supportChecks, 0);
  assert.equal(xrRequests, 0);
  assert.equal(cameraCalls, 1);
  await controller.stopExperience();
  assert.equal(stream.track.stopped, true);
});

test("retries relaxed camera constraints after an overconstrained error", async () => {
  const constraints = [];
  const stream = createStream();
  const controller = createController({
    isSecureContext: true,
    location: { hostname: "example.com" },
    navigator: {
      mediaDevices: {
        getUserMedia: async (value) => {
          constraints.push(value);
          if (constraints.length === 1) {
            throw Object.assign(new Error("too strict"), { name: "OverconstrainedError" });
          }
          return stream;
        },
      },
    },
  });

  const result = await controller.startExperience();
  assert.equal(result.mode, EXPERIENCE_MODES.CAMERA);
  assert.equal(constraints.length, 2);
  assert.deepEqual(constraints[1], { audio: false, video: true });
});

test("does not issue duplicate camera requests while startup is pending", async () => {
  let resolveStream;
  let cameraCalls = 0;
  const streamPromise = new Promise((resolve) => { resolveStream = resolve; });
  const controller = createController({
    isSecureContext: true,
    location: { hostname: "example.com" },
    navigator: {
      mediaDevices: {
        getUserMedia: async () => {
          cameraCalls += 1;
          return streamPromise;
        },
      },
    },
  });

  const first = controller.startExperience();
  const second = controller.startExperience();
  resolveStream(createStream());
  await Promise.all([first, second]);
  assert.equal(cameraCalls, 1);
});

test("rejects camera startup on an insecure non-localhost page", async () => {
  const states = [];
  const controller = createController({
    isSecureContext: false,
    location: { hostname: "192.168.1.20" },
    navigator: { mediaDevices: {} },
  }, (state) => states.push(state));

  const result = await controller.startExperience();
  assert.equal(result.mode, EXPERIENCE_MODES.ERROR);
  assert.equal(result.code, "insecure-context");
  assert.equal(states.at(-1).code, "insecure-context");
});

test("reports unsupported when no mediaDevices API exists", async () => {
  const controller = createController({
    isSecureContext: true,
    location: { hostname: "example.com" },
    navigator: {},
  });

  const result = await controller.startExperience();
  assert.equal(result.mode, EXPERIENCE_MODES.UNSUPPORTED);
  assert.equal(result.code, "camera-unsupported");
});
