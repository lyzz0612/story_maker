import type { FastifyPluginAsync } from "fastify";
import { mockGenerateCharacterReferenceUrl } from "../mock.js";
import { HttpError, listValues, makeId, now, requireItem, store } from "../store.js";
import type { Character, Relation } from "../types.js";

type IdParams = { id: string };
type CharacterBody = Partial<Omit<Character, "id" | "createdAt" | "updatedAt">>;

const isRelation = (value: unknown): value is Relation =>
  value === "baby" || value === "dad" || value === "mom" || value === "other";

const toCharacter = (body: CharacterBody, existing?: Character): Character => {
  if (!body.name?.trim()) {
    throw new HttpError(400, "Character name is required");
  }

  const timestamp = now();
  return {
    id: existing?.id ?? makeId("char"),
    name: body.name.trim(),
    relation: isRelation(body.relation) ? body.relation : existing?.relation ?? "other",
    appearance: body.appearance?.trim() || "",
    referenceImageUrl:
      body.referenceImageUrl?.trim() ||
      existing?.referenceImageUrl ||
      "/assets/characters/placeholder-ref.png",
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };
};

const referenceFromBody = (body: CharacterBody) => {
  if (!body.name?.trim()) {
    throw new HttpError(400, "Character name is required");
  }
  if (!body.appearance?.trim()) {
    throw new HttpError(400, "Character appearance is required");
  }

  return mockGenerateCharacterReferenceUrl({
    name: body.name.trim(),
    appearance: body.appearance.trim()
  });
};

export const characterRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/characters", async () => listValues(store.characters));

  fastify.post<{ Body: CharacterBody }>("/characters", async (request, reply) => {
    const item = toCharacter(request.body);
    store.characters.set(item.id, item);
    reply.code(201);
    return item;
  });

  fastify.post<{ Body: CharacterBody }>("/characters/generate-reference", async (request) => ({
    referenceImageUrl: referenceFromBody(request.body)
  }));

  fastify.get<{ Params: IdParams }>("/characters/:id", async (request) =>
    requireItem(store.characters, request.params.id, "Character")
  );

  fastify.put<{ Params: IdParams; Body: CharacterBody }>("/characters/:id", async (request) => {
    const existing = requireItem(store.characters, request.params.id, "Character");
    const item = toCharacter({ ...existing, ...request.body }, existing);
    store.characters.set(item.id, item);
    return item;
  });

  fastify.patch<{ Params: IdParams; Body: CharacterBody }>("/characters/:id", async (request) => {
    const existing = requireItem(store.characters, request.params.id, "Character");
    const item = toCharacter({ ...existing, ...request.body }, existing);
    store.characters.set(item.id, item);
    return item;
  });

  fastify.delete<{ Params: IdParams }>("/characters/:id", async (request, reply) => {
    requireItem(store.characters, request.params.id, "Character");
    store.characters.delete(request.params.id);
    reply.code(204);
  });

  fastify.post<{ Params: IdParams; Body?: CharacterBody }>(
    "/characters/:id/generate-reference",
    async (request) => {
      const existing = requireItem(store.characters, request.params.id, "Character");
      const body = request.body ?? {};
      const source = {
        name: body.name?.trim() || existing.name,
        appearance: body.appearance?.trim() || existing.appearance
      };
      const item = {
        ...existing,
        ...source,
        referenceImageUrl: mockGenerateCharacterReferenceUrl(source),
        updatedAt: now()
      };
      store.characters.set(item.id, item);
      return item;
    }
  );
};
