import type { FastifyPluginAsync } from "fastify";
import { getAboutInfo } from "../deploy/about.js";
import { getDeployConfig } from "../deploy/config.js";
import { getDeployState, triggerDeploy } from "../deploy/runner.js";
import { HttpError } from "../store.js";

type DeployUpdateBody = {
  branch?: string;
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

  fastify.post<{ Body: DeployUpdateBody }>("/deploy/update", async (request, reply) => {
    const config = getDeployConfig();
    if (!config) {
      throw new HttpError(503, "Manual deploy is not enabled on this server");
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
