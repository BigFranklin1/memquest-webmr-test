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

function createWoodTexture({ background, grain, seam, seed = 1 }) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  context.fillStyle = background;
  context.fillRect(0, 0, 256, 256);
  let value = seed * 7919;
  const random = () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
  context.globalAlpha = 0.2;
  for (let line = 0; line < 92; line += 1) {
    const y = random() * 256;
    context.strokeStyle = line % 7 === 0 ? seam : grain;
    context.lineWidth = 0.45 + random() * 1.1;
    context.beginPath();
    context.moveTo(-12, y);
    context.bezierCurveTo(72, y + random() * 8 - 4, 178, y + random() * 10 - 5, 268, y + random() * 6 - 3);
    context.stroke();
  }
  context.globalAlpha = 0.32;
  for (let seamY = 0; seamY <= 256; seamY += 64) {
    context.fillStyle = seam;
    context.fillRect(0, seamY, 256, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 2.8);
  texture.anisotropy = 4;
  return texture;
}

function createSkyboxTexture() {
  const size = 512;
  const faceNames = ["px", "nx", "py", "ny", "pz", "nz"];
  const canvases = faceNames.map((faceName, faceIndex) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    let value = 173 + faceIndex * 977;
    const random = () => {
      value = (value * 48271) % 2147483647;
      return value / 2147483647;
    };

    if (faceName === "py") {
      const zenith = context.createRadialGradient(size * 0.5, size * 0.52, 16, size * 0.5, size * 0.52, size * 0.72);
      zenith.addColorStop(0, "#08182a");
      zenith.addColorStop(0.58, "#040c19");
      zenith.addColorStop(1, "#02060e");
      context.fillStyle = zenith;
    } else if (faceName === "ny") {
      context.fillStyle = "#09131d";
    } else {
      const horizon = context.createLinearGradient(0, 0, 0, size);
      horizon.addColorStop(0, "#020711");
      horizon.addColorStop(0.46, "#071629");
      horizon.addColorStop(0.76, "#203247");
      horizon.addColorStop(0.91, "#263846");
      horizon.addColorStop(1, "#111b25");
      context.fillStyle = horizon;
    }
    context.fillRect(0, 0, size, size);

    if (faceName !== "ny") {
      for (let star = 0; star < (faceName === "py" ? 92 : 40); star += 1) {
        const x = random() * size;
        const y = random() * (faceName === "py" ? size : size * 0.58);
        const radius = 0.35 + random() * 0.75;
        context.globalAlpha = 0.16 + random() * 0.38;
        context.fillStyle = random() > 0.78 ? "#d9d1b2" : "#b8c9da";
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    if (!["py", "ny"].includes(faceName)) {
      context.globalAlpha = 0.085;
      for (let band = 0; band < 11; band += 1) {
        const y = size * 0.56 + band * 15 + random() * 8;
        const haze = context.createLinearGradient(0, y, size, y + 12);
        haze.addColorStop(0, "rgba(87, 112, 134, 0)");
        haze.addColorStop(0.24, "rgba(112, 132, 149, 0.7)");
        haze.addColorStop(0.68, "rgba(75, 100, 122, 0.52)");
        haze.addColorStop(1, "rgba(78, 105, 128, 0)");
        context.fillStyle = haze;
        context.fillRect(0, y, size, 14 + random() * 12);
      }
    }

    if (faceName === "nz") {
      const moonHalo = context.createRadialGradient(132, 118, 2, 132, 118, 50);
      moonHalo.addColorStop(0, "rgba(224, 231, 230, 0.76)");
      moonHalo.addColorStop(0.22, "rgba(189, 206, 218, 0.28)");
      moonHalo.addColorStop(1, "rgba(135, 166, 190, 0)");
      context.globalAlpha = 1;
      context.fillStyle = moonHalo;
      context.fillRect(78, 64, 108, 108);
      context.fillStyle = "rgba(210, 219, 218, 0.82)";
      context.beginPath();
      context.arc(132, 118, 13, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    return canvas;
  });

  const texture = new THREE.CubeTexture(canvases);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createFogTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let cloud = 0; cloud < 13; cloud += 1) {
    const x = 24 + ((cloud * 113) % 468);
    const y = 55 + ((cloud * 47) % 78);
    const radiusX = 82 + (cloud % 4) * 22;
    const radiusY = 28 + (cloud % 3) * 9;
    context.save();
    context.translate(x, y);
    context.scale(radiusX / radiusY, 1);
    const gradient = context.createRadialGradient(0, 0, 2, 0, 0, radiusY);
    gradient.addColorStop(0, "rgba(177, 194, 204, 0.34)");
    gradient.addColorStop(0.52, "rgba(130, 153, 169, 0.16)");
    gradient.addColorStop(1, "rgba(98, 122, 142, 0)");
    context.fillStyle = gradient;
    context.fillRect(-radiusY, -radiusY, radiusY * 2, radiusY * 2);
    context.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createHullGeometry() {
  const stations = [
    { z: -3.75, half: 0.12, lift: 0.28 }, { z: -3.25, half: 0.92, lift: 0.04 },
    { z: -2.35, half: 1.45, lift: 0 }, { z: -0.75, half: 1.62, lift: 0 },
    { z: 1.25, half: 1.55, lift: 0.02 }, { z: 2.75, half: 1.18, lift: 0.1 },
    { z: 3.55, half: 0.45, lift: 0.34 },
  ];
  const ringSize = 6;
  const positions = [];
  const indices = [];
  stations.forEach(({ z, half, lift }) => {
    const top = 0.58 + lift;
    const waterline = -0.03 + lift * 0.5;
    const keel = -0.72 + lift;
    positions.push(-half, top, z, half, top, z, half * 0.86, waterline, z, half * 0.38, keel, z, -half * 0.38, keel, z, -half * 0.86, waterline, z);
  });
  for (let station = 0; station < stations.length - 1; station += 1) {
    for (let side = 0; side < ringSize; side += 1) {
      const nextSide = (side + 1) % ringSize;
      const a = station * ringSize + side;
      const b = station * ringSize + nextSide;
      const c = (station + 1) * ringSize + nextSide;
      const d = (station + 1) * ringSize + side;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createRope(points, material, radius = 0.018) {
  const curve = new THREE.CatmullRomCurve3(points);
  const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, radius, 5, false), material);
  rope.castShadow = true;
  return rope;
}

function createCargoCrate(materials, scale = 1) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15 * scale, 0.84 * scale, 0.95 * scale), materials.crate);
  body.position.y = 0.42 * scale;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  for (const x of [-0.48, 0.48]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.065 * scale, 0.88 * scale, 0.055 * scale), materials.crateTrim);
    brace.position.set(x * scale, 0.43 * scale, 0.5 * scale);
    group.add(brace);
  }
  for (const y of [0.06, 0.78]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(1.16 * scale, 0.055 * scale, 0.055 * scale), materials.crateTrim);
    brace.position.set(0, y * scale, 0.5 * scale);
    group.add(brace);
  }
  return group;
}

function createHarborSloop(materials) {
  const sloop = new THREE.Group();
  const hull = new THREE.Mesh(createHullGeometry(), materials.hull);
  hull.scale.set(0.54, 0.68, 0.58);
  hull.castShadow = true;
  sloop.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 4.8, 7), materials.mast);
  mast.position.set(0, 2.25, -0.1);
  sloop.add(mast);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, 3.3);
  sailShape.lineTo(1.25, 0.3);
  sailShape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), materials.distantCanvas);
  sail.position.set(0.06, 0.72, -0.08);
  sail.rotation.y = 0.08;
  sloop.add(sail);
  return sloop;
}

function createDockCart(materials) {
  const cart = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 0.82), materials.deck);
  bed.position.y = 0.56;
  bed.castShadow = true;
  cart.add(bed);
  for (const x of [-0.62, 0.62]) {
    for (const z of [-0.43, 0.43]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.08, 12), materials.wetWood);
      wheel.position.set(x, 0.28, z);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      cart.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), materials.iron);
      hub.position.copy(wheel.position);
      hub.rotation.z = Math.PI / 2;
      cart.add(hub);
    }
  }
  for (const z of [-0.28, 0.28]) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 1.35, 6), materials.mast);
    handle.position.set(-1.15, 0.73, z);
    handle.rotation.z = Math.PI / 2 - 0.12;
    cart.add(handle);
  }
  return cart;
}

function createLoadingCrane(materials) {
  const crane = new THREE.Group();
  for (const x of [-0.72, 0.72]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.1, 0.2), materials.wetWood);
    post.position.set(x, 2.05, 0);
    post.castShadow = true;
    crane.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.72), materials.iron);
    foot.position.set(x, 0.08, 0);
    crane.add(foot);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.22, 0.24), materials.mast);
  beam.position.set(0.25, 4.08, 0);
  beam.castShadow = true;
  crane.add(beam);
  for (const x of [-0.52, 0.52]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.1, 0.12), materials.mast);
    brace.position.set(x, 2.95, 0);
    brace.rotation.z = x < 0 ? -0.56 : 0.56;
    crane.add(brace);
  }
  const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 7, 16), materials.iron);
  pulley.position.set(0.78, 3.82, 0.02);
  crane.add(pulley);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 5), materials.rope);
  rope.position.set(0.78, 2.65, 0.02);
  crane.add(rope);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 14, Math.PI * 1.55), materials.iron);
  hook.position.set(0.78, 1.54, 0.02);
  hook.rotation.z = 0.25;
  crane.add(hook);
  return crane;
}

function createWarehouse(materials, width, height, depth, windowPattern = 0) {
  const building = new THREE.Group();
  const roofRise = width * (0.22 + (windowPattern % 3) * 0.025);
  const facadeShape = new THREE.Shape();
  facadeShape.moveTo(-width / 2, 0);
  facadeShape.lineTo(width / 2, 0);
  facadeShape.lineTo(width / 2, height);
  facadeShape.lineTo(0, height + roofRise);
  facadeShape.lineTo(-width / 2, height);
  facadeShape.closePath();
  const bodyGeometry = new THREE.ExtrudeGeometry(facadeShape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  bodyGeometry.translate(0, 0, -depth / 2);
  const body = new THREE.Mesh(bodyGeometry, windowPattern % 3 === 1 ? materials.warehouseWarm : materials.warehouse);
  body.castShadow = true;
  body.receiveShadow = true;
  building.add(body);

  const roofAngle = Math.atan2(roofRise, width / 2);
  const roofLength = Math.hypot(width / 2, roofRise) + 0.2;
  for (const direction of [-1, 1]) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(roofLength, 0.14, depth + 0.3), materials.roof);
    roof.position.set(direction * width * 0.25, height + roofRise * 0.5 + 0.055, 0);
    roof.rotation.z = -direction * roofAngle;
    roof.castShadow = true;
    roof.receiveShadow = true;
    building.add(roof);
  }

  const frontZ = depth / 2 + 0.012;
  const timberWidth = Math.max(0.055, width * 0.022);
  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(timberWidth, roofRise * 0.92, 0.045), materials.timber);
  ridgeBeam.position.set(0, height + roofRise * 0.46, frontZ);
  building.add(ridgeBeam);
  for (const direction of [-1, 1]) {
    const gableBeam = new THREE.Mesh(new THREE.BoxGeometry(roofLength * 0.91, timberWidth, 0.045), materials.timber);
    gableBeam.position.set(direction * width * 0.23, height + roofRise * 0.48, frontZ);
    gableBeam.rotation.z = -direction * roofAngle;
    building.add(gableBeam);
  }
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.085, 0.065), materials.timber);
  cornice.position.set(0, height - 0.015, frontZ + 0.008);
  building.add(cornice);
  const atticRadius = Math.min(0.18, width * 0.052);
  const atticWindow = new THREE.Mesh(
    new THREE.CircleGeometry(atticRadius, 18),
    windowPattern % 4 === 0 ? materials.windowWarm : materials.windowDim,
  );
  atticWindow.position.set(0, height + roofRise * 0.36, frontZ + 0.012);
  building.add(atticWindow);
  const atticFrame = new THREE.Mesh(new THREE.TorusGeometry(atticRadius + 0.025, 0.022, 6, 18), materials.timber);
  atticFrame.position.copy(atticWindow.position);
  atticFrame.position.z += 0.008;
  building.add(atticFrame);

  const doorWidth = Math.min(0.82, width * 0.28);
  const doorHeight = Math.min(1.28, height * 0.34);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth, doorHeight), materials.door);
  door.position.set((windowPattern % 3 - 1) * width * 0.19, doorHeight / 2 + 0.03, frontZ + 0.006);
  building.add(door);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.16, 0.085, 0.07), materials.timber);
  lintel.position.set(door.position.x, doorHeight + 0.08, frontZ + 0.012);
  building.add(lintel);

  const floorCount = Math.max(1, Math.floor(height / 1.25));
  const columns = Math.max(2, Math.floor(width / 0.72));
  const litWindowTransforms = [];
  const dimWindowTransforms = [];
  for (let floor = 0; floor < floorCount; floor += 1) {
    for (let column = 0; column < columns; column += 1) {
      const windowX = -width * 0.37 + column * ((width * 0.74) / Math.max(1, columns - 1));
      if (floor === 0 && Math.abs(windowX - door.position.x) < doorWidth * 0.68) continue;
      const lit = (floor + column + windowPattern) % 4 === 0;
      const transform = new THREE.Object3D();
      transform.position.set(windowX, 0.72 + floor * 1.05, frontZ + 0.006);
      transform.updateMatrix();
      (lit ? litWindowTransforms : dimWindowTransforms).push(transform.matrix.clone());
    }
  }
  const windowGeometry = new THREE.PlaneGeometry(0.24, 0.32);
  for (const [transforms, material] of [[litWindowTransforms, materials.windowWarm], [dimWindowTransforms, materials.windowDim]]) {
    if (!transforms.length) continue;
    const windows = new THREE.InstancedMesh(windowGeometry, material, transforms.length);
    transforms.forEach((matrix, index) => windows.setMatrixAt(index, matrix));
    windows.instanceMatrix.needsUpdate = true;
    building.add(windows);
  }
  const chimneyX = (windowPattern % 2 === 0 ? 1 : -1) * width * 0.29;
  const roofSurfaceY = height + roofRise * (1 - Math.abs(chimneyX) / (width / 2));
  const chimneyHeight = 0.82 + (windowPattern % 3) * 0.08;
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.28, chimneyHeight, 0.34), materials.brick);
  chimney.position.set(chimneyX, roofSurfaceY + chimneyHeight / 2 - 0.035, depth * (windowPattern % 2 === 0 ? -0.18 : 0.16));
  chimney.castShadow = true;
  building.add(chimney);
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 0.43), materials.brick);
  chimneyCap.position.set(chimney.position.x, chimney.position.y + chimneyHeight / 2 + 0.035, chimney.position.z);
  chimneyCap.castShadow = true;
  building.add(chimneyCap);
  return building;
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
  const profile = [
    new THREE.Vector2(0.29, 0), new THREE.Vector2(0.34, 0.08),
    new THREE.Vector2(0.39, 0.45), new THREE.Vector2(0.34, 0.82), new THREE.Vector2(0.29, 0.9),
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 14), materials.barrel);
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
  const hull = new THREE.Mesh(createHullGeometry(), materials.hull);
  hull.castShadow = true;
  hull.receiveShadow = true;
  ship.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.16, 6.05), materials.deck);
  deck.position.set(0, 0.62, 0.05);
  deck.receiveShadow = true;
  ship.add(deck);

  const sternCabin = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.72, 1.22), materials.hullTrim);
  sternCabin.position.set(0, 1, 2.45);
  sternCabin.castShadow = true;
  ship.add(sternCabin);
  for (const x of [-0.72, 0, 0.72]) {
    const sternWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.24), materials.windowWarm);
    sternWindow.position.set(x, 1.08, 3.066);
    ship.add(sternWindow);
  }

  for (const side of [-1, 1]) {
    const hullStripe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 5.85), materials.mast);
    hullStripe.position.set(side * 1.48, 0.35, 0.1);
    ship.add(hullStripe);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 6.25), materials.mast);
    rail.position.set(side * 1.48, 1.14, 0.04);
    ship.add(rail);
    for (let z = -2.8; z <= 2.8; z += 0.7) {
      const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.52, 6), materials.iron);
      stanchion.position.set(side * 1.48, 0.91, z);
      ship.add(stanchion);
    }
  }

  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 3.2, 8), materials.mast);
  bowsprit.position.set(0, 1.18, -4.75);
  bowsprit.rotation.x = Math.PI / 2 - 0.1;
  ship.add(bowsprit);

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
    for (const [y, length] of [[2.55, 2.8], [3.9, 2.15], [5.1, 1.45]]) {
      const furledSail = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, length, 7), materials.canvas);
      furledSail.position.set(0, y - 0.13, mastZ + 0.02);
      furledSail.rotation.z = Math.PI / 2;
      ship.add(furledSail);
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
  const longRigging = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 6.25, -2.15), new THREE.Vector3(0, 6.25, 0.25),
      new THREE.Vector3(0, 6.25, 2.3), new THREE.Vector3(0, 1.2, 3.55),
    ]),
    materials.rigging,
  );
  ship.add(longRigging);
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
  scene.fog = new THREE.FogExp2(0x0b1927, 0.0365);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 90);
  camera.position.set(0, 1.62, 5.2);
  camera.rotation.order = "YXZ";

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  renderer.domElement.className = "harbor-canvas";
  renderer.domElement.setAttribute("aria-label", "Interactive 3D reconstruction of Boston Harbor in 1773");
  mount.appendChild(renderer.domElement);

  const woodTexture = createWoodTexture({ background: "#68472f", grain: "#d0a36d", seam: "#24140d", seed: 4 });
  const wetWoodTexture = createWoodTexture({ background: "#41332a", grain: "#947151", seam: "#11100e", seed: 7 });
  const hullTexture = createWoodTexture({ background: "#303943", grain: "#796d5e", seam: "#0d1117", seed: 11 });
  const skyboxTexture = createSkyboxTexture();
  const fogTexture = createFogTexture();
  scene.background = skyboxTexture;
  const textures = [woodTexture, wetWoodTexture, hullTexture, skyboxTexture, fogTexture];
  const materials = {
    wood: new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xb49b82, roughness: 0.9, metalness: 0.02 }),
    deck: new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xd0b18d, roughness: 0.84, metalness: 0.01 }),
    wetWood: new THREE.MeshStandardMaterial({ map: wetWoodTexture, color: 0x91857b, roughness: 0.52, metalness: 0.16 }),
    barrel: new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xb88f6b, roughness: 0.8, metalness: 0.03 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.47, metalness: 0.72 }),
    hull: new THREE.MeshStandardMaterial({ map: hullTexture, color: 0x8c99a3, roughness: 0.67, metalness: 0.07 }),
    hullTrim: new THREE.MeshStandardMaterial({ map: hullTexture, color: 0xaf9072, roughness: 0.74, metalness: 0.04 }),
    mast: new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xb9956e, roughness: 0.84, metalness: 0 }),
    crate: new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xc59969, roughness: 0.82, metalness: 0.02 }),
    crateTrim: new THREE.MeshStandardMaterial({ map: wetWoodTexture, color: 0xa17d5e, roughness: 0.88, metalness: 0.01 }),
    tea: new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xcc8b55, roughness: 0.72, metalness: 0.02, emissive: 0x1b0e05 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x8a7657, roughness: 1, metalness: 0 }),
    canvas: new THREE.MeshStandardMaterial({ color: 0xb3a488, roughness: 1, metalness: 0 }),
    sack: new THREE.MeshStandardMaterial({ color: 0x776b57, roughness: 1, metalness: 0 }),
    distantCanvas: new THREE.MeshStandardMaterial({ color: 0x4b5964, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    rigging: new THREE.LineBasicMaterial({ color: 0x76674e, transparent: true, opacity: 0.72 }),
    warehouse: new THREE.MeshStandardMaterial({ color: 0x333b42, emissive: 0x05080b, roughness: 0.96, metalness: 0 }),
    warehouseWarm: new THREE.MeshStandardMaterial({ color: 0x4a3c33, emissive: 0x090604, roughness: 0.98, metalness: 0 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x22272b, roughness: 0.94, metalness: 0.02 }),
    brick: new THREE.MeshStandardMaterial({ color: 0x3f2d27, roughness: 0.98, metalness: 0 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x201c19, roughness: 0.92, metalness: 0 }),
    door: new THREE.MeshStandardMaterial({ color: 0x181511, roughness: 0.94, metalness: 0 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x333a40, roughness: 0.92, metalness: 0.05 }),
    puddle: new THREE.MeshPhysicalMaterial({ color: 0x20394b, roughness: 0.16, metalness: 0.42, transparent: true, opacity: 0.52, depthWrite: false }),
    windowWarm: new THREE.MeshBasicMaterial({ color: 0xf2a643, toneMapped: false }),
    windowDim: new THREE.MeshBasicMaterial({ color: 0x554b3c, toneMapped: false }),
  };

  scene.add(new THREE.HemisphereLight(0x91abc7, 0x0d0b08, 1.48));
  scene.add(new THREE.AmbientLight(0x40566d, 0.58));
  const moon = new THREE.DirectionalLight(0xa9c4df, 2.5);
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
  const coolFill = new THREE.DirectionalLight(0x58789c, 1.48);
  coolFill.position.set(4, 5, 7);
  scene.add(coolFill);

  const dryPlanks = [];
  const wetPlanks = [];
  for (let row = 0; row < 16; row += 1) {
    for (let col = -4; col <= 4; col += 1) {
      const transform = new THREE.Object3D();
      transform.position.set(col * 0.93, -0.08, 5.4 - row * 1.43);
      transform.rotation.y = ((row * 17 + col * 13) % 5 - 2) * 0.0025;
      transform.updateMatrix();
      (row % 3 === 0 ? wetPlanks : dryPlanks).push(transform.matrix.clone());
    }
  }
  const plankGeometry = new THREE.BoxGeometry(0.9, 0.12, 1.45);
  for (const [matrices, material] of [[dryPlanks, materials.wood], [wetPlanks, materials.wetWood]]) {
    const planks = new THREE.InstancedMesh(plankGeometry, material, matrices.length);
    matrices.forEach((matrix, index) => planks.setMatrixAt(index, matrix));
    planks.instanceMatrix.needsUpdate = true;
    planks.receiveShadow = true;
    planks.castShadow = true;
    scene.add(planks);
  }

  const dockStructure = new THREE.Group();
  for (const x of [-3.65, 0, 3.65]) {
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 23.4), materials.wetWood);
    stringer.position.set(x, -0.31, -5.3);
    stringer.castShadow = true;
    dockStructure.add(stringer);
  }
  for (const x of [-4.22, 4.22]) {
    for (const z of [4.8, 1.3, -2.2, -5.7, -9.2, -12.7, -16.2]) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 3.2, 8), materials.wetWood);
      piling.position.set(x, -1.05, z);
      piling.rotation.z = ((Math.abs(z) * 7) % 3 - 1) * 0.016;
      piling.castShadow = true;
      dockStructure.add(piling);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.1, 8), materials.iron);
      cap.position.set(x, 0.53, z);
      dockStructure.add(cap);
    }
  }
  for (const z of [3.8, -3.2, -10.2, -16.4]) {
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.24, 0.26), materials.wetWood);
    crossBeam.position.set(0, -0.28, z);
    crossBeam.castShadow = true;
    dockStructure.add(crossBeam);
  }
  scene.add(dockStructure);

  const loadingCrane = createLoadingCrane(materials);
  loadingCrane.position.set(-2.8, 0, -9.4);
  loadingCrane.rotation.y = 0.08;
  scene.add(loadingCrane);

  const dockCart = createDockCart(materials);
  dockCart.position.set(0.1, 0, -5.6);
  dockCart.rotation.y = -0.24;
  scene.add(dockCart);
  for (const [x, y, z, sx, sy, rz] of [
    [-0.28, 0.95, -5.55, 0.62, 0.34, -0.18], [0.2, 0.94, -5.62, 0.55, 0.3, 0.12],
    [0.54, 0.91, -5.5, 0.48, 0.28, -0.1], [-1.1, 0.18, -7.2, 0.66, 0.31, 0.22],
  ]) {
    const sack = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.48, 4, 8), materials.sack);
    sack.position.set(x, y, z);
    sack.scale.set(sx, sy, 0.5);
    sack.rotation.z = rz;
    sack.rotation.y = rz * 0.7;
    sack.castShadow = true;
    scene.add(sack);
  }

  for (const [x, z, sx, sz] of [
    [-1.1, 2.8, 1.8, 0.72], [1.55, 0.3, 1.15, 0.48], [-0.15, -3.2, 2.2, 0.58],
    [1.7, -8.1, 1.5, 0.5], [-2.8, -12.8, 1.2, 0.4],
  ]) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.72, 22), materials.puddle);
    puddle.scale.set(sx, sz, 1);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, 0.003, z);
    scene.add(puddle);
  }

  for (const [x, z, scale] of [[-3.1, -4.2, 1], [1.3, -6.7, 0.68]]) {
    const coil = new THREE.Group();
    for (let ring = 0; ring < 3; ring += 1) {
      const ropeRing = new THREE.Mesh(new THREE.TorusGeometry((0.3 + ring * 0.055) * scale, 0.022 * scale, 5, 26), materials.rope);
      ropeRing.rotation.x = -Math.PI / 2;
      ropeRing.position.y = 0.035 + ring * 0.018;
      coil.add(ropeRing);
    }
    coil.position.set(x, 0.04, z);
    scene.add(coil);
  }

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 65, 38, 30),
    new THREE.MeshStandardMaterial({
      color: 0x0b2234,
      roughness: 0.3,
      metalness: 0.48,
      transparent: true,
      opacity: 0.96,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.5, -19);
  water.receiveShadow = true;
  const waterPositions = water.geometry.attributes.position;
  const waterBase = Float32Array.from(waterPositions.array);
  scene.add(water);

  const waveMaterial = new THREE.MeshBasicMaterial({ color: 0x7b9ab3, transparent: true, opacity: 0.2, depthWrite: false });
  const waveStrips = [];
  for (let i = 0; i < 34; i += 1) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + (i % 5) * 0.62, 0.014), waveMaterial);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(((i * 37) % 19) - 9, -0.47, -4 - ((i * 23) % 30));
    strip.rotation.z = ((i % 3) - 1) * 0.08;
    strip.userData.phase = i * 0.41;
    scene.add(strip);
    waveStrips.push(strip);
  }

  const reflectionMaterial = new THREE.MeshBasicMaterial({ color: 0xd5b36a, transparent: true, opacity: 0.1, depthWrite: false });
  for (let i = 0; i < 12; i += 1) {
    const reflection = new THREE.Mesh(new THREE.PlaneGeometry(0.24 + i * 0.045, 1.2 + i * 0.26), reflectionMaterial);
    reflection.rotation.x = -Math.PI / 2;
    reflection.rotation.z = -0.05;
    reflection.position.set(-5.8 + Math.sin(i * 2.2) * 0.34, -0.465, -10 - i * 1.3);
    reflection.userData.phase = i * 0.7;
    scene.add(reflection);
    waveStrips.push(reflection);
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
    const crate = createCargoCrate(materials, s);
    crate.position.set(x, y - 0.42 * s, z);
    crate.rotation.y = (x + z) * 0.08;
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
  scene.add(createRope([
    new THREE.Vector3(4.18, 0.5, -7.4),
    new THREE.Vector3(4.35, 0.15, -8.4),
    new THREE.Vector3(4.1, 0.16, -10.3),
  ], materials.rope, 0.024));
  scene.add(createRope([
    new THREE.Vector3(3.9, 0.48, -14.4),
    new THREE.Vector3(4.5, 0.12, -13.8),
    new THREE.Vector3(4.55, 0.2, -12.1),
  ], materials.rope, 0.024));
  const shipProxy = createHitProxy("ship", new THREE.BoxGeometry(4.8, 7.4, 8.8), new THREE.Vector3(5.4, 3, -11.5));
  shipProxy.rotation.y = 0.12;
  scene.add(shipProxy);
  clickTargets.push(shipProxy);

  const farDock = new THREE.Mesh(new THREE.BoxGeometry(38, 0.45, 4.8), materials.wetWood);
  farDock.position.set(0, -0.22, -21);
  farDock.receiveShadow = true;
  scene.add(farDock);
  const stoneQuay = new THREE.Mesh(new THREE.BoxGeometry(43, 2.4, 2.2), materials.stone);
  stoneQuay.position.set(0, -0.94, -23.4);
  stoneQuay.receiveShadow = true;
  scene.add(stoneQuay);
  const warehouseLayouts = [
    [-16.2, -28.2, 3.15, 4.25, 2.8, -0.035],
    [-12.6, -29.1, 2.75, 3.55, 2.65, 0.024],
    [-9.1, -27.8, 3.45, 4.72, 2.95, -0.018],
    [-5.25, -29.2, 3.1, 3.82, 2.7, 0.038],
    [-1.55, -27.7, 3.55, 4.95, 3.05, -0.028],
    [2.35, -29.2, 3.0, 3.7, 2.7, 0.026],
    [5.95, -27.8, 3.55, 4.55, 3.0, -0.038],
    [9.75, -29.0, 3.0, 3.78, 2.75, 0.035],
    [13.3, -27.6, 3.35, 4.45, 2.95, -0.02],
    [16.65, -29.0, 2.65, 3.48, 2.6, 0.02],
    [-14.2, -24.75, 2.45, 3.02, 2.18, 0.02],
    [-7.2, -24.75, 2.65, 3.3, 2.25, -0.025],
    [0.05, -24.65, 2.55, 3.16, 2.2, 0.018],
    [7.45, -24.75, 2.78, 3.36, 2.25, -0.025],
    [14.45, -24.6, 2.48, 3.06, 2.16, 0.018],
  ];
  warehouseLayouts.forEach(([x, z, width, height, depth, rotation], index) => {
    const building = createWarehouse(materials, width, height, depth, index);
    building.position.set(x, 0, z);
    building.rotation.y = rotation;
    scene.add(building);
  });

  for (const [x, z, scale, rotation] of [[-8.7, -15.8, 0.78, -0.22], [10.8, -27.5, 0.58, 0.32]]) {
    const sloop = createHarborSloop(materials);
    sloop.position.set(x, -0.42, z);
    sloop.scale.setScalar(scale);
    sloop.rotation.y = rotation;
    scene.add(sloop);
  }

  for (const [x, z] of [[-12, -19.7], [-7.5, -20], [9.5, -20.2], [14, -19.8]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 3.1, 7), materials.wetWood);
    post.position.set(x, -1.06, z);
    post.castShadow = true;
    scene.add(post);
  }

  const quayGlowLeft = new THREE.PointLight(0xd9893d, 1.5, 8, 2);
  quayGlowLeft.position.set(-8, 2.1, -20.5);
  scene.add(quayGlowLeft);
  const quayGlowRight = new THREE.PointLight(0xc87a32, 1.2, 7, 2);
  quayGlowRight.position.set(9, 1.9, -20.5);
  scene.add(quayGlowRight);

  const fogGeometry = new THREE.BufferGeometry();
  const fogPositions = [];
  for (let i = 0; i < 280; i += 1) {
    fogPositions.push(
      ((i * 71) % 290) / 10 - 14.5,
      ((i * 37) % 45) / 10 - 0.2,
      -((i * 53) % 300) / 10,
    );
  }
  fogGeometry.setAttribute("position", new THREE.Float32BufferAttribute(fogPositions, 3));
  const fogPoints = new THREE.Points(
    fogGeometry,
    new THREE.PointsMaterial({ color: 0x8ba0b0, size: 0.045, transparent: true, opacity: 0.19, depthWrite: false }),
  );
  scene.add(fogPoints);

  const fogBanks = [
    [-7.5, 1.15, -8.5, 11, 2.2, 0.065],
    [7, 1.45, -12.5, 14, 2.7, 0.075],
    [-10, 1.75, -17.5, 17, 3.25, 0.095],
    [9, 2.1, -22.5, 20, 4.1, 0.12],
    [-2, 2.65, -28.2, 24, 5.3, 0.16],
  ].map(([x, y, z, width, height, opacity], index) => {
    const material = new THREE.SpriteMaterial({
      map: fogTexture,
      color: 0xb5c3cc,
      transparent: true,
      opacity,
      depthWrite: false,
      fog: false,
    });
    const bank = new THREE.Sprite(material);
    bank.position.set(x, y, z);
    bank.scale.set(width, height, 1);
    bank.userData.baseX = x;
    bank.userData.baseY = y;
    bank.userData.phase = index * 1.37;
    scene.add(bank);
    return bank;
  });

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

    for (let index = 0; index < waterPositions.count; index += 1) {
      const offset = index * 3;
      const localX = waterBase[offset];
      const localY = waterBase[offset + 1];
      const height = Math.sin(localX * 0.32 + time * 0.42) * 0.055
        + Math.sin(localY * 0.21 - time * 0.31) * 0.035;
      waterPositions.setZ(index, height);
    }
    waterPositions.needsUpdate = true;

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
    fogBanks.forEach((bank, index) => {
      bank.position.x = bank.userData.baseX + Math.sin(time * 0.055 + bank.userData.phase) * (0.45 + index * 0.1);
      bank.position.y = bank.userData.baseY + Math.sin(time * 0.09 + bank.userData.phase) * 0.06;
    });
    const lanternLight = lantern.userData.lanternLight;
    lanternLight.intensity = 5.15 + Math.sin(time * 8.1) * 0.26 + Math.sin(time * 13.7) * 0.13;
    renderer.render(scene, camera);
    if (import.meta.env.DEV) {
      renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
      renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
    }
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
      textures.forEach((texture) => texture.dispose());
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
