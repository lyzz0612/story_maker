import type { FastifyPluginAsync } from "fastify";
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
  if (!isRelation(body.relation)) {
    throw new HttpError(400, "Character relation must be baby, dad, mom, or other");
  }

  const timestamp = now();
  return {
    id: existing?.id ?? makeId("char"),
    name: body.name.trim(),
    relation: body.relation,
    appearance: body.appearance?.trim() || "",
    referenceImageUrl: body.referenceImageUrl || existing?.referenceImageUrl || "/mock/characters/placeholder-ref.png",
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };
};

const generateReferenceImage = (character: Character) => {
  const slug = encodeURIComponent(character.name.toLowerCase());
  const updated: Character = {
    ...character,
    referenceImageUrl: `/mock/characters/generated-${slug}-${Date.now().toString(36)}.png`,
    updatedAt: now()
  };
  store.characters.set(updated.id, updated);
  return updated;
};

export const characterRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/characters", async () => listValues(store.characters));

  fastify.post<{ Body: CharacterBody }>("/characters", async (request, reply) => {
    const item = toCharacter(request.body);
    store.characters.set(item.id, item);
    reply.code(201);
    return item;
  });

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

  const mockReference = (id: string) => {
    const character = requireItem(store.characters, id, "Character");
    return generateReferenceImage(character);
  };

  fastify.post<{ Params: IdParams }>("/characters/:id/mock-reference-image", async (request) =>
    mockReference(request.params.id)
  );
  fastify.post<{ Params: IdParams }>("/characters/:id/mock-generate-reference", async (request) =>
    mockReference(request.params.id)
  );
  fastify.post<{ Params: IdParams }>("/characters/:id/reference-image/mock-generate", async (request) =>
    mockReference(request.params.id)
  );
};
