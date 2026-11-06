import { readdirSync } from "node:fs";
import { spawn } from "node:child_process";

// Run isolated test servers sequentially so their ports and Vite caches do not collide.
const files = readdirSync(new URL("../backend/", import.meta.url))
  .filter(name => name.endsWith(".test.mjs"))
  .sort().map(name => `backend/${name}`);
const child = spawn(process.execPath, ["--test", "--test-concurrency=1", ...files], {
  cwd: new URL("../", import.meta.url), stdio: "inherit", windowsHide: true,
});
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
