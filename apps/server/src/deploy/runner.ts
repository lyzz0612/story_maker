import { spawn, type ChildProcess } from "node:child_process";
import type { DeployConfig } from "./config.js";

export type DeployProcess = Pick<ChildProcess, "on" | "unref">;

export type SpawnDeploy = (config: DeployConfig, branch: string) => DeployProcess;

const defaultSpawnDeploy: SpawnDeploy = (config, branch) =>
  spawn("bash", [config.scriptPath], {
    cwd: config.repoPath,
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      DEPLOY_REPO_PATH: config.repoPath,
      DEPLOY_BRANCH: branch
    }
  });

let spawnDeployImpl: SpawnDeploy = defaultSpawnDeploy;

export const setSpawnDeployImpl = (impl: SpawnDeploy) => {
  spawnDeployImpl = impl;
};

export const resetSpawnDeployImpl = () => {
  spawnDeployImpl = defaultSpawnDeploy;
};

export type DeployStatus = "idle" | "running" | "succeeded" | "failed";

export type DeployState = {
  status: DeployStatus;
  startedAt?: string;
  finishedAt?: string;
  branch?: string;
  error?: string;
};

let state: DeployState = { status: "idle" };

export const getDeployState = () => ({ ...state });

export const setDeployState = (next: DeployState) => {
  state = next;
};

export const triggerDeploy = (config: DeployConfig, branch?: string) => {
  if (state.status === "running") {
    return { accepted: false as const, reason: "deploy already running" };
  }

  const targetBranch = branch?.trim() || config.branch;
  const startedAt = new Date().toISOString();

  setDeployState({
    status: "running",
    startedAt,
    branch: targetBranch
  });

  const child = spawnDeployImpl(config, targetBranch);

  child.unref();

  child.on("error", (error) => {
    setDeployState({
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      branch: targetBranch,
      error: error.message
    });
  });

  child.on("exit", (code) => {
    if (state.status !== "running") {
      return;
    }

    if (code === 0) {
      setDeployState({
        status: "succeeded",
        startedAt,
        finishedAt: new Date().toISOString(),
        branch: targetBranch
      });
      return;
    }

    setDeployState({
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      branch: targetBranch,
      error: `deploy script exited with code ${code ?? "unknown"}`
    });
  });

  return { accepted: true as const };
};

export const resetDeployState = () => {
  state = { status: "idle" };
};
