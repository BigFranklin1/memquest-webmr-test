import englishModelUrl from "@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url";
import standardCoreUrl from "tesseract.js-core/tesseract-core-lstm.wasm.js?url";
import simdCoreUrl from "tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url";
import workerUrl from "tesseract.js/dist/worker.min.js?url";

function absoluteAssetUrl(assetUrl) {
  return new URL(assetUrl, window.location.href).href;
}

export async function createLocalEnglishRecognizer(onProgress = () => {}) {
  const [{ createWorker, PSM }, { simd }] = await Promise.all([
    import("tesseract.js"),
    import("wasm-feature-detect"),
  ]);
  const supportsSimd = await simd().catch(() => false);
  const modelUrl = new URL(absoluteAssetUrl(englishModelUrl));
  const langPath = new URL(".", modelUrl).href;
  const worker = await createWorker("eng", 1, {
    workerPath: absoluteAssetUrl(workerUrl),
    corePath: absoluteAssetUrl(supportsSimd ? simdCoreUrl : standardCoreUrl),
    langPath,
    gzip: true,
    logger(message) {
      if (typeof message?.progress === "number") onProgress(message);
    },
  });

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    preserve_interword_spaces: "1",
  });

  return {
    async recognize(image) {
      const result = await worker.recognize(image, { rotateAuto: true });
      return {
        text: result.data?.text ?? "",
        confidence: result.data?.confidence ?? 0,
      };
    },
    terminate() {
      return worker.terminate();
    },
  };
}
