// Developer-only fixture: synthetic camera, real frame crop/controller/reducer, gated OCR.
// No test hook or outcome controls are included in the production entry point.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../src/App.jsx";
import { createExperienceController } from "../src/experience.js";
import { TIMELINE_EVENTS } from "../src/scanData.js";
import { initialScanState, OCR_STATUSES, SCAN_STAGES } from "../src/scanState.js";
import "../src/styles.css";
import "../src/archive-refresh.css";
import "../src/interface-theme.css";
import bostonTeaPartyAnchorImage from "../src/assets/tracking/boston-tea-party-cover.png";
import { getAnchorTargetAssets } from "../src/anchorTargetAssets.js";

const records = new Map();
const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
const fixtureParams = new URLSearchParams(window.location.search);
const fixtureEvent = fixtureParams.get("event") ?? "tea-party";
const fixtureTarget = Math.min(1, Math.max(0, Number(fixtureParams.get("target") ?? 0)));
const fixtureReference = getAnchorTargetAssets(fixtureEvent)?.images[fixtureTarget]?.url ?? bostonTeaPartyAnchorImage;
const directResult = fixtureParams.get("visual") === "result";
let outcome = fixtureParams.get("outcome") ?? "hold";
let releaseReading;
let cameraDenied = false;
let terminated = 0;
let report = () => {};
const streams = [];

async function syntheticStream() {
  const page = document.createElement("canvas");
  page.width = 1920;
  page.height = 1080;
  const ctx = page.getContext("2d");
  ctx.fillStyle = "#705944";
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.fillStyle = "#f5efdf";
  ctx.fillRect(610, 25, 700, 1030);
  ctx.fillStyle = "#302b24";
  ctx.textAlign = "center";
  ctx.font = "22px Georgia";
  ctx.fillText("THE AMERICAN REVOLUTION", 960, 245);
  ctx.font = "bold 38px Georgia";
  ctx.fillText("Boston Tea Party", 960, 370);
  ctx.font = "27px Georgia";
  ctx.fillText("December 16, 1773", 960, 430);
  ctx.font = "22px Georgia";
  ["Colonists protested the tax on tea.", "Tea chests were emptied into", "Boston Harbor as an act of resistance."].forEach((line, index) => ctx.fillText(line, 960, 520 + index * 42));
  ctx.font = "17px sans-serif";
  ctx.fillStyle = "#6c6459";
  ctx.fillText("SYNTHETIC CAMERA · LAYOUT TEST", 960, 900);

  const anchorTarget = new Image();
  anchorTarget.src = bostonTeaPartyAnchorImage;
  try {
    await anchorTarget.decode();
    ctx.fillStyle = "#d5c29b";
    ctx.fillRect(594, 72, 732, 936);
    ctx.drawImage(anchorTarget, 618, 102, 684, 876);
  } catch {
    // The text fixture still works if the local target image cannot be decoded.
  }

  const stream = page.captureStream(10);
  streams.push(stream);
  return stream;
}

function controllerFactory(options) {
  if (directResult) {
    const state = { mode: "camera", code: null, message: "" };
    options.videoElement.poster = fixtureReference;
    options.videoElement.dataset.fixtureCamera = "reference-image";
    Object.defineProperties(options.videoElement, {
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
    });
    queueMicrotask(() => options.onStateChange(state));
    return {
      get mode() { return state.mode; },
      get state() { return state; },
      probeSupport: async () => false,
      startExperience: async () => state,
      stopExperience: async () => ({ mode: "idle", code: null, message: "" }),
    };
  }

  const controller = createExperienceController({ ...options, env: {
    isSecureContext: true,
    navigator: { mediaDevices: { getUserMedia: async () => {
      if (cameraDenied) throw new DOMException("Camera denied in fixture", "NotAllowedError");
      return syntheticStream();
    } } },
  } });
  return { ...controller, stopExperience: async () => {
    const state = await controller.stopExperience();
    report();
    return state;
  } };
}

function fixtureAnchorTrackerFactory({ onMatrix }) {
  const near = 0.1;
  const far = 100;
  const aspect = 1920 / 1080;
  const focalLength = 1 / Math.tan((54 * Math.PI / 180) / 2);
  const projectionMatrix = [
    focalLength / aspect, 0, 0, 0,
    0, focalLength, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ];
  const sendPose = (index = fixtureTarget) => {
    onMatrix([
      1, 0, 0, 0,
      0, 0.6216, -0.7833, 0,
      0, 0.7833, 0.6216, 0,
      -0.5, -0.3978, -1.7487, 1,
    ], { targetIndex: index, dimensions: [1, index ? 1.28 : 1.5] });
  };
  window.fixtureAnchorPose = (index) => index === null ? onMatrix(null, { targetIndex: Number(document.querySelector(".scan-image-anchor-layer")?.dataset.targetIndex ?? fixtureTarget) }) : sendPose(index);
  const timer = window.setTimeout(sendPose, 220);

  return Promise.resolve({
    inputWidth: 1920,
    inputHeight: 1080,
    dimensions: [1, 1.28],
    projectionMatrix,
    stop() { window.clearTimeout(timer); delete window.fixtureAnchorPose; },
  });
}
async function recognizerFactory(onProgress) {
  onProgress({ status: "loading", progress: .5 });
  let cancelled = false;
  return {
    recognize: async () => {
      onProgress({ status: "recognizing text", progress: .35 });
      if (outcome === "hold") await new Promise(resolve => { releaseReading = resolve; });
      if (cancelled) throw new Error("Cancelled fixture recognition");
      if (outcome === "error") throw new Error("Fixture recognition failure");
      return { text: outcome === "match" ? "Boston Tea Party 1773 tea chests in the harbor" : "A recipe for apple pie and fresh orange juice", confidence: 94 };
    },
    terminate: async () => { cancelled = true; terminated += 1; releaseReading?.(); releaseReading = undefined; report(); },
  };
}

function Fixture() {
  const [, refresh] = useState(0);
  const [realOcr, setRealOcr] = useState(false);
  report = () => refresh(value => value + 1);
  const choose = next => { outcome = next; releaseReading?.(); releaseReading = undefined; refresh(value => value + 1); };
  useEffect(() => {
    if (fixtureParams.get("autorun") !== "scan") return undefined;
    const timer = window.setInterval(() => {
      const scanButton = [...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Scan");
      if (!scanButton) return;
      window.clearInterval(timer);
      scanButton.click();
    }, 60);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (fixtureParams.get("anchor") !== "on") return undefined;
    const timer = window.setInterval(() => {
      const anchorSwitch = document.querySelector('button[role="switch"][title*="book cover"]');
      if (!anchorSwitch || anchorSwitch.disabled || anchorSwitch.getAttribute("aria-checked") === "true") return;
      window.clearInterval(timer);
      anchorSwitch.click();
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  return <>
    <App
      storage={storage}
      initialTab={directResult ? "scan" : "welcome"}
      initialScanStateOverride={directResult ? {
        ...initialScanState,
        stage: SCAN_STAGES.RESULT,
        ocrStatus: OCR_STATUSES.MATCHED,
        selectedEventId: fixtureEvent,
        matchedEventId: fixtureEvent,
        matchConfidence: 94,
        ocrConfidence: 94,
        recognizedTextExcerpt: TIMELINE_EVENTS.find(event => event.id === fixtureEvent)?.title ?? "Historical event",
      } : undefined}
      experienceControllerFactory={controllerFactory}
      recognizerFactory={realOcr ? undefined : recognizerFactory}
      imageAnchorTrackerFactory={directResult ? fixtureAnchorTrackerFactory : undefined}
    />
    <details style={{ position: "fixed", zIndex: 100, right: 8, top: "48%", font: "10px sans-serif", color: "white", background: "#142033", padding: 5 }}>
      <summary>QA</summary>
      <div style={{ display: "grid", gap: 4, padding: 6 }}>
        <label><input type="checkbox" checked={realOcr} onChange={event => setRealOcr(event.target.checked)} />Use real OCR</label>
        {["hold", "match", "unmatched", "error"].map(value => <button key={value} onClick={() => choose(value)}>{value}</button>)}
        <button onClick={() => { cameraDenied = !cameraDenied; refresh(value => value + 1); }}>Permission: {cameraDenied ? "denied" : "allowed"}</button>
        <output>Workers terminated: {terminated}; live tracks: {streams.flatMap(stream => stream.getTracks()).filter(track => track.readyState === "live").length}</output>
      </div>
    </details>
  </>;
}
const root = createRoot(document.getElementById("root"));
root.render(<React.StrictMode><Fixture /></React.StrictMode>);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
