import { EventEmitter } from "node:events";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import type { DeployConfig } from "./config.js";
import * as updateModule from "./update.js";
import {
  resetDeployState,
  resetSpawnDeployImpl,
  setSpawnDeployImpl,
  type DeployProcess
} from "./runner.js";

const createMockDeployProcess = (exitCode: number, delayMs = 0): DeployProcess => {
  const emitter = new EventEmitter();
  const process = emitter as unknown as DeployProcess;
  process.unref = () => undefined;

  setTimeout(() => {
    emitter.emit("exit", exitCode);
  }, delayMs);

  return process;
};

describe.sequential("manual deploy", () => {
  let app: FastifyInstance;
  const previousEnv = { ...process.env };

  beforeEach(async () => {
    resetDeployState();
    resetSpawnDeployImpl();
    vi.restoreAllMocks();

    const tempDir = mkdtempSync(path.join(tmpdir(), "story-maker-deploy-"));

    process.env.DEPLOY_ENABLED = "true";
    process.env.DEPLOY_REPO_PATH = tempDir;
    process.env.REPO_ROOT = tempDir;
    process.env.DEPLOY_SCRIPT_PATH = path.join(tempDir, "deploy.sh");
    process.env.DEPLOY_BRANCH = "main";

    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
    process.env = { ...previousEnv };
    resetDeployState();
    resetSpawnDeployImpl();
    vi.restoreAllMocks();
  });

  it("returns about info with git fields", async () => {
    const response = await app.inject({ method: "GET", url: "/api/about" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      name: "Story Maker",
      version: expect.any(String),
      repoRoot: expect.any(String),
      deploy: {
        updateSupported: expect.any(Boolean),
        behindCommits: expect.any(Number)
      }
    });
  });

  it("rejects manual update when deploy is disabled", async () => {
    delete process.env.DEPLOY_ENABLED;
    await app.close();
    app = await buildApp();

    const response = await app.inject({ method: "POST", url: "/api/deploy/update/pull" });
    expect(response.statusCode).toBe(503);
  });

  it("checks updates via deploy check endpoint", async () => {
    vi.spyOn(updateModule, "checkForUpdates").mockResolvedValue({
      updateSupported: true,
      gitRemote: "https://github.com/example/story_maker.git",
      gitBranch: "main",
      gitCommit: "abc1234",
      gitUpstreamCommit: "def5678",
      updateAvailable: true,
      behindCommits: 2
    });

    const response = await app.inject({ method: "POST", url: "/api/deploy/update/check" });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ deploy: { behindCommits: number } }>().deploy.behindCommits).toBe(2);
  });

  it("pulls updates and returns command output", async () => {
    vi.spyOn(updateModule, "pullAndBuild").mockResolvedValue({
      success: true,
      message: "更新完成",
      output: "$ git pull\nAlready up to date.",
      version: "0.0.0",
      gitCommit: "abc1234",
      restartRequired: false
    });

    const response = await app.inject({ method: "POST", url: "/api/deploy/update/pull" });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ success: boolean; output: string }>()).toMatchObject({
      success: true,
      output: expect.stringContaining("git pull")
    });
  });

  it("accepts async manual update, rejects concurrent update, and reports status", async () => {
    setSpawnDeployImpl((_config: DeployConfig) => createMockDeployProcess(0, 200));

    const updateResponse = await app.inject({
      method: "POST",
      url: "/api/deploy/update"
    });

    expect(updateResponse.statusCode).toBe(202);
    expect(updateResponse.json<{ accepted: boolean }>().accepted).toBe(true);

    const concurrentResponse = await app.inject({
      method: "POST",
      url: "/api/deploy/update"
    });
    expect(concurrentResponse.statusCode).toBe(409);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const statusResponse = await app.inject({ method: "GET", url: "/api/deploy/status" });
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json<{ state: { status: string } }>().state.status).toBe("succeeded");
  });
});
