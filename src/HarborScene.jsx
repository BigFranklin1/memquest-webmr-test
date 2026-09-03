import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsOut,
  CaretDown,
  Clock,
  Compass,
  Eye,
  GridFour,
  HandTap,
  Headset,
  MapPin,
  Pause,
  SlidersHorizontal,
  SpeakerHigh,
  X,
} from "@phosphor-icons/react";
import * as THREE from "three";
import dartmouthStory from "./assets/voice/clue-dartmouth.wav";
import hatchetStory from "./assets/voice/clue-hatchet.wav";
import lanternStory from "./assets/voice/clue-lantern.wav";
import teaChestStory from "./assets/voice/clue-tea-chest.wav";
import { HARBOR_CLUES } from "./libraryData.js";

const DEG_TO_RAD = Math.PI / 180;
const CLUE_STORY_AUDIO = Object.freeze({
  lantern: lanternStory,
  "tea-chest": teaChestStory,
  ship: dartmouthStory,
  hatchet: hatchetStory,
});

function clampValue(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getClueCardStyle(anchor, expanded) {
  if (!anchor) return undefined;
  const { x, y, width, height } = anchor;
  const cardWidth = Math.min(width < 520 ? width - 24 : width < 900 ? 340 : 380, width - 24);
  const estimatedHeight = expanded ? (height < 520 ? 286 : 330) : 214;
  const desiredLeft = x <= width / 2 ? x + 18 : x - cardWidth - 18;
  const left = clampValue(desiredLeft, 12, width - cardWidth - 12);
  const topMinimum = height < 520 ? 54 : 88;
  const topMaximum = Math.max(topMinimum, height - estimatedHeight - (height < 520 ? 44 : 62));
  const desiredTop = y - (expanded ? 126 : 78);

  return {
    left: `${Math.round(left)}px`,
    top: `${Math.round(clampValue(desiredTop, topMinimum, topMaximum))}px`,
    width: `${Math.round(cardWidth)}px`,
  };
}

function createHitProxy(hotspotId, geometry, position) {
  const proxy = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
  );
  proxy.position.copy(position);
  proxy.userData.hotspotId = hotspotId;
  proxy.userData.isHitProxy = true;
  return proxy;
}

function createLantern(materials) {
  const group = new THREE.Group();
  const frame = materials.iron;
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffc96a,
    emissive: 0xffa72f,
    emissiveIntensity: 1.8,
    transparent: true,
    opacity: 0.62,
    roughness: 0.16,
    metalness: 0,
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 12), glass);
  glow.position.y = 0.48;
  group.add(glow);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.12, 10), frame);
  base.position.y = 0.08;
  group.add(base);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.22, 8), frame);
  roof.position.y = 0.94;
  group.add(roof);

  for (const x of [-0.25, 0.25]) {
    for (const z of [-0.25, 0.25]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.76, 0.045), frame);
      bar.position.set(x, 0.5, z);
      group.add(bar);
    }
  }

  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.035, 8, 20, Math.PI),
    frame,
  );
  handle.position.y = 1.12;
  handle.rotation.z = Math.PI;
  group.add(handle);

  const light = new THREE.PointLight(0xffa83e, 5.4, 5.5, 2);
  light.position.y = 0.52;
  light.userData.flicker = true;
  group.add(light);
  group.userData.lanternLight = light;
  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function createBarrel(materials) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.9, 14), materials.barrel);
  body.position.y = 0.45;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  for (const y of [0.12, 0.42, 0.78]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.365, 0.025, 6, 18), materials.iron);
    band.position.y = y;
    band.rotation.x = Math.PI / 2;
    group.add(band);
  }
  return group;
}

function createHatchet(materials) {
  const group = new THREE.Group();
  const handleMaterial = materials.mast.clone();
  handleMaterial.color.set(0x5b3921);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.075, 0.82, 10), handleMaterial);
  handle.position.y = 0.4;
  handle.castShadow = true;
  group.add(handle);

  const headShape = new THREE.Shape();
  headShape.moveTo(-0.27, -0.17);
  headShape.lineTo(0.24, -0.105);
  headShape.lineTo(0.24, 0.105);
  headShape.lineTo(-0.27, 0.17);
  headShape.closePath();
  const headGeometry = new THREE.ExtrudeGeometry(headShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.016,
    bevelThickness: 0.016,
  });
  headGeometry.center();
  const head = new THREE.Mesh(headGeometry, materials.iron);
  head.position.set(-0.01, 0.8, 0);
  head.rotation.z = 0.06;
  head.castShadow = true;
  group.add(head);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.14, 10), materials.iron);
  collar.position.y = 0.72;
  group.add(collar);
  group.rotation.z = -0.82;
  group.rotation.y = 0.18;
  return group;
}

function createTeaChest(materials) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.78, 0.9), materials.tea);
  body.position.y = 0.39;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.31, 0.09, 0.96), materials.wood);
  lid.position.y = 0.83;
  lid.rotation.z = -0.025;
  lid.castShadow = true;
  group.add(lid);

  for (const x of [-0.43, 0.43]) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.8, 0.055), materials.mast);
    slat.position.set(x, 0.4, 0.48);
    group.add(slat);
  }
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.07), materials.iron);
  latch.position.set(0, 0.58, 0.5);
  group.add(latch);
  return group;
}

function createShip(materials) {
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.85, 7.2), materials.hull);
  hull.scale.set(1, 1, 1);
  hull.position.y = 0.05;
  hull.castShadow = true;
  hull.receiveShadow = true;
  ship.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.18, 6.8), materials.wood);
  deck.position.y = 0.55;
  deck.receiveShadow = true;
  ship.add(deck);

  for (const mastZ of [-2.15, 0.25, 2.3]) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 6.2, 10), materials.mast);
    mast.position.set(0, 3.2, mastZ);
    mast.castShadow = true;
    ship.add(mast);
    for (const y of [2.35, 3.7, 5]) {
      const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.8, 8), materials.mast);
      spar.position.set(0, y, mastZ);
      spar.rotation.z = Math.PI / 2;
      ship.add(spar);
    }
  }

  const rigPoints = [];
  for (const mastZ of [-2.15, 0.25, 2.3]) {
    rigPoints.push(
      new THREE.Vector3(0, 6.25, mastZ),
      new THREE.Vector3(-1.5, 0.7, mastZ - 1.4),
      new THREE.Vector3(0, 6.25, mastZ),
      new THREE.Vector3(1.5, 0.7, mastZ + 1.4),
    );
  }
  const rigging = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(rigPoints),
    new THREE.LineBasicMaterial({ color: 0x3d3329, transparent: true, opacity: 0.86 }),
  );
  ship.add(rigging);
  return ship;
}

function createHotspot(id, position) {
  const group = new THREE.Group();
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xf7cc4b,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xf7cc4b,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    toneMapped: false,
  });
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdf6f,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    toneMapped: false,
  });
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.37, 36), haloMaterial);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.028, 10, 28),
    ringMaterial,
  );
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.058, 16, 12),
    dotMaterial,
  );
  halo.position.z = -0.005;
  group.add(halo, ring, dot);
  group.position.copy(position);
  group.userData.isMarker = true;
  group.userData.hotspotId = id;
  group.userData.haloMaterial = haloMaterial;
  group.userData.ringMaterial = ringMaterial;
  group.userData.dotMaterial = dotMaterial;
  return group;
}

function createScene({ mount, onSelect, onModeChange, onMotionReady }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050b14);
  scene.fog = new THREE.FogExp2(0x071321, 0.043);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 90);
  camera.position.set(0, 1.62, 5.2);
  camera.rotation.order = "YXZ";

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  renderer.domElement.className = "harbor-canvas";
  renderer.domElement.setAttribute("aria-label", "Interactive 3D reconstruction of Boston Harbor in 1773");
  mount.appendChild(renderer.domElement);

  const materials = {
    wood: new THREE.MeshStandardMaterial({ color: 0x38271c, roughness: 0.88, metalness: 0.03 }),
    wetWood: new THREE.MeshStandardMaterial({ color: 0x241d19, roughness: 0.58, metalness: 0.12 }),
    barrel: new THREE.MeshStandardMaterial({ color: 0x4c3020, roughness: 0.82, metalness: 0.03 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.47, metalness: 0.72 }),
    hull: new THREE.MeshStandardMaterial({ color: 0x15191d, roughness: 0.7, metalness: 0.08 }),
    mast: new THREE.MeshStandardMaterial({ color: 0x332417, roughness: 0.86, metalness: 0 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x4c3322, roughness: 0.84, metalness: 0.02 }),
    tea: new THREE.MeshStandardMaterial({ color: 0x5a3b20, roughness: 0.76, metalness: 0.02, emissive: 0x1e1207 }),
  };

  scene.add(new THREE.HemisphereLight(0x7893b0, 0x05070b, 1));
  const moon = new THREE.DirectionalLight(0x9ab4d7, 1.9);
  moon.position.set(-5, 10, 5);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -11;
  moon.shadow.camera.right = 11;
  moon.shadow.camera.top = 11;
  moon.shadow.camera.bottom = -11;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 35;
  moon.shadow.normalBias = 0.035;
  scene.add(moon);
  const coolFill = new THREE.DirectionalLight(0x6482a7, 1.42);
  coolFill.position.set(4, 5, 7);
  scene.add(coolFill);

  const dock = new THREE.Group();
  for (let row = 0; row < 16; row += 1) {
    for (let col = -4; col <= 4; col += 1) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 1.45), row % 3 === 0 ? materials.wetWood : materials.wood);
      plank.position.set(col * 0.93, -0.08, 5.4 - row * 1.43);
      plank.rotation.y = ((row * 17 + col * 13) % 5 - 2) * 0.0025;
      plank.receiveShadow = true;
      plank.castShadow = row < 8;
      dock.add(plank);
    }
  }
  scene.add(dock);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 65, 1, 1),
    new THREE.MeshPhysicalMaterial({
      color: 0x071726,
      roughness: 0.25,
      metalness: 0.28,
      transparent: true,
      opacity: 0.94,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.5, -19);
  water.receiveShadow = true;
  scene.add(water);

  const waveMaterial = new THREE.MeshBasicMaterial({ color: 0x31506a, transparent: true, opacity: 0.18 });
  const waveStrips = [];
  for (let i = 0; i < 22; i += 1) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + (i % 4), 0.018), waveMaterial);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(((i * 37) % 19) - 9, -0.47, -4 - ((i * 23) % 30));
    strip.rotation.z = ((i % 3) - 1) * 0.08;
    strip.userData.phase = i * 0.41;
    scene.add(strip);
    waveStrips.push(strip);
  }

  const clickTargets = [];
  const markers = [];

  const lantern = createLantern(materials);
  lantern.position.set(-2.15, 0.02, 1.15);
  scene.add(lantern);
  const lanternProxy = createHitProxy("lantern", new THREE.BoxGeometry(1.15, 1.75, 1.15), new THREE.Vector3(-2.15, 0.86, 1.15));
  scene.add(lanternProxy);
  clickTargets.push(lanternProxy);

  const hatchetCrate = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.72, 1.05), materials.crate);
  hatchetCrate.position.set(-2.55, 0.36, -1.5);
  hatchetCrate.rotation.y = 0.1;
  hatchetCrate.castShadow = true;
  hatchetCrate.receiveShadow = true;
  scene.add(hatchetCrate);
  const hatchet = createHatchet(materials);
  hatchet.position.set(-2.45, 0.73, -1.42);
  scene.add(hatchet);
  const hatchetProxy = createHitProxy("hatchet", new THREE.BoxGeometry(1.45, 0.95, 1.05), new THREE.Vector3(-2.45, 1.08, -1.42));
  scene.add(hatchetProxy);
  clickTargets.push(hatchetProxy);

  const teaChest = createTeaChest(materials);
  teaChest.position.set(2.15, 0, -1.1);
  teaChest.rotation.y = -0.08;
  scene.add(teaChest);
  const teaChestProxy = createHitProxy("tea-chest", new THREE.BoxGeometry(1.7, 1.3, 1.35), new THREE.Vector3(2.15, 0.62, -1.1));
  scene.add(teaChestProxy);
  clickTargets.push(teaChestProxy);

  for (const [x, y, z, s] of [
    [3.25, 0.4, -0.8, 1], [3.4, 1.16, -1.2, 0.82], [2.7, 0.42, -2.35, 0.9], [3.65, 0.46, -3.2, 1.12],
  ]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.15 * s, 0.84 * s, 0.95 * s), materials.crate);
    crate.position.set(x, y, z);
    crate.rotation.y = (x + z) * 0.08;
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
  }
  for (const [x, z, r] of [[2.1, -2.55, 0], [3.55, -2.2, 0.05], [2.85, -3.55, -0.04]]) {
    const barrel = createBarrel(materials);
    barrel.position.set(x, 0, z);
    barrel.rotation.z = r;
    scene.add(barrel);
  }

  const ship = createShip(materials);
  ship.position.set(5.4, -0.24, -11.5);
  ship.rotation.y = 0.12;
  scene.add(ship);
  const shipProxy = createHitProxy("ship", new THREE.BoxGeometry(4.8, 7.4, 8.8), new THREE.Vector3(5.4, 3, -11.5));
  shipProxy.rotation.y = 0.12;
  scene.add(shipProxy);
  clickTargets.push(shipProxy);

  const farDock = new THREE.Mesh(new THREE.BoxGeometry(28, 0.45, 4.5), materials.wetWood);
  farDock.position.set(-4, -0.22, -20);
  farDock.receiveShadow = true;
  scene.add(farDock);
  for (let i = 0; i < 12; i += 1) {
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(2.2 + (i % 3) * 0.6, 2.7 + (i % 4) * 0.8, 2.2),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0x111922 : 0x171c22, roughness: 0.95 }),
    );
    building.position.set(-16 + i * 2.8, 1.15 + (i % 4) * 0.4, -22 - (i % 2));
    scene.add(building);
    const windowLight = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.22),
      new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffb54a : 0x5f4930, toneMapped: false }),
    );
    windowLight.position.set(building.position.x, building.position.y + 0.2, building.position.z + 1.12);
    scene.add(windowLight);
  }

  const fogGeometry = new THREE.BufferGeometry();
  const fogPositions = [];
  for (let i = 0; i < 180; i += 1) {
    fogPositions.push(
      ((i * 71) % 290) / 10 - 14.5,
      ((i * 37) % 45) / 10 - 0.2,
      -((i * 53) % 300) / 10,
    );
  }
  fogGeometry.setAttribute("position", new THREE.Float32BufferAttribute(fogPositions, 3));
  const fogPoints = new THREE.Points(
    fogGeometry,
    new THREE.PointsMaterial({ color: 0x7692aa, size: 0.055, transparent: true, opacity: 0.23, depthWrite: false }),
  );
  scene.add(fogPoints);

  [
    ["lantern", new THREE.Vector3(-2.12, 1.5, 1.08)],
    ["hatchet", new THREE.Vector3(-2.34, 1.52, -1.36)],
    ["tea-chest", new THREE.Vector3(2.13, 1.35, -1.05)],
    ["ship", new THREE.Vector3(4.15, 2.2, -8.15)],
  ].forEach(([id, position]) => {
    const marker = createHotspot(id, position);
    marker.userData.baseScale = id === "ship" ? 0.95 : id === "lantern" ? 0.34 : 0.48;
    scene.add(marker);
    markers.push(marker);
    const markerProxy = createHitProxy(id, new THREE.SphereGeometry(0.38, 12, 8), position);
    markerProxy.userData.isMarkerProxy = true;
    scene.add(markerProxy);
    clickTargets.push(markerProxy);
  });

  const raycaster = new THREE.Raycaster();
  raycaster.far = 45;
  const pointer = new THREE.Vector2();
  let hoveredId = null;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let pointerDownAt = 0;
  let yaw = 0;
  let pitch = -0.04;
  let usingMotion = false;
  let currentOrientation = null;
  let currentScreenOrientation = 0;
  let xrSession = null;
  let discoveredIds = new Set();

  const raycastAt = (clientX, clientY) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickTargets, false).filter((entry) => entry.object.userData.hotspotId);
    return hits.find((entry) => entry.object.userData.isMarkerProxy) ?? hits[0] ?? null;
  };

  const getScreenAnchor = (id) => {
    const marker = markers.find((item) => item.userData.hotspotId === id);
    const rect = renderer.domElement.getBoundingClientRect();
    if (!marker) {
      return { x: rect.width / 2, y: rect.height / 2, width: rect.width, height: rect.height };
    }
    const screenPosition = marker.getWorldPosition(new THREE.Vector3()).project(camera);
    return {
      x: ((screenPosition.x + 1) / 2) * rect.width,
      y: ((1 - screenPosition.y) / 2) * rect.height,
      width: rect.width,
      height: rect.height,
    };
  };

  const pick = (clientX, clientY, select = false, pointerType = "mouse") => {
    let hit = raycastAt(clientX, clientY);
    if (!hit && select && pointerType === "touch") {
      const touchOffsets = [
        [14, 0], [-14, 0], [0, 14], [0, -14],
        [20, 12], [-20, 12], [20, -12], [-20, -12],
      ];
      for (const [offsetX, offsetY] of touchOffsets) {
        hit = raycastAt(clientX + offsetX, clientY + offsetY);
        if (hit) break;
      }
    }
    const id = hit?.object?.userData?.hotspotId ?? null;
    hoveredId = id;
    renderer.domElement.style.cursor = id ? "pointer" : dragging ? "grabbing" : "grab";
    if (select && id) onSelect(id, getScreenAnchor(id));
    return id;
  };

  const onPointerDown = (event) => {
    dragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    pointerDownAt = performance.now();
    renderer.domElement.setPointerCapture?.(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
  };
  const onPointerMove = (event) => {
    if (!dragging) {
      pick(event.clientX, event.clientY);
      return;
    }
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    yaw -= dx * 0.0042;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.0036, -1.05, 0.82);
  };
  const onPointerUp = (event) => {
    const moved = Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY);
    const elapsed = performance.now() - pointerDownAt;
    const tapTolerance = event.pointerType === "touch" ? 18 : 7;
    dragging = false;
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    if (moved <= tapTolerance && elapsed <= 650) pick(event.clientX, event.clientY, true, event.pointerType);
    renderer.domElement.style.cursor = hoveredId ? "pointer" : "grab";
  };
  const onPointerCancel = (event) => {
    dragging = false;
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    renderer.domElement.style.cursor = "grab";
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerCancel);

  const onDeviceOrientation = (event) => {
    if (event.alpha == null) return;
    currentOrientation = {
      alpha: event.alpha * DEG_TO_RAD,
      beta: (event.beta ?? 0) * DEG_TO_RAD,
      gamma: (event.gamma ?? 0) * DEG_TO_RAD,
    };
    onMotionReady();
  };
  const onScreenOrientation = () => {
    currentScreenOrientation = ((screen.orientation?.angle ?? window.orientation ?? 0) * DEG_TO_RAD);
  };

  const enableMotion = async () => {
    try {
      if (typeof DeviceOrientationEvent === "undefined") {
        onModeChange("motion-unsupported");
        return false;
      }
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          onModeChange("motion-denied");
          return false;
        }
      }
      usingMotion = true;
      onScreenOrientation();
      window.addEventListener("deviceorientation", onDeviceOrientation, true);
      screen.orientation?.addEventListener?.("change", onScreenOrientation);
      window.addEventListener("orientationchange", onScreenOrientation);
      onModeChange("motion");
      return true;
    } catch {
      onModeChange("motion-denied");
      return false;
    }
  };

  const startXR = async () => {
    try {
      if (!navigator.xr?.isSessionSupported || !(await navigator.xr.isSessionSupported("immersive-vr"))) {
        await enableMotion();
        return false;
      }
      xrSession = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor"],
      });
      xrSession.addEventListener("end", () => {
        xrSession = null;
        onModeChange(usingMotion ? "motion" : "drag");
      }, { once: true });
      await renderer.xr.setSession(xrSession);
      onModeChange("immersive-vr");
      return true;
    } catch {
      await enableMotion();
      return false;
    }
  };

  const controller = renderer.xr.getController(0);
  const controllerRayMatrix = new THREE.Matrix4();
  const onControllerSelect = () => {
    controllerRayMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(controllerRayMatrix);
    const hit = raycaster.intersectObjects(clickTargets, false).find((entry) => entry.object.userData.hotspotId);
    if (hit?.object?.userData?.hotspotId) {
      const id = hit.object.userData.hotspotId;
      onSelect(id, getScreenAnchor(id));
    }
  };
  controller.addEventListener("select", onControllerSelect);
  scene.add(controller);

  const resize = () => {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);

  const zee = new THREE.Vector3(0, 0, 1);
  const motionEuler = new THREE.Euler();
  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  const timer = new THREE.Timer();
  timer.connect(document);

  renderer.setAnimationLoop((timestamp) => {
    timer.update(timestamp);
    const time = timer.getElapsed();
    if (!renderer.xr.isPresenting) {
      if (usingMotion && currentOrientation) {
        motionEuler.set(currentOrientation.beta, currentOrientation.alpha, -currentOrientation.gamma, "YXZ");
        camera.quaternion.setFromEuler(motionEuler);
        camera.quaternion.multiply(q1);
        camera.quaternion.multiply(q0.setFromAxisAngle(zee, -currentScreenOrientation));
      } else {
        camera.rotation.set(pitch, yaw, 0, "YXZ");
      }
    }

    markers.forEach((marker, index) => {
      marker.lookAt(camera.position);
      const isHovered = marker.userData.hotspotId === hoveredId;
      const isDiscovered = discoveredIds.has(marker.userData.hotspotId);
      const scale = marker.userData.baseScale * (1 + Math.sin(time * 2.1 + index) * 0.07 + (isHovered ? 0.16 : 0));
      marker.scale.setScalar(scale);
      marker.userData.haloMaterial.opacity = isHovered ? 0.27 : isDiscovered ? 0.055 : 0.1;
      marker.userData.ringMaterial.opacity = isHovered ? 0.76 : isDiscovered ? 0.2 : 0.34;
      marker.userData.dotMaterial.opacity = isHovered ? 0.94 : isDiscovered ? 0.32 : 0.5;
    });
    waveStrips.forEach((strip) => {
      strip.position.y = -0.47 + Math.sin(time * 0.8 + strip.userData.phase) * 0.015;
      strip.position.x += Math.sin(time * 0.12 + strip.userData.phase) * 0.0007;
    });
    fogPoints.rotation.y = Math.sin(time * 0.025) * 0.04;
    const lanternLight = lantern.userData.lanternLight;
    lanternLight.intensity = 5.15 + Math.sin(time * 8.1) * 0.26 + Math.sin(time * 13.7) * 0.13;
    renderer.render(scene, camera);
  });

  onModeChange("drag");

  return {
    startXR,
    enableMotion,
    setDiscovered(ids) {
      discoveredIds = new Set(ids);
    },
    async dispose() {
      renderer.setAnimationLoop(null);
      timer.dispose();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
      controller.removeEventListener("select", onControllerSelect);
      window.removeEventListener("deviceorientation", onDeviceOrientation, true);
      screen.orientation?.removeEventListener?.("change", onScreenOrientation);
      window.removeEventListener("orientationchange", onScreenOrientation);
      if (xrSession) {
        try { await xrSession.end(); } catch { /* Session may already be ending. */ }
      }
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
        else object.material?.dispose?.();
      });
      Object.values(materials).forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export function HarborScene({ discoveredClueIds, selectedClueId, onDiscover, onCloseClue, onExplain, onExit }) {
  const mountRef = useRef(null);
  const runtimeRef = useRef(null);
  const audioRef = useRef(null);
  const onDiscoverRef = useRef(onDiscover);
  const [viewMode, setViewMode] = useState("loading");
  const [motionReady, setMotionReady] = useState(false);
  const [clueAnchor, setClueAnchor] = useState(null);
  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const [playingClueId, setPlayingClueId] = useState(null);
  onDiscoverRef.current = onDiscover;

  const selectedClue = useMemo(
    () => HARBOR_CLUES.find((clue) => clue.id === selectedClueId) ?? null,
    [selectedClueId],
  );
  const progress = Math.round((discoveredClueIds.length / HARBOR_CLUES.length) * 100);

  useEffect(() => {
    if (!mountRef.current) return undefined;
    let disposed = false;
    const runtime = createScene({
      mount: mountRef.current,
      onSelect: (id, anchor) => {
        if (!disposed) setClueAnchor(anchor);
        onDiscoverRef.current(id);
      },
      onModeChange: (mode) => { if (!disposed) setViewMode(mode); },
      onMotionReady: () => { if (!disposed) setMotionReady(true); },
    });
    runtimeRef.current = runtime;
    return () => {
      disposed = true;
      runtimeRef.current = null;
      runtime.dispose();
    };
  }, []);

  useEffect(() => {
    runtimeRef.current?.setDiscovered(discoveredClueIds);
  }, [discoveredClueIds]);

  useEffect(() => {
    setIsWhyOpen(false);
    const audio = audioRef.current;
    if (audio) {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
    }
    audioRef.current = null;
    setPlayingClueId(null);
  }, [selectedClueId]);

  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
    }
  }, []);

  const enableMotion = () => runtimeRef.current?.enableMotion();
  const enterImmersive = () => runtimeRef.current?.startXR();
  const stopClueAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
    }
    audioRef.current = null;
    setPlayingClueId(null);
  };
  const playClueStory = async () => {
    if (!selectedClue) return;
    const currentAudio = audioRef.current;
    if (currentAudio?.dataset.clueId === selectedClue.id) {
      if (currentAudio.paused) {
        try { await currentAudio.play(); } catch { setPlayingClueId(null); }
      } else {
        currentAudio.pause();
        setPlayingClueId(null);
      }
      return;
    }

    stopClueAudio();
    const audio = new Audio(CLUE_STORY_AUDIO[selectedClue.id]);
    audio.dataset.clueId = selectedClue.id;
    audio.preload = "auto";
    audio.onplay = () => setPlayingClueId(selectedClue.id);
    audio.onended = () => setPlayingClueId(null);
    audio.onerror = () => setPlayingClueId(null);
    audioRef.current = audio;
    try { await audio.play(); } catch { setPlayingClueId(null); }
  };
  const handleCloseClue = () => {
    stopClueAudio();
    setClueAnchor(null);
    setIsWhyOpen(false);
    onCloseClue();
  };
  const handleExit = () => {
    stopClueAudio();
    setClueAnchor(null);
    setIsWhyOpen(false);
    onExit();
  };
  const clueCardStyle = getClueCardStyle(clueAnchor, isWhyOpen);

  return (
    <section className="harbor-experience" aria-label="Boston Harbor 1773 interactive scene">
      <div ref={mountRef} className="harbor-canvas-mount" />
      <div className="harbor-vignette" aria-hidden="true" />

      <header className="harbor-topbar">
        <div className="harbor-vr-brand">
          <span><Compass size={22} weight="duotone" /></span>
          <div><strong>MEMQUEST VR</strong><small>Seeker 01 · Active Session</small></div>
        </div>
        <nav aria-label="Scene navigation"><button type="button" onClick={handleExit}>Library</button><span>Timeline</span><strong>1773 World</strong></nav>
        <div className="harbor-current"><small>Current Unit</small><strong>Boston Tea Party</strong></div>
      </header>

      <aside className="harbor-objective glass-surface">
        <div className="harbor-objective-kicker"><span>ACTIVE OBJECTIVE</span><Compass size={20} weight="duotone" /></div>
        <h1>Investigate the Harbor</h1>
        <div className="harbor-clue-count"><span>Clues Found</span><strong>{discoveredClueIds.length} / {HARBOR_CLUES.length}</strong></div>
        <div className="harbor-progress-track"><span style={{ width: `${progress}%` }} /></div>
      </aside>

      <aside className="harbor-environment glass-surface">
        <div><small>Environment</small><strong>Boston Harbor, 1773</strong></div>
        <div><small>Visibility</small><strong>Low (Fog)</strong></div>
        <Compass size={24} weight="duotone" />
      </aside>

      <div className="harbor-tools" aria-label="Scene tools">
        <button type="button" aria-label="Open scene map"><GridFour size={21} /></button>
        <button type="button" aria-label="Focus interactive clues"><HandTap size={21} /></button>
        <button type="button" aria-label="Scene settings"><SlidersHorizontal size={21} /></button>
      </div>

      <div className="harbor-controls">
        <button type="button" className="harbor-control" onClick={enableMotion} aria-pressed={viewMode === "motion"}>
          <ArrowsOut size={19} />
          <span>{motionReady ? "Motion tracking active" : viewMode === "motion-denied" ? "Motion permission denied" : "Use phone motion"}</span>
        </button>
        <button type="button" className="harbor-control is-primary" onClick={enterImmersive}>
          <Headset size={20} weight="duotone" />
          <span>{viewMode === "immersive-vr" ? "VR active" : "Enter WebXR"}</span>
        </button>
        <button type="button" className="harbor-exit" onClick={handleExit}><X size={19} /> Exit scene</button>
      </div>

      <div className="harbor-hint"><Eye size={22} weight="duotone" /><span>Tap translucent gold rings · drag elsewhere to look</span></div>

      {selectedClue && (
        <article
          className={`harbor-clue-panel glass-surface ${isWhyOpen ? "is-expanded" : ""}`}
          style={clueCardStyle}
          aria-live="polite"
        >
          <button type="button" className="harbor-clue-close" onClick={handleCloseClue} aria-label="Close clue"><X size={17} /></button>
          <small>{selectedClue.eyebrow}</small>
          <h2>{selectedClue.title}</h2>
          <div className="harbor-clue-meta">
            <span><Clock size={14} weight="duotone" />{selectedClue.period}</span>
            <span><MapPin size={14} weight="duotone" />{selectedClue.location}</span>
          </div>
          <p className="harbor-clue-intro">{selectedClue.body}</p>
          <div className="harbor-clue-actions">
            <button
              type="button"
              className="is-primary"
              onClick={playClueStory}
              aria-pressed={playingClueId === selectedClue.id}
            >
              {playingClueId === selectedClue.id ? <Pause size={17} weight="fill" /> : <SpeakerHigh size={17} weight="duotone" />}
              <span>{playingClueId === selectedClue.id ? "Pause story" : "Listen to the story"}</span>
            </button>
            <button
              type="button"
              onClick={() => { if (!isWhyOpen) onExplain?.(selectedClue.id); setIsWhyOpen((current) => !current); }}
              aria-expanded={isWhyOpen}
              aria-controls={`clue-deep-dive-${selectedClue.id}`}
            >
              <span>Why it matters</span>
              <CaretDown size={16} className={isWhyOpen ? "is-rotated" : ""} />
            </button>
          </div>
          {isWhyOpen && (
            <section id={`clue-deep-dive-${selectedClue.id}`} className="harbor-clue-deep-dive">
              <div>
                <strong>Why it matters</strong>
                <p>{selectedClue.whyItMatters}</p>
              </div>
              <div>
                <small>RELATED HISTORY</small>
                <p>{selectedClue.relatedHistory}</p>
              </div>
            </section>
          )}
          <footer><span>ARCHIVE CLUE ADDED</span><strong>{discoveredClueIds.length} / {HARBOR_CLUES.length}</strong></footer>
        </article>
      )}

      <footer className="harbor-journey">
        <div><span>HARBOR EXPLORATION</span><strong>{progress}% · {discoveredClueIds.length} / {HARBOR_CLUES.length} clues</strong></div>
        <div className="harbor-journey-track"><span style={{ width: `${progress}%` }} /></div>
      </footer>
    </section>
  );
}
