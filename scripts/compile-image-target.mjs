import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PNG } from "pngjs";
import { getAnchorTargetSet, AUTO_SCAN_TARGET_SET } from "../src/anchorTargets.js";
import { CompilerBase } from "mind-ar/src/image-target/compiler-base.js";
import { buildTrackingImageList } from "mind-ar/src/image-target/image-list.js";
import { extractTrackingFeatures } from "mind-ar/src/image-target/tracker/extract-utils.js";
import "mind-ar/src/image-target/detector/kernels/cpu/index.js";

class PngCompiler extends CompilerBase {
  createProcessCanvas(image) {
    return {
      getContext() {
        return {
          drawImage() {},
          getImageData() {
            return { data: image.data };
          },
        };
      },
    };
  }

  compileTrack({ progressCallback, targetImages, basePercent }) {
    const percentPerImage = (100 - basePercent) / targetImages.length;
    let percent = 0;
    const list = targetImages.map((targetImage) => {
      const imageList = buildTrackingImageList(targetImage);
      const percentPerAction = percentPerImage / imageList.length;
      return extractTrackingFeatures(imageList, () => {
        percent += percentPerAction;
        progressCallback(basePercent + percent);
      });
    });
    return Promise.resolve(list);
  }
}

const eventMode = process.argv[2] === "--event";
const preset = process.argv[2] === "--all" ? AUTO_SCAN_TARGET_SET : eventMode ? getAnchorTargetSet(process.argv[3]) : null;
if (eventMode && !preset) throw new Error("Unknown anchor event");
const inputPaths = preset ? preset.images.map(image => resolve("src/assets/tracking", image.file)) : [resolve(process.argv[2] ?? "src/assets/tracking/boston-tea-party-cover.png")];
const outputPath = preset ? resolve("src/assets/tracking", preset.compiledFile) : resolve(process.argv[3] ?? "src/assets/tracking/boston-tea-party-cover.mind");
const images = await Promise.all(inputPaths.map(async path => PNG.sync.read(await readFile(path))));
const compiler = new PngCompiler();
let lastReported = -1;

await compiler.compileImageTargets(images, (progress) => {
  const rounded = Math.floor(progress / 10) * 10;
  if (rounded !== lastReported) {
    lastReported = rounded;
    process.stdout.write(`Compiling target: ${Math.min(100, rounded)}%\n`);
  }
});

await writeFile(outputPath, compiler.exportData());
process.stdout.write(`Wrote ${outputPath}\n`);
