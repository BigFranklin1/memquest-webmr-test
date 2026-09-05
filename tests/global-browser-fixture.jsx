import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../src/App.jsx";
import "../src/styles.css";
import "../src/archive-refresh.css";
import "../src/interface-theme.css";

// This fixture tests the real App without creating fake achievements in the user's save.
const records = new Map();
const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
createRoot(document.getElementById("root")).render(<React.StrictMode><App storage={storage} initialTab="challenges" /></React.StrictMode>);
