import type { FastifyPluginAsync } from "fastify";
import { mockGenerateArtStylePreview } from "../mock.js";
import { HttpError, listValues, makeId, requireItem, store } from "../store.js";
import type { ArtStyle } from "../types.js";

type IdParams = { id: string };
type ArtStyleBody = Partial<Omit<ArtStyle, "id">>;

const needsPreviewRegeneration = (body: ArtStyleBody, existing?: ArtStyle) => {
  if (!existing) {
    return true;
  }
  if (body.description !== undefined && body.description.trim() !== existing.description) {
    return true;
  }
  if (body.promptSuffix !== undefined && body.promptSuffix.trim() !== existing.promptSuffix) {
    return true;
  }
  return false;
};

const toArtStyle = (body: ArtStyleBody, existing?: ArtStyle): ArtStyle => {
  if (!body.name?.trim()) {
    throw new HttpError(400, "Art style name is required");
  }
  if (!body.promptSuffix?.trim()) {
    throw new HttpError(400, "Art style promptSuffix is required");
  }

  const item: ArtStyle = {
    id: existing?.id ?? makeId("style"),
    name: body.name.trim(),
    description: body.description?.trim() ?? existing?.description ?? "",
    promptSuffix: body.promptSuffix.trim(),
    previewUrl: existing?.previewUrl
  };

  if (!existing) {
    item.previewUrl = body.previewUrl?.trim() || mockGenerateArtStylePreview(item);
  } else if (needsPreviewRegeneration(body, existing)) {
    item.previewUrl = mockGenerateArtStylePreview(item);
  } else if (body.previewUrl?.trim()) {
    item.previewUrl = body.previewUrl.trim();
  }

  return item;
};

const previewFromBody = (body: ArtStyleBody) => {
  if (!body.name?.trim()) {
    throw new HttpError(400, "Art style name is required");
  }
  if (!body.promptSuffix?.trim()) {
    throw new HttpError(400, "Art style promptSuffix is required");
  }

  return mockGenerateArtStylePreview({
    id: "draft",
    name: body.name.trim(),
    description: body.description?.trim() || "",
    promptSuffix: body.promptSuffix.trim()
  });
};

export const artStyleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/art-styles", async () => listValues(store.artStyles));

  fastify.post<{ Body: ArtStyleBody }>("/art-styles", async (request, reply) => {
    const item = toArtStyle(request.body);
    store.artStyles.set(item.id, item);
    reply.code(201);
    return item;
  });

  fastify.post<{ Body: ArtStyleBody }>("/art-styles/generate-preview", async (request) => ({
    previewUrl: previewFromBody(request.body)
  }));

  fastify.get<{ Params: IdParams }>("/art-styles/:id", async (request) =>
    requireItem(store.artStyles, request.params.id, "Art style")
  );

  const updateArtStyle = (id: string, body: ArtStyleBody) => {
    const existing = requireItem(store.artStyles, id, "Art style");
    const item = toArtStyle({ ...existing, ...body }, existing);
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

  fastify.post<{ Params: IdParams; Body?: ArtStyleBody }>(
    "/art-styles/:id/generate-preview",
    async (request) => {
      const existing = requireItem(store.artStyles, request.params.id, "Art style");
      const body = request.body ?? {};
      const source: ArtStyle = {
        ...existing,
        name: body.name?.trim() || existing.name,
        description: body.description?.trim() ?? existing.description,
        promptSuffix: body.promptSuffix?.trim() || existing.promptSuffix
      };
      const item = { ...source, previewUrl: mockGenerateArtStylePreview(source) };
      store.artStyles.set(item.id, item);
      return item;
    }
  );
};
