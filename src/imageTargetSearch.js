// Acquisition only: low-resolution, serial public MindAR detect/match calls.
// Pose tracking starts separately after the event is locked.
export async function createImageTargetSearch({ videoElement, targetUrl, targetCount, signal,
  loadController = async () => (await import('mind-ar/src/image-target/controller.js')).Controller }) {
  const response = await fetch(targetUrl, { signal });
  if (!response.ok) throw new Error('Reference images unavailable');
  const buffer = await response.arrayBuffer();
  const Controller = await loadController();
  signal.throwIfAborted();
  const scale = Math.min(1, 640 / Math.max(videoElement.videoWidth, videoElement.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(videoElement.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(videoElement.videoHeight * scale));
  const context = canvas.getContext('2d');
  const controller = new Controller({ inputWidth: canvas.width, inputHeight: canvas.height, maxTrack: 1 });
  let stopped = false, busy = false, disposed = false;
  const dispose = () => { if (!disposed && !busy) { disposed = true; controller.dispose(); } };
  const stop = () => { stopped = true; signal.removeEventListener('abort', stop); dispose(); };
  signal.addEventListener('abort', stop, { once: true });
  try {
    const { dimensions } = controller.addImageTargetsFromBuffer(buffer);
    if (dimensions.length !== targetCount) throw new Error('Reference set is out of date');
  } catch (error) { stop(); throw error; }
  return {
    stop,
    async detect() {
      if (stopped || busy || videoElement.readyState < 2) return null;
      busy = true;
      try {
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const { featurePoints } = await controller.detect(canvas);
        for (let index = 0; index < targetCount && !stopped; index++) {
          const result = await controller.match(featurePoints, index);
          if (result.modelViewTransform && !stopped) return index;
        }
        return null;
      } finally { busy = false; if (stopped) dispose(); }
    },
  };
}
