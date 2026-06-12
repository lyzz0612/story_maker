import { EventEmitter } from "node:events";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import type { DeployConfig } from "./config.js";
import {
  resetDeployState,
  resetSpawnDeployImpl,
  setSpawnDeployImpl,
  type DeployProcess
} from "./runner.js";

const createMockDeployProcess = (exitCode: number, delayMs = 0): DeployProcess => {
  const emitter = new EventEmitter() as DeployProcess;
  emitter.unref = () => undefined;

  setTimeout(() => {
    emitter.emit("exit", exitCode);
  }, delayMs);

  return emitter;
};

describe.sequential("manual deploy", () => {
  let app: FastifyInstance;
  const previousEnv = { ...process.env };

  beforeEach(async () => {
    resetDeployState();
    resetSpawnDeployImpl();

    const tempDir = mkdtempSync(path.join(tmpdir(), "story-maker-deploy-"));

    process.env.DEPLOY_ENABLED = "true";
    process.env.DEPLOY_REPO_PATH = tempDir;
    process.env.DEPLOY_SCRIPT_PATH = path.join(tempDir, "deploy.sh");
    process.env.DEPLOY_BRANCH = "main";

    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
    process.env = { ...previousEnv };
    resetDeployState();
    resetSpawnDeployImpl();
  });

  it("returns about info", async () => {
    const response = await app.inject({ method: "GET", url: "/api/about" });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ name: string; version: string }>()).toMatchObject({
      name: "Story Maker",
      version: expect.any(String)
    });
  });

  it("rejects manual update when deploy is disabled", async () => {
    delete process.env.DEPLOY_ENABLED;
    await app.close();
    app = await buildApp();

    const response = await app.inject({ method: "POST", url: "/api/deploy/update" });
    expect(response.statusCode).toBe(503);
  });

  it("accepts manual update, rejects concurrent update, and reports status", async () => {
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
