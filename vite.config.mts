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
        "/api": { target: "http://127.0.0.1:3001", xfwd: true },
      },
    },
    plugins: [zaloMiniApp(), react({ jsxImportSource: "@/i18n" }), {
      name: "local-i18n-runtime",
      configResolved(config) {
        // React's plugin force-includes its JSX source. A local runtime must stay
        // outside the dependency bundle or it would contain a second store.
        config.optimizeDeps.include = (config.optimizeDeps.include ?? []).filter(id => !id.startsWith("@/i18n/"));
      },
    }],
    // Keep the local JSX runtime and the app on the same language-store instance.
    optimizeDeps: { exclude: ["@/i18n/jsx-runtime", "@/i18n/jsx-dev-runtime"] },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
};
