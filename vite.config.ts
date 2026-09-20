import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const nvidiaProxy = {
  "/nvidia-api": {
    target: "https://integrate.api.nvidia.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/nvidia-api/, ""),
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: nvidiaProxy },
  preview: { proxy: nvidiaProxy },
});
