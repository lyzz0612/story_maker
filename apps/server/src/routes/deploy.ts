import type { FastifyPluginAsync } from "fastify";
import { getAboutInfo } from "../deploy/about.js";
import { getDeployConfig } from "../deploy/config.js";
import { getDeployState, triggerDeploy } from "../deploy/runner.js";
import { checkForUpdates, pullAndBuild } from "../deploy/update.js";
import { HttpError } from "../store.js";

type DeployUpdateBody = {
  branch?: string;
};

const requireDeployConfig = () => {
  const config = getDeployConfig();
  if (!config) {
    throw new HttpError(503, "Manual deploy is not enabled on this server");
  }
  return config;
};

export const deployRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/about", async () => getAboutInfo());

  fastify.get("/deploy/status", async () => {
    const config = getDeployConfig();
    return {
      enabled: Boolean(config),
      state: getDeployState()
    };
  });

  fastify.post("/deploy/update/check", async () => {
    const config = requireDeployConfig();
    const git = await checkForUpdates(config);
    const about = await getAboutInfo();
    return {
      ...about,
      deploy: {
        ...about.deploy,
        ...git
      }
    };
  });

  fastify.post("/deploy/update/pull", async () => {
    const config = requireDeployConfig();
    const result = await pullAndBuild(config);
    return {
      ...result,
      state: getDeployState()
    };
  });

  fastify.post<{ Body: DeployUpdateBody }>("/deploy/update", async (request, reply) => {
    const config = requireDeployConfig();

    if (request.body?.branch && request.body.branch.trim() !== config.branch) {
      const branchConfig = { ...config, branch: request.body.branch.trim() };
      const result = await pullAndBuild(branchConfig);
      return { accepted: result.success, ...result, state: getDeployState() };
    }

    const result = triggerDeploy(config, request.body?.branch);
    if (!result.accepted) {
      reply.code(409);
      return { accepted: false, reason: result.reason, state: getDeployState() };
    }

    reply.code(202);
    return { accepted: true, state: getDeployState() };
  });
};
