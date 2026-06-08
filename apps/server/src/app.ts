import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { FastifyError } from "fastify";
import { artStyleRoutes } from "./routes/art-styles.js";
import { characterRoutes } from "./routes/characters.js";
import { projectRoutes } from "./routes/projects.js";
import { settingsRoutes } from "./routes/settings.js";
import { seedStore } from "./seed.js";
import { HttpError } from "./store.js";

export const buildApp = async (): Promise<FastifyInstance> => {
  seedStore();

  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    }
  });

  await fastify.register(cors, {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });

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
    },
    { prefix: "/api" }
  );

  return fastify;
};
