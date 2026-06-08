import type { FastifyPluginAsync } from "fastify";
import { HttpError, listValues, makeId, requireItem, store } from "../store.js";
import type { ArtStyle } from "../types.js";

type IdParams = { id: string };
type ArtStyleBody = Partial<Omit<ArtStyle, "id">>;

const toArtStyle = (body: ArtStyleBody, id = makeId("style")): ArtStyle => {
  if (!body.name?.trim()) {
    throw new HttpError(400, "Art style name is required");
  }
  if (!body.promptSuffix?.trim()) {
    throw new HttpError(400, "Art style promptSuffix is required");
  }

  return {
    id,
    name: body.name.trim(),
    description: body.description?.trim() || "",
    promptSuffix: body.promptSuffix.trim(),
    previewUrl: body.previewUrl
  };
};

export const artStyleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/art-styles", async () => listValues(store.artStyles));

  fastify.post<{ Body: ArtStyleBody }>("/art-styles", async (request, reply) => {
    const item = toArtStyle(request.body);
    store.artStyles.set(item.id, item);
    reply.code(201);
    return item;
  });

  fastify.get<{ Params: IdParams }>("/art-styles/:id", async (request) =>
    requireItem(store.artStyles, request.params.id, "Art style")
  );

  const updateArtStyle = (id: string, body: ArtStyleBody) => {
    const existing = requireItem(store.artStyles, id, "Art style");
    const item = toArtStyle({ ...existing, ...body }, existing.id);
    store.artStyles.set(item.id, item);
    return item;
  };

  fastify.put<{ Params: IdParams; Body: ArtStyleBody }>("/art-styles/:id", async (request) =>
    updateArtStyle(request.params.id, request.body)
  );
  fastify.patch<{ Params: IdParams; Body: ArtStyleBody }>("/art-styles/:id", async (request) =>
    updateArtStyle(request.params.id, request.body)
  );

  fastify.delete<{ Params: IdParams }>("/art-styles/:id", async (request, reply) => {
    requireItem(store.artStyles, request.params.id, "Art style");
    store.artStyles.delete(request.params.id);
    reply.code(204);
  });
};
