import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import type { FastifyError } from "fastify";
import path from "node:path";
import { getRepoRoot } from "./deploy/config.js";
import { artStyleRoutes } from "./routes/art-styles.js";
import { characterRoutes } from "./routes/characters.js";
import { deployRoutes } from "./routes/deploy.js";
import { projectRoutes } from "./routes/projects.js";
import { settingsRoutes } from "./routes/settings.js";
import { seedStore } from "./seed.js";
import { HttpError } from "./store.js";

const isProduction =
  process.env.APP_ENV === "production" ||
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.WEB_DIST_DIR);

export const buildApp = async (): Promise<FastifyInstance> => {
  seedStore();

  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    }
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024
    }
  });

  if (!isProduction) {
    const webPort = process.env.WEB_PORT ?? "5174";
    await fastify.register(cors, {
      origin: [`http://localhost:${webPort}`, `http://127.0.0.1:${webPort}`],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    });
  }

  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof HttpError) {
      reply.code(error.statusCode).send({ error: error.message });
      return;
    }

    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    reply.code(statusCode).send({
      error: statusCode === 500 ? "Internal server error" : error.message
    });
  });

  fastify.get("/health", async () => ({ ok: true }));

  await fastify.register(
    async (api) => {
      await api.register(settingsRoutes);
      await api.register(artStyleRoutes);
      await api.register(characterRoutes);
      await api.register(projectRoutes);
      await api.register(deployRoutes);
    },
    { prefix: "/api" }
  );

  if (isProduction) {
    const repoRoot = getRepoRoot();
    const webDistDir =
      process.env.WEB_DIST_DIR?.trim() || path.join(repoRoot, "apps/web/dist");
    const webPublicDir =
      process.env.WEB_PUBLIC_DIR?.trim() || path.join(repoRoot, "apps/web/public");

    await fastify.register(fastifyStatic, {
      root: path.join(webPublicDir, "assets", "projects"),
      prefix: "/assets/projects/",
      decorateReply: false
    });

    await fastify.register(fastifyStatic, {
      root: webDistDir,
      wildcard: false
    });

    fastify.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api")) {
        reply.code(404).send({ error: "Not found" });
        return;
      }

      return reply.sendFile("index.html", webDistDir);
    });
  }

  return fastify;
};
