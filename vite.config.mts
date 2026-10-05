import { defineConfig } from "vite";
import zaloMiniApp from "zmp-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default () => {
  return defineConfig({
    root: "./src",
    base: "",
    server: {
      fs: {
        deny: ["**/.env", "**/.env.*", "**/*.{crt,pem}", "**/.git/**", "**/backend/**"],
      },
      proxy: {
        "/api": "http://127.0.0.1:3001",
      },
    },
    plugins: [zaloMiniApp(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
};
