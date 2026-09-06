import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
    rollupOptions: {
      output: {
        assetFileNames(assetInfo) {
          const sourceName = assetInfo.names?.[0] ?? assetInfo.name ?? "";
          if (sourceName.endsWith(".traineddata.gz")) return "assets/ocr/[name][extname]";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client", "mind-ar > @tensorflow/tfjs", "mind-ar > @tensorflow/tfjs-backend-webgl", "mind-ar > @tensorflow/tfjs-core", "mind-ar > ml-matrix", "mind-ar > @msgpack/msgpack", "mind-ar > mathjs", "mind-ar > tinyqueue"],
    exclude: ["mind-ar"],
  },
  server: {
    host: "0.0.0.0",
    watch: { ignored: ["**/.artifacts/**"] },
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
