import type { Store } from "./types.js";

export const store: Store = {
  llmConfigs: new Map(),
  imageConfigs: new Map(),
  artStyles: new Map(),
  characters: new Map(),
  projects: new Map()
};

export const now = () => new Date().toISOString();

let counter = 0;

export const makeId = (prefix: string) => {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
};

export const listValues = <T>(map: Map<string, T>) => Array.from(map.values());

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export const requireItem = <T>(map: Map<string, T>, id: string, label: string) => {
  const item = map.get(id);
  if (!item) {
    throw new HttpError(404, `${label} not found`);
  }
  return item;
};
