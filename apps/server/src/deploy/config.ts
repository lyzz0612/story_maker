import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const repoRoot = path.resolve(serverRoot, "../..");

export type DeployConfig = {
  repoPath: string;
  scriptPath: string;
  branch: string;
};

export const isDeployEnabled = () => process.env.DEPLOY_ENABLED === "true";

export const getDeployConfig = (): DeployConfig | null => {
  if (!isDeployEnabled()) {
    return null;
  }

  return {
    repoPath: process.env.DEPLOY_REPO_PATH?.trim() || repoRoot,
    scriptPath: process.env.DEPLOY_SCRIPT_PATH?.trim() || path.join(repoRoot, "scripts", "deploy.sh"),
    branch: process.env.DEPLOY_BRANCH?.trim() || "main"
  };
};
