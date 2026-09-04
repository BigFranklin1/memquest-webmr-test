import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { HarborScene } from "../src/HarborScene.jsx";
import "../src/styles.css";
import "../src/archive-refresh.css";

function HarborFixture() {
  const [discovered, setDiscovered] = useState([]);
  const [selected, setSelected] = useState(null);
  return (
    <HarborScene
      discoveredClueIds={discovered}
      selectedClueId={selected}
      onDiscover={(id) => {
        setSelected(id);
        setDiscovered((current) => current.includes(id) ? current : [...current, id]);
      }}
      onCloseClue={() => setSelected(null)}
      onExplain={() => {}}
      onExit={() => {}}
    />
  );
}

createRoot(document.getElementById("root")).render(<HarborFixture />);
