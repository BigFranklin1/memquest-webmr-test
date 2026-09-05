import { useEffect, useRef } from "react";
import * as THREE from "three";
import bostonTeaPartyTarget from "./assets/tracking/boston-tea-party-cover.mind?url";
import { loadSamuelAdamsProjectionModel } from "./SamuelAdamsProjectionModel";

const TRACKING_RENDER_LIMIT = 960;
const TARGET_INDEX = 0;

export const BOSTON_TEA_PARTY_ANCHOR_EVENT_ID = "tea-party";

export function calculateCoverLayout(inputWidth, inputHeight, viewportWidth, viewportHeight) {
  const scale = Math.max(viewportWidth / inputWidth, viewportHeight / inputHeight);
  const width = inputWidth * scale;
  const height = inputHeight * scale;
  return {
    width,
    height,
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2,
  };
}

function waitForVideo(videoElement) {
  if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && videoElement.videoWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera frames were not ready for page tracking."));
    }, 6000);
    const onReady = () => {
      if (!videoElement.videoWidth) return;
      cleanup();
      resolve();
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      videoElement.removeEventListener("loadeddata", onReady);
      videoElement.removeEventListener("playing", onReady);
    };
    videoElement.addEventListener("loadeddata", onReady);
    videoElement.addEventListener("playing", onReady);
  });
}

function createParticleBurst() {
  const count = 78;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const origins = [];
  const velocities = [];
  const gold = new THREE.Color(0xffd75f);
  const blue = new THREE.Color(0x78c8ff);

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + Math.sin(index * 12.9898) * 0.24;
    const radius = 0.045 + ((index * 37) % 23) / 330;
    const origin = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.025 + (index % 9) * 0.003);
    const speed = 0.11 + ((index * 17) % 19) / 150;
    const velocity = new THREE.Vector3(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      0.12 + ((index * 29) % 17) / 90,
    );
    origins.push(origin);
    velocities.push(velocity);
    positions.set(origin.toArray(), index * 3);
    colors.set((index % 4 === 0 ? blue : gold).toArray(), index * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.018,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = 4;

  return {
    points,
    update(elapsed) {
      if (elapsed < 0) {
        material.opacity = 0;
        return;
      }
      if (elapsed > 1.65) {
        const positionAttribute = geometry.getAttribute("position");
        for (let index = 0; index < count; index += 1) {
          const origin = origins[index];
          const drift = elapsed * 0.8 + index * 0.61;
          positionAttribute.setXYZ(
            index,
            origin.x * 1.8 + Math.sin(drift) * 0.018,
            origin.y * 1.8 + Math.cos(drift * 0.86) * 0.018,
            0.04 + (index % 11) * 0.006 + Math.sin(drift * 1.2) * 0.012,
          );
        }
        positionAttribute.needsUpdate = true;
        material.opacity = 0.14 + Math.sin(elapsed * 2.1) * 0.035;
        material.size = 0.008;
        return;
      }
      const positionAttribute = geometry.getAttribute("position");
      for (let index = 0; index < count; index += 1) {
        const origin = origins[index];
        const velocity = velocities[index];
        const drag = 1 - Math.min(0.48, elapsed * 0.26);
        positionAttribute.setXYZ(
          index,
          origin.x + velocity.x * elapsed * drag,
          origin.y + velocity.y * elapsed * drag,
          origin.z + velocity.z * elapsed - elapsed * elapsed * 0.052,
        );
      }
      positionAttribute.needsUpdate = true;
      material.opacity = Math.sin(Math.min(1, elapsed / 1.65) * Math.PI) * 0.92;
      material.size = 0.012 + Math.max(0, 1 - elapsed / 1.65) * 0.012;
    },
  };
}

function createAnchoredArtifact() {
  const root = new THREE.Group();
  const characterMount = new THREE.Group();
  characterMount.rotation.x = Math.PI / 2;
  characterMount.position.z = 0.012;
  root.add(characterMount);
  let characterAsset = null;
  let disposed = false;

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd45a,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
    toneMapped: false,
  });
  const rings = [0.18, 0.25].map((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, index === 0 ? 0.006 : 0.0035, 7, 52), ringMaterial.clone());
    ring.position.z = 0.012 + index * 0.003;
    root.add(ring);
    return ring;
  });

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.23, 48),
    new THREE.MeshBasicMaterial({ color: 0x75bce7, transparent: true, opacity: 0.13, depthWrite: false, toneMapped: false }),
  );
  glow.position.z = 0.006;
  root.add(glow);

  const particleBurst = createParticleBurst();
  root.add(particleBurst.points);

  return {
    root,
    rings,
    glow,
    particleBurst,
    async loadCharacter(signal) {
      const asset = await loadSamuelAdamsProjectionModel({ targetHeight: 0.54, groundY: 0, signal });
      if (disposed) {
        asset.dispose();
        return false;
      }
      characterAsset = asset;
      characterMount.add(asset.root);
      return true;
    },
    update(now, burstStart, reduceMotion, deltaSeconds) {
      characterAsset?.update(reduceMotion ? 0 : deltaSeconds);
      const elapsed = burstStart > 0 ? (now - burstStart) / 1000 : -1;
      const reveal = reduceMotion || elapsed < 0 ? 1 : THREE.MathUtils.smootherstep(Math.min(1, elapsed / 0.9), 0, 1);
      root.scale.setScalar(Math.max(0.035, reveal));
      characterAsset?.setEmphasis(0.28 + reveal * 0.22);
      rings[0].rotation.z = reduceMotion ? 0 : now * 0.00031;
      rings[1].rotation.z = reduceMotion ? 0 : -now * 0.00023;
      glow.material.opacity = 0.1 + Math.sin(now * 0.002) * 0.035;
      particleBurst.update(reduceMotion || !characterAsset ? -1 : elapsed);
    },
    dispose() {
      disposed = true;
      characterAsset?.dispose();
      characterAsset = null;
    },
  };
}

async function createMindArTracker({ videoElement, onMatrix }) {
  const { Controller } = await import("mind-ar/src/image-target/controller.js");
  const inputWidth = videoElement.videoWidth;
  const inputHeight = videoElement.videoHeight;
  let controller = null;

  try {
    controller = new Controller({
      inputWidth,
      inputHeight,
      maxTrack: 1,
      warmupTolerance: 3,
      missTolerance: 8,
      filterMinCF: 0.0007,
      filterBeta: 850,
      onUpdate: (update) => {
        if (update.type === "updateMatrix" && update.targetIndex === TARGET_INDEX) onMatrix(update.worldMatrix);
      },
    });
    const response = await fetch(bostonTeaPartyTarget);
    if (!response.ok) throw new Error("The page anchor target could not be loaded.");
    const { dimensions } = controller.addImageTargetsFromBuffer(await response.arrayBuffer());
    controller.dummyRun(videoElement);
    controller.processVideo(videoElement);

    return {
      inputWidth,
      inputHeight,
      dimensions: dimensions[TARGET_INDEX],
      projectionMatrix: controller.getProjectionMatrix(),
      stop() {
        controller.dispose();
      },
    };
  } catch (error) {
    controller?.dispose();
    throw error;
  }
}

export function ScanImageAnchorProjection({
  enabled,
  videoElement,
  onTrackingChange,
  onAnchorPose,
  onModelStateChange,
  trackerFactory = createMindArTracker,
}) {
  const mountRef = useRef(null);
  const onTrackingChangeRef = useRef(onTrackingChange);
  const onAnchorPoseRef = useRef(onAnchorPose);
  onTrackingChangeRef.current = onTrackingChange;
  onAnchorPoseRef.current = onAnchorPose;
  const modelStateRef = useRef(onModelStateChange);
  modelStateRef.current = onModelStateChange;

  useEffect(() => {
    const mount = mountRef.current;
    if (!enabled || !mount || !videoElement) return undefined;

    let cancelled = false;
    let tracker = null;
    let animationFrame = 0;
    let latestLayout = null;
    let lastPoseUpdate = 0;
    let targetVisible = false;
    let hasEverFound = false;
    let burstStart = 0;
    let postMatrix = null;
    let pendingWorldMatrix = null;
    const previousWidth = videoElement.getAttribute("width");
    const previousHeight = videoElement.getAttribute("height");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const hidePoseLabel =
      window.matchMedia?.("(max-width: 720px), (orientation: landscape) and (max-height: 620px)")
        ?.matches ?? false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    camera.matrixAutoUpdate = false;
    camera.matrix.identity();
    camera.matrixWorld.identity();
    camera.matrixWorldInverse.identity();
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.className = "scan-image-anchor-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const anchorGroup = new THREE.Group();
    anchorGroup.matrixAutoUpdate = false;
    anchorGroup.visible = false;
    scene.add(anchorGroup);
    const artifact = createAnchoredArtifact();
    const loadController = new AbortController();
    modelStateRef.current?.("loading");
    anchorGroup.add(artifact.root);
    artifact
      .loadCharacter(loadController.signal)
      .then((loaded) => {
        if (loaded && !cancelled) {
          mount.dataset.modelState = "ready";
          modelStateRef.current?.("ready");
          if (targetVisible) burstStart = performance.now();
        }
      })
      .catch((error) => {
        if (!cancelled && error.name !== "AbortError") {
          mount.dataset.modelState = "error";
          modelStateRef.current?.("error");
        }
      });
    scene.add(new THREE.HemisphereLight(0xc5ddf7, 0x131a28, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffe5a0, 3.2);
    keyLight.position.set(1.8, 2.4, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x66b9ff, 4.5, 10, 2);
    rimLight.position.set(-1.4, 0.8, 2.3);
    scene.add(rimLight);

    const reportStatus = (state, message = "") => {
      if (!cancelled) onTrackingChangeRef.current?.({ state, message });
    };

    const resize = () => {
      const inputWidth = tracker?.inputWidth ?? videoElement.videoWidth;
      const inputHeight = tracker?.inputHeight ?? videoElement.videoHeight;
      if (!inputWidth || !inputHeight) return;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      latestLayout = calculateCoverLayout(inputWidth, inputHeight, viewportWidth, viewportHeight);
      const renderScale = Math.min(1, TRACKING_RENDER_LIMIT / Math.max(inputWidth, inputHeight));
      renderer.setSize(Math.max(1, Math.round(inputWidth * renderScale)), Math.max(1, Math.round(inputHeight * renderScale)), false);
      Object.assign(renderer.domElement.style, {
        width: `${latestLayout.width}px`,
        height: `${latestLayout.height}px`,
        left: `${latestLayout.left}px`,
        top: `${latestLayout.top}px`,
      });
    };

    const reportPose = (now) => {
      if (hidePoseLabel || !targetVisible || !latestLayout || now - lastPoseUpdate < 150) return;
      lastPoseUpdate = now;
      const projected = new THREE.Vector3(0, 0, 0.18).applyMatrix4(anchorGroup.matrix).project(camera);
      if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) return;
      onAnchorPoseRef.current?.({
        x: latestLayout.left + (projected.x + 1) * 0.5 * latestLayout.width,
        y: latestLayout.top + (1 - projected.y) * 0.5 * latestLayout.height,
      });
    };

    let previousTimestamp = 0;
    const render = (now) => {
      const deltaSeconds = previousTimestamp ? (now - previousTimestamp) / 1000 : 0;
      previousTimestamp = now;
      artifact.update(now, burstStart, reduceMotion, targetVisible ? deltaSeconds : 0);
      reportPose(now);
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    animationFrame = window.requestAnimationFrame(render);

    const start = async () => {
      try {
        reportStatus("loading");
        await waitForVideo(videoElement);
        if (cancelled) return;
        videoElement.width = videoElement.videoWidth;
        videoElement.height = videoElement.videoHeight;

        tracker = await trackerFactory({
          videoElement,
          targetUrl: bostonTeaPartyTarget,
          onMatrix: (worldMatrix) => {
            if (cancelled) return;
            if (!worldMatrix) {
              pendingWorldMatrix = null;
              anchorGroup.visible = false;
              targetVisible = false;
              reportStatus(hasEverFound ? "lost" : "searching");
              return;
            }
            pendingWorldMatrix = worldMatrix;
            if (!postMatrix) return;
            if (!targetVisible) {
              targetVisible = true;
              hasEverFound = true;
              burstStart = performance.now();
              reportStatus("found");
            }
            anchorGroup.visible = true;
            anchorGroup.matrix.fromArray(worldMatrix).multiply(postMatrix);
          },
        });
        if (cancelled) {
          tracker.stop?.();
          return;
        }

        const [targetWidth, targetHeight] = tracker.dimensions;
        postMatrix = new THREE.Matrix4().compose(
          new THREE.Vector3(targetWidth / 2, targetHeight / 2, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(targetWidth, targetWidth, targetWidth),
        );
        camera.projectionMatrix.fromArray(tracker.projectionMatrix);
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
        if (pendingWorldMatrix) anchorGroup.matrix.fromArray(pendingWorldMatrix).multiply(postMatrix);

        resize();
        if (!targetVisible) reportStatus("searching");
      } catch (error) {
        if (!cancelled) reportStatus("error", error?.message ?? "Page tracking could not start.");
      }
    };

    window.addEventListener("resize", resize);
    start();

    return () => {
      cancelled = true;
      loadController.abort();
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      tracker?.stop?.();
      artifact.dispose();
      if (previousWidth === null) videoElement.removeAttribute("width");
      else videoElement.setAttribute("width", previousWidth);
      if (previousHeight === null) videoElement.removeAttribute("height");
      else videoElement.setAttribute("height", previousHeight);
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
        else object.material?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [enabled, trackerFactory, videoElement]);

  return <div ref={mountRef} className="scan-image-anchor-layer" aria-hidden="true" />;
}
