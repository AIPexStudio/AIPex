import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bridge.ts", "src/daemon.ts", "src/cli.ts"],
  format: ["esm"],
  target: "node18",
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
