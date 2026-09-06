import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadSamuelAdamsProjectionModel } from "./SamuelAdamsProjectionModel";

export function ScanArtifactProjection({ active, onActivate, onModelStateChange, subjectId = "samuel-adams", interactive = true }) {
  const mountRef = useRef(null);
  const activeRef = useRef(active);
  const onActivateRef = useRef(onActivate);
  activeRef.current = active;
  onActivateRef.current = onActivate;
  const modelStateRef = useRef(onModelStateChange);
  modelStateRef.current = onModelStateChange;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0.05, 6.2);
    camera.lookAt(0, 0.02, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", premultipliedAlpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.className = "scan-artifact-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const projection = new THREE.Group();
    projection.position.y = 0.02;
    scene.add(projection);

    const characterMount = new THREE.Group();
    projection.add(characterMount);
    let characterAsset = null;
    let characterLoadCancelled = false;
    let revealStartedAt = performance.now();
    const loadController = new AbortController();
    modelStateRef.current?.("loading");

    loadSamuelAdamsProjectionModel({ subjectId, targetHeight: 2.62, groundY: -1.16, signal: loadController.signal })
      .then((asset) => {
        if (characterLoadCancelled) {
          asset.dispose();
          return;
        }
        characterAsset = asset;
        characterMount.add(asset.root);
        mount.dataset.modelState = "ready";
        mount.dataset.subjectId = subjectId;
        mount.dataset.animation = asset.animationName;
        modelStateRef.current?.("ready");
        projection.scale.setScalar(0.04);
        revealStartedAt = performance.now();
      })
      .catch((error) => {
        if (!characterLoadCancelled && error.name !== "AbortError") {
          mount.dataset.modelState = "error";
          modelStateRef.current?.("error");
        }
      });

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xf8d45e, transparent: true, opacity: 0.48, depthWrite: false, toneMapped: false });
    const rings = [
      { radius: 0.82, y: -1.16, tilt: 0.02 },
      { radius: 1.06, y: -1.08, tilt: -0.08 },
    ].map(({ radius, y, tilt }) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 8, 48), ringMaterial);
      ring.rotation.set(Math.PI / 2 + tilt, 0, 0);
      ring.position.y = y;
      projection.add(ring);
      return ring;
    });

    const ground = new THREE.Mesh(
      new THREE.RingGeometry(0.44, 0.96, 48),
      new THREE.MeshBasicMaterial({ color: 0xf7cc4b, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.18;
    projection.add(ground);

    const orbiters = [-1, 0, 1].map((index) => {
      const orbiter = new THREE.Mesh(
        new THREE.SphereGeometry(0.035 + Math.abs(index) * 0.008, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xfbe597, toneMapped: false }),
      );
      projection.add(orbiter);
      return orbiter;
    });


    const particleCount = 74;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleOrigins = [];
    const particleVelocities = [];
    const particleGold = new THREE.Color(0xffd65d);
    const particleBlue = new THREE.Color(0x78c9ff);
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2 + Math.sin(index * 9.71) * 0.3;
      const radius = 0.42 + ((index * 29) % 23) / 42;
      const origin = new THREE.Vector3(Math.cos(angle) * radius, -1 + (index % 7) * 0.06, Math.sin(angle) * 0.22);
      const velocity = new THREE.Vector3(
        Math.cos(angle) * (0.48 + (index % 8) * 0.055),
        1.05 + ((index * 19) % 13) * 0.085,
        Math.sin(angle) * (0.34 + (index % 5) * 0.04),
      );
      particleOrigins.push(origin);
      particleVelocities.push(velocity);
      particlePositions.set(origin.toArray(), index * 3);
      particleColors.set((index % 5 === 0 ? particleBlue : particleGold).toArray(), index * 3);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.renderOrder = 5;
    projection.add(particles);

    scene.add(new THREE.HemisphereLight(0xb9d4f2, 0x10172a, 2.25));
    const keyLight = new THREE.DirectionalLight(0xffe3a0, 3.4);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x5caeff, 7, 12, 2);
    rimLight.position.set(-2.2, 0.8, 2.5);
    scene.add(rimLight);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pressedAt = null;
    let hovered = false;
    let lastHoverCheck = 0;

    const updatePointer = (event) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1,
        -((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 + 1,
      );
    };
    const hitsCharacter = () => {
      raycaster.setFromCamera(pointer, camera);
      return characterAsset ? raycaster.intersectObjects(characterAsset.meshes, false).length > 0 : false;
    };
    const onPointerDown = (event) => {
      pressedAt = { x: event.clientX, y: event.clientY };
    };
    const onPointerMove = (event) => {
      if (event.timeStamp - lastHoverCheck < 45) return;
      lastHoverCheck = event.timeStamp;
      updatePointer(event);
      hovered = hitsCharacter();
      renderer.domElement.style.cursor = hovered ? "pointer" : "default";
    };
    const onPointerUp = (event) => {
      if (!pressedAt || Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > 8) {
        pressedAt = null;
        return;
      }
      pressedAt = null;
      updatePointer(event);
      if (hitsCharacter()) onActivateRef.current?.();
    };
    const onPointerLeave = () => {
      pressedAt = null;
      hovered = false;
      renderer.domElement.style.cursor = "default";
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerLeave);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

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
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    let animationFrame = 0;
    let previousTimestamp = 0;
    const render = (timestamp) => {
      const deltaSeconds = previousTimestamp ? (timestamp - previousTimestamp) / 1000 : 0;
      previousTimestamp = timestamp;
      characterAsset?.update(reduceMotion ? 0 : deltaSeconds);
      const seconds = reduceMotion ? 0 : timestamp * 0.001;
      const revealElapsed = Math.max(0, (timestamp - revealStartedAt) / 1000);
      const selected = activeRef.current;
      projection.position.y = 0.02 + Math.sin(seconds * 1.35) * 0.055;
      projection.rotation.y = Math.sin(seconds * 0.46) * 0.2;
      rings[0].rotation.z = seconds * 0.2;
      rings[1].rotation.z = -seconds * 0.15;
      orbiters.forEach((orbiter, index) => {
        const angle = seconds * (0.42 + index * 0.06) + index * Math.PI * 0.66;
        orbiter.position.set(Math.cos(angle) * 1.05, -0.2 + index * 0.52, Math.sin(angle) * 0.38);
      });

      if (characterAsset && !reduceMotion && revealElapsed <= 1.7) {
        const positionAttribute = particleGeometry.getAttribute("position");
        particleOrigins.forEach((origin, index) => {
          const velocity = particleVelocities[index];
          const drag = 1 - Math.min(0.5, revealElapsed * 0.24);
          positionAttribute.setXYZ(
            index,
            origin.x + velocity.x * revealElapsed * drag,
            origin.y + velocity.y * revealElapsed - revealElapsed * revealElapsed * 0.34,
            origin.z + velocity.z * revealElapsed * drag,
          );
        });
        positionAttribute.needsUpdate = true;
        particleMaterial.opacity = Math.sin(Math.min(1, revealElapsed / 1.7) * Math.PI) * 0.9;
        particleMaterial.size = 0.035 + Math.max(0, 1 - revealElapsed / 1.7) * 0.05;
      } else {
        particleMaterial.opacity = 0;
      }

      characterAsset?.setEmphasis(selected ? 1 : hovered ? 0.62 : 0);
      const reveal = reduceMotion ? 1 : THREE.MathUtils.smootherstep(Math.min(1, revealElapsed / 0.82), 0, 1);
      const selectedScale = selected ? 1.045 + Math.sin(seconds * 2.8) * 0.012 : 1;
      projection.scale.setScalar(Math.max(0.04, reveal) * selectedScale);
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      characterLoadCancelled = true;
      loadController.abort();
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerLeave);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      characterAsset?.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
        else object.material?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [subjectId]);

  return (
    <div
      ref={mountRef}
      className={`scan-artifact-projection ${active ? "is-active" : ""}`}
      role={interactive ? "button" : "img"}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`3D ${subjectId === "john-adams" ? "John Adams" : "Samuel Adams"} historical interpretation. ${interactive ? "Activate to inspect the projection." : "Looping gesture animation."}`}
      aria-pressed={interactive ? active : undefined}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate?.();
        }
      }}
    />
  );
}
