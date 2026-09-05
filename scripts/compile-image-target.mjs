import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PNG } from "pngjs";
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

const inputPath = resolve(process.argv[2] ?? "src/assets/tracking/boston-tea-party-cover.png");
const outputPath = resolve(process.argv[3] ?? "src/assets/tracking/boston-tea-party-cover.mind");
const png = PNG.sync.read(await readFile(inputPath));
const compiler = new PngCompiler();
let lastReported = -1;

await compiler.compileImageTargets([png], (progress) => {
  const rounded = Math.floor(progress / 10) * 10;
  if (rounded !== lastReported) {
    lastReported = rounded;
    process.stdout.write(`Compiling target: ${Math.min(100, rounded)}%\n`);
  }
});

await writeFile(outputPath, compiler.exportData());
process.stdout.write(`Wrote ${outputPath}\n`);
