import { createTargetRouter } from "./anchorTargets.js";

export async function createMindArTracker({
  videoElement, targetUrl, targetCount, onMatrix, signal,
  loadController = async () => (await import("mind-ar/src/image-target/controller.js")).Controller,
  fetchTarget = fetch,
}) {
  let controller = null;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    signal?.removeEventListener("abort", stop);
    controller?.dispose();
  };
  const check = () => {
    if (stopped || signal?.aborted) throw new DOMException("Page tracking cancelled", "AbortError");
  };
  signal?.addEventListener("abort", stop, { once: true });
  try {
    check();
    if (!targetUrl) throw new Error("No reference images are configured for this event.");
    // Download before allocating GPU/worker resources; abort immediately on exit.
    const response = await fetchTarget(targetUrl, { signal });
    if (!response.ok) throw new Error("The page reference images could not be loaded.");
    const buffer = await response.arrayBuffer();
    check();
    const Controller = await loadController();
    check();
    const inputWidth = videoElement.videoWidth, inputHeight = videoElement.videoHeight;
    let route = () => {};
    controller = new Controller({ inputWidth, inputHeight, maxTrack: 1,
      warmupTolerance: 3, missTolerance: 8, filterMinCF: 0.0007, filterBeta: 850,
      onUpdate: update => { if (!stopped) route(update); },
    });
    const { dimensions } = controller.addImageTargetsFromBuffer(buffer);
    if (dimensions.length !== targetCount) throw new Error("Reference image set is out of date. Please reload.");
    route = createTargetRouter(dimensions, onMatrix);
    controller.dummyRun(videoElement);
    check();
    controller.processVideo(videoElement);
    return { inputWidth, inputHeight, dimensions: dimensions[0], dimensionsList: dimensions,
      projectionMatrix: controller.getProjectionMatrix(), stop };
  } catch (error) {
    stop();
    throw error;
  }
}
