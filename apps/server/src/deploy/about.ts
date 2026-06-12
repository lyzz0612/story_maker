import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDeployConfig, isDeployEnabled } from "./config.js";
import { getDeployState } from "./runner.js";

const serverRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const repoRoot = path.resolve(serverRoot, "../..");

const readPackageVersion = () => {
  try {
    const packagePath = path.join(repoRoot, "apps/web/package.json");
    const payload = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: string };
    return payload.version?.trim() || "0.0.0";
  } catch {
    return "0.0.0";
  }
};

export const getAboutInfo = () => {
  const config = getDeployConfig();

  return {
    name: "Story Maker",
    version: readPackageVersion(),
    deploy: {
      enabled: isDeployEnabled(),
      available: Boolean(config),
      branch: config?.branch,
      state: getDeployState()
    }
  };
};
