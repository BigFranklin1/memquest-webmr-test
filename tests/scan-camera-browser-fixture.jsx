// Developer-only fixture: synthetic camera, real frame crop/controller/reducer, gated OCR.
// No test hook or outcome controls are included in the production entry point.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../src/App.jsx";
import { createExperienceController } from "../src/experience.js";
import "../src/styles.css";
import "../src/archive-refresh.css";

const records = new Map();
const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
let outcome = "hold";
let releaseReading;
let cameraDenied = false;
let terminated = 0;
let report = () => {};
const streams = [];

function syntheticStream() {
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
  const stream = page.captureStream(10);
  streams.push(stream);
  return stream;
}

function controllerFactory(options) {
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
  return <>
    <App storage={storage} experienceControllerFactory={controllerFactory} recognizerFactory={realOcr ? undefined : recognizerFactory} />
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
