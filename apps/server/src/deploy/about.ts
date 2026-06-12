import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getDeployConfig, getRepoRoot, isDeployEnabled } from "./config.js";
import { gitInfoFromState } from "./update.js";
import { getDeployState } from "./runner.js";

const serverRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const fallbackRepoRoot = path.resolve(serverRoot, "../..");

const readPackageVersion = (repoRoot: string) => {
  try {
    const packagePath = path.join(repoRoot, "apps/web/package.json");
    const payload = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: string };
    return payload.version?.trim() || "0.0.0";
  } catch {
    return "0.0.0";
  }
};

export const getAboutInfo = async () => {
  const config = getDeployConfig();
  const repoRoot = config?.repoPath ?? getRepoRoot() ?? fallbackRepoRoot;
  const git = await gitInfoFromState(repoRoot, false);

  return {
    name: "Story Maker",
    version: readPackageVersion(repoRoot),
    repoRoot,
    deploy: {
      enabled: isDeployEnabled(),
      available: Boolean(config),
      branch: config?.branch,
      state: getDeployState(),
      ...git
    }
  };
};
