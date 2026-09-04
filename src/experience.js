export const EXPERIENCE_MODES = Object.freeze({
  IDLE: "idle",
  STARTING: "starting",
  WEBXR: "webxr",
  CAMERA: "camera",
  DENIED: "denied",
  UNSUPPORTED: "unsupported",
  ERROR: "error",
});

const RECOVERABLE_XR_ERRORS = new Set([
  "NotSupportedError",
  "InvalidStateError",
  "OperationError",
]);

export function classifyExperienceError(error, stage = "camera") {
  const name = error?.name ?? "UnknownError";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      mode: EXPERIENCE_MODES.DENIED,
      code: "permission-denied",
      message: stage === "webxr"
        ? "AR access was denied. Allow camera and spatial tracking in your browser settings, then try again."
        : "Camera access was denied. Allow it in your browser settings, then try again.",
    };
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      mode: EXPERIENCE_MODES.UNSUPPORTED,
      code: "camera-not-found",
      message: "No available camera was found, or the camera is disabled by the system.",
    };
  }

  if (name === "SecurityError") {
    return {
      mode: EXPERIENCE_MODES.ERROR,
      code: "security-error",
      message: "The browser blocked secure access. Open this page over HTTPS and allow camera access.",
    };
  }

  if (name === "TimeoutError") {
    return {
      mode: EXPERIENCE_MODES.ERROR,
      code: "permission-timeout",
      message: "The permission prompt did not respond. Check the browser prompt, then try again.",
    };
  }

  return {
    mode: EXPERIENCE_MODES.ERROR,
    code: "startup-failed",
    message: "The experience could not start. Close other apps using the camera, then try again.",
  };
}

function insecureState() {
  return {
    mode: EXPERIENCE_MODES.ERROR,
    code: "insecure-context",
    message: "Open this page over HTTPS to use the camera and WebXR.",
  };
}

function unsupportedState() {
  return {
    mode: EXPERIENCE_MODES.UNSUPPORTED,
    code: "camera-unsupported",
    message: "This browser does not support camera access. Update the browser or use another device.",
  };
}

export function createExperienceController({
  env,
  videoElement,
  overlayElement,
  canvasElement,
  onStateChange = () => {},
  cameraTimeoutMs = 20_000,
}) {
  const runtime = env ?? window;
  let state = { mode: EXPERIENCE_MODES.IDLE, code: null, message: "" };
  let stream = null;
  let xrSession = null;
  let xrSupportPromise = null;
  let startPromise = null;
  let stopping = false;
  let generation = 0;

  const assertCurrent = (run) => {
    if (run !== generation) throw Object.assign(new Error("Experience cancelled"), { name: "AbortError" });
  };

  const setState = (nextState) => {
    state = { code: null, message: "", ...nextState };
    onStateChange(state);
    return state;
  };

  const probeSupport = () => {
    if (xrSupportPromise) return xrSupportPromise;

    const xr = runtime.navigator?.xr;
    xrSupportPromise = xr?.isSessionSupported
      ? Promise.resolve(xr.isSessionSupported("immersive-ar")).catch(() => false)
      : Promise.resolve(false);
    return xrSupportPromise;
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    if (videoElement) {
      videoElement.pause?.();
      videoElement.srcObject = null;
    }
  };

  const handleXrEnded = () => {
    xrSession = null;
    if (!stopping) setState({ mode: EXPERIENCE_MODES.IDLE });
  };

  const configureXrLayer = async (session) => {
    const options = {
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: false,
      xrCompatible: true,
    };
    const gl = canvasElement?.getContext?.("webgl2", options)
      ?? canvasElement?.getContext?.("webgl", options);

    if (!gl || !runtime.XRWebGLLayer) {
      const error = new Error("XR WebGL layer is unavailable");
      error.name = "NotSupportedError";
      throw error;
    }

    if (gl.makeXRCompatible) await gl.makeXRCompatible();
    const baseLayer = new runtime.XRWebGLLayer(session, gl, { alpha: true });
    session.updateRenderState({ baseLayer });
    await session.requestReferenceSpace("local");

    const renderFrame = () => {
      if (session !== xrSession) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, baseLayer.framebuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      session.requestAnimationFrame(renderFrame);
    };

    session.requestAnimationFrame(renderFrame);
  };

  const startWebXr = async (run) => {
    const supported = await probeSupport();
    assertCurrent(run);
    if (!supported) return false;
    let session;

    try {
      session = await runtime.navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["dom-overlay"],
        optionalFeatures: ["local-floor"],
        domOverlay: { root: overlayElement },
      });
      assertCurrent(run);
      xrSession = session;
      session.addEventListener("end", () => {
        if (xrSession === session) handleXrEnded();
      }, { once: true });
      await configureXrLayer(session);
      assertCurrent(run);
      setState({ mode: EXPERIENCE_MODES.WEBXR });
      return true;
    } catch (error) {
      if (session) {
        if (xrSession === session) xrSession = null;
        try {
          await session.end();
        } catch {
          // The browser may already have ended a partially configured session.
        }
      }
      assertCurrent(run);
      if (RECOVERABLE_XR_ERRORS.has(error?.name)) return false;
      throw Object.assign(error ?? new Error("WebXR failed"), { experienceStage: "webxr" });
    }
  };

  const requestCameraStream = async () => {
    const mediaDevices = runtime.navigator?.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      throw Object.assign(new Error("Camera unsupported"), { name: "CameraUnsupportedError" });
    }

    const preferredConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    };

    const requestWithTimeout = async (constraints) => {
      let timedOut = false;
      let timeoutId;
      const setTimer = runtime.setTimeout?.bind(runtime) ?? setTimeout;
      const clearTimer = runtime.clearTimeout?.bind(runtime) ?? clearTimeout;
      const mediaPromise = Promise.resolve(mediaDevices.getUserMedia(constraints));
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimer(() => {
          timedOut = true;
          reject(Object.assign(new Error("Camera permission timed out"), { name: "TimeoutError" }));
        }, cameraTimeoutMs);
      });

      try {
        return await Promise.race([mediaPromise, timeoutPromise]);
      } finally {
        clearTimer(timeoutId);
        if (timedOut) {
          mediaPromise.then((lateStream) => {
            lateStream.getTracks().forEach((track) => track.stop());
          }).catch(() => {});
        }
      }
    };

    try {
      return await requestWithTimeout(preferredConstraints);
    } catch (error) {
      if (error?.name !== "OverconstrainedError" && error?.name !== "ConstraintNotSatisfiedError") {
        throw error;
      }
      return requestWithTimeout({ audio: false, video: true });
    }
  };

  const startCamera = async (run) => {
    assertCurrent(run);
    if (!runtime.navigator?.mediaDevices?.getUserMedia) {
      setState(unsupportedState());
      return false;
    }

    const acquiredStream = await requestCameraStream();
    if (run !== generation) {
      acquiredStream.getTracks().forEach((track) => track.stop());
      assertCurrent(run);
    }
    stream = acquiredStream;
    videoElement.srcObject = stream;
    videoElement.muted = true;
    videoElement.playsInline = true;
    await videoElement.play();
    assertCurrent(run);
    setState({ mode: EXPERIENCE_MODES.CAMERA });
    return true;
  };

  const runStart = async ({ preferWebXR = true } = {}) => {
    const run = ++generation;
    setState({ mode: EXPERIENCE_MODES.STARTING });

    if (runtime.isSecureContext === false && runtime.location?.hostname !== "localhost") {
      setState(insecureState());
      return state;
    }

    try {
      if (preferWebXR && await startWebXr(run)) return state;
      await startCamera(run);
      return state;
    } catch (error) {
      if (run !== generation) return state;
      stopCamera();
      if (error?.name === "CameraUnsupportedError") return setState(unsupportedState());
      return setState(classifyExperienceError(error, error?.experienceStage ?? "camera"));
    }
  };

  const startExperience = ({ preferWebXR = true } = {}) => {
    if (state.mode === EXPERIENCE_MODES.WEBXR || state.mode === EXPERIENCE_MODES.CAMERA) {
      return Promise.resolve(state);
    }
    if (startPromise) return startPromise;

    const pending = runStart({ preferWebXR }).finally(() => {
      if (startPromise === pending) startPromise = null;
    });
    startPromise = pending;
    return startPromise;
  };

  const stopExperience = async () => {
    if (stopping) return state;
    const run = ++generation;
    startPromise = null;
    stopping = true;
    stopCamera();

    const session = xrSession;
    xrSession = null;
    if (session) {
      try {
        await session.end();
      } catch {
        // Session teardown should not prevent UI recovery.
      }
    }

    stopping = false;
    if (run !== generation) return state;
    return setState({ mode: EXPERIENCE_MODES.IDLE });
  };

  return {
    get mode() {
      return state.mode;
    },
    get state() {
      return state;
    },
    probeSupport,
    startExperience,
    stopExperience,
  };
}
