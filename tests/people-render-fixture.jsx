import React, { useReducer } from "react";
import { createRoot } from "react-dom/client";
import { LibraryExperience } from "../src/LibraryExperience.jsx";
import { PeopleView } from "../src/PeopleView.jsx";
import { initialLibraryState, libraryReducer } from "../src/libraryState.js";
import "../src/styles.css";
import "../src/archive-refresh.css";
import "../src/interface-theme.css";

const dossierOnly = new URLSearchParams(location.search).get("mode") === "dossier";
function Fixture() {
  const [state, dispatch] = useReducer(libraryReducer, { ...initialLibraryState, stage: "overview", activeSection: "people" });
  return dossierOnly
    ? <PeopleView state={state} dispatch={dispatch} />
    : <main className="experience-app has-library-workspace"><section className="library-shell"><LibraryExperience state={state} dispatch={dispatch} onUnavailable={() => {}} /></section></main>;
}
createRoot(document.getElementById("root")).render(<Fixture />);

// Measure real rendered DOM inside the fixed-size iframe, never application storage.
setInterval(() => {
  const view = document.querySelector('.people-dossier');
  if (!view) return;
  const rect = (selector) => { const element = document.querySelector(selector); if (!element) return null; const box = element.getBoundingClientRect(); return { x: Math.round(box.x), top: Math.round(box.top), width: Math.round(box.width), bottom: Math.round(box.bottom) }; };
  const nodes = [...document.querySelectorAll('.people-network-node')].map((element) => element.getBoundingClientRect());
  const map = document.querySelector('.people-network-map')?.getBoundingClientRect();
  parent.postMessage({ type: 'people-layout', metrics: { viewport: [innerWidth, innerHeight], contentHeight: view.scrollHeight, horizontalOverflow: view.scrollWidth > view.clientWidth, heading: rect('.people-archive-heading'), tabs: rect('.revolution-mobile-tabs'), hero: rect('.people-hero'), grid: rect('.people-study-grid'), networkNodesContained: nodes.every((box) => box.left >= map.left && box.right <= map.right && box.top >= map.top && box.bottom <= map.bottom), overflowNodes: nodes.map((box, index) => ({ index, bottomOverflow: Math.round(box.bottom-map.bottom), leftOverflow: Math.round(map.left-box.left), rightOverflow: Math.round(box.right-map.right) })).filter((box) => box.bottomOverflow > 0 || box.leftOverflow > 0 || box.rightOverflow > 0) } }, location.origin);
}, 750);
