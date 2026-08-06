

import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        manga: resolve(__dirname, "src/manga/index.html"),
      },
    },
  },
});

