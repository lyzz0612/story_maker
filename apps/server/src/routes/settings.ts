import type { FastifyPluginAsync } from "fastify";
import { HttpError, listValues, makeId, store } from "../store.js";
import type { ImageProviderConfig, LlmProviderConfig } from "../types.js";

type ConfigListBody<T> = T[] | { items?: T[] };

const readItems = <T>(body: ConfigListBody<T> | undefined, label: string) => {
  const items = Array.isArray(body) ? body : body?.items;
  if (!items) {
    throw new HttpError(400, `${label} config list is required`);
  }
  if (items.length === 0) {
    throw new HttpError(400, `At least one ${label} config is required`);
  }
  return items;
};

const normalizeDefaults = <T extends { id: string; isDefault: boolean }>(
  items: T[],
  previousDefaultId: string | undefined,
  label: string
) => {
  const defaultId =
    items.find((item) => item.isDefault)?.id ??
    (previousDefaultId && items.some((item) => item.id === previousDefaultId) ? previousDefaultId : undefined);

  if (!defaultId) {
    throw new HttpError(400, `Set a new default ${label} config before removing the current default`);
  }

  return items.map((item) => ({ ...item, isDefault: item.id === defaultId }));
};

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/settings/llm", async () => listValues(store.llmConfigs));

  fastify.put<{ Body: ConfigListBody<Partial<LlmProviderConfig>> }>("/settings/llm", async (request) => {
    const previousDefaultId = listValues(store.llmConfigs).find((item) => item.isDefault)?.id;
    const nextItems = readItems(request.body, "LLM").map<LlmProviderConfig>((item) => ({
      id: item.id || makeId("llm"),
      name: item.name?.trim() || "Untitled LLM",
      provider: "openai-compatible",
      baseUrl: item.baseUrl || "https://api.openai.com/v1",
      apiKey: item.apiKey || "",
      model: item.model || "gpt-4.1-mini",
      isDefault: Boolean(item.isDefault)
    }));

    const normalized = normalizeDefaults(nextItems, previousDefaultId, "LLM");
    store.llmConfigs.clear();
    normalized.forEach((item) => store.llmConfigs.set(item.id, item));
    return normalized;
  });

  fastify.get("/settings/image", async () => listValues(store.imageConfigs));

  fastify.put<{ Body: ConfigListBody<Partial<ImageProviderConfig>> }>("/settings/image", async (request) => {
    const previousDefaultId = listValues(store.imageConfigs).find((item) => item.isDefault)?.id;
    const nextItems = readItems(request.body, "image").map<ImageProviderConfig>((item) => ({
      id: item.id || makeId("image"),
      name: item.name?.trim() || "Untitled Image Model",
      provider:
        item.provider === "replicate" || item.provider === "openai-compatible" ? item.provider : "fal",
      baseUrl: item.baseUrl || "https://api.openai.com/v1",
      apiKey: item.apiKey || "",
      model: item.model || "dall-e-3",
      isDefault: Boolean(item.isDefault)
    }));

    const normalized = normalizeDefaults(nextItems, previousDefaultId, "image");
    store.imageConfigs.clear();
    normalized.forEach((item) => store.imageConfigs.set(item.id, item));
    return normalized;
  });
};
