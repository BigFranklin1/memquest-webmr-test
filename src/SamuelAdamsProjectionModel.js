import * as THREE from "three";
import samuelAdamsTalkModelUrl from "./assets/Meshy_AI_colonial_gentleman_re_biped/Meshy_AI_colonial_gentleman_re_biped_Animation_Talk_with_Left_Hand_on_Hip_withSkin.fbx?url";

export const SAMUEL_ADAMS_ANIMATION_LABEL = "Talk with left hand on hip";

function disposeObject(root) {
  const resources = new Set();
  root.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    if (object.skeleton) resources.add(object.skeleton);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value?.isTexture) {
          resources.add(value);
          const imageUrl = value.image?.currentSrc || value.image?.src;
          if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
        }
      });
      resources.add(material);
    });
  });
  resources.forEach((resource) => resource.dispose?.());
}

export async function loadSamuelAdamsProjectionModel({ targetHeight, groundY = 0, signal }) {
  const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
  signal?.throwIfAborted();
  const response = await fetch(samuelAdamsTalkModelUrl, { signal });
  if (!response.ok) throw new Error("The Samuel Adams model could not be downloaded.");
  const bytes = await response.arrayBuffer();
  signal?.throwIfAborted();

  // Wait for the embedded texture as well as the skeleton before revealing the figure.
  const manager = new THREE.LoadingManager();
  let loadingTextures = false;
  let textureFailed = false;
  let resolveTextures;
  const texturesReady = new Promise((resolve) => { resolveTextures = resolve; });
  manager.onStart = () => { loadingTextures = true; };
  manager.onLoad = () => resolveTextures();
  manager.onError = () => { textureFailed = true; };
  const model = new FBXLoader(manager).parse(bytes, "");
  let mixer;
  try {
    if (loadingTextures) await texturesReady;
    signal?.throwIfAborted();
    if (textureFailed) throw new Error("The character texture could not be loaded.");
    const materials = new Set();
    const meshes = [];
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.frustumCulled = false;
      meshes.push(object);
      const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
      meshMaterials.forEach((material) => {
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
        material.specular?.set(0x282824);
        if ("shininess" in material) material.shininess = 14;
        if (material.emissive?.isColor) {
          material.emissive.set(0x101827);
          material.emissiveIntensity = 0.34;
        }
        materials.add(material);
      });
    });

    mixer = new THREE.AnimationMixer(model);
    const talkClip = model.animations.find((clip) => /talk/i.test(clip.name)) ?? model.animations[0];
    if (!talkClip) throw new Error("The character animation is missing.");
    const talkAction = mixer.clipAction(talkClip);
    talkAction.setLoop(THREE.LoopRepeat, Infinity);
    talkAction.clampWhenFinished = false;
    talkAction.reset().play();
    mixer.update(0);

    // Keep normalization outside the animated hierarchy so root tracks cannot override it.
    const root = new THREE.Group();
    root.name = "Samuel Adams historical interpretation";
    root.add(model);
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root, true);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error("The character has invalid dimensions.");
    const scale = targetHeight / size.y;
    root.scale.setScalar(scale);
    const center = bounds.getCenter(new THREE.Vector3());
    root.position.set(-center.x * scale, groundY - bounds.min.y * scale, -center.z * scale);
    root.updateMatrixWorld(true);

    let disposed = false;
    return {
      root,
      meshes,
      animationName: talkClip.name,
      animationDuration: talkClip.duration,
      update(deltaSeconds) {
        if (!disposed) mixer.update(Math.min(0.05, Math.max(0, deltaSeconds)));
      },
      setEmphasis(amount) {
        materials.forEach((material) => {
          if (material.emissive?.isColor) material.emissiveIntensity = 0.34 + amount * 0.44;
        });
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
        root.remove(model);
        disposeObject(model);
      },
    };
  } catch (error) {
    mixer?.stopAllAction();
    mixer?.uncacheRoot(model);
    disposeObject(model);
    throw error;
  }
}
