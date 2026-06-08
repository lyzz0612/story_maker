import type {
  ArtStyle,
  Character,
  ImageProviderConfig,
  LlmProviderConfig,
  OutlinePage,
  Project,
  ProjectSummary
} from "@story-maker/scene-schema";

const API_BASE = "/api";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export type ProviderKind = "llm" | "image";
export type ProviderConfig = LlmProviderConfig | ImageProviderConfig;

export interface ChatResponse {
  reply: string;
  project?: Project;
  outline?: OutlinePage[];
}

export type ProjectListItem = ProjectSummary & {
  brief?: string;
  castCharacterIds?: string[];
};

export type ArtStyleInput = Pick<ArtStyle, "name" | "description" | "promptSuffix" | "previewUrl">;

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    let message = `请求失败：${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string; error?: string };
      message = payload.message ?? payload.error ?? message;
    } catch {
      // Keep the generic message when the API returns plain text or no body.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function settingsPath(kind: ProviderKind) {
  return kind === "llm" ? "/settings/llm" : "/settings/image";
}

export const api = {
  getLlmConfigs: () => request<LlmProviderConfig[]>("/settings/llm"),
  saveLlmConfigs: (configs: LlmProviderConfig[]) =>
    request<LlmProviderConfig[]>("/settings/llm", { method: "PUT", body: configs }),
  getImageConfigs: () => request<ImageProviderConfig[]>("/settings/image"),
  saveImageConfigs: (configs: ImageProviderConfig[]) =>
    request<ImageProviderConfig[]>("/settings/image", { method: "PUT", body: configs }),
  getProviderConfigs: <T extends ProviderConfig>(kind: ProviderKind) =>
    request<T[]>(settingsPath(kind)),
  saveProviderConfigs: <T extends ProviderConfig>(kind: ProviderKind, configs: T[]) =>
    request<T[]>(settingsPath(kind), { method: "PUT", body: configs }),

  listArtStyles: () => request<ArtStyle[]>("/art-styles"),
  createArtStyle: (input: ArtStyleInput) =>
    request<ArtStyle>("/art-styles", { method: "POST", body: input }),
  updateArtStyle: (id: string, input: Partial<ArtStyle>) =>
    request<ArtStyle>(`/art-styles/${id}`, { method: "PUT", body: input }),
  deleteArtStyle: (id: string) =>
    request<void>(`/art-styles/${id}`, { method: "DELETE" }),

  listCharacters: () => request<Character[]>("/characters"),
  createCharacter: (input: Omit<Character, "id" | "createdAt" | "updatedAt">) =>
    request<Character>("/characters", { method: "POST", body: input }),
  updateCharacter: (id: string, input: Partial<Character>) =>
    request<Character>(`/characters/${id}`, { method: "PUT", body: input }),
  deleteCharacter: (id: string) =>
    request<void>(`/characters/${id}`, { method: "DELETE" }),
  generateCharacterReference: (id: string) =>
    request<Character>(`/characters/${id}/mock-generate-reference`, { method: "POST" }),

  listProjects: () => request<ProjectListItem[]>("/projects"),
  createProject: (input: {
    title?: string;
    brief: string;
    castCharacterIds: string[];
    artStyleId: string;
    llmId: string;
    imageId: string;
  }) => request<Project>("/projects", { method: "POST", body: input }),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  sendProjectChat: (id: string, message: string) =>
    request<ChatResponse>(`/projects/${id}/chat`, { method: "POST", body: { message } }),
  updateProjectPage: (projectId: string, pageNumber: number, input: Partial<OutlinePage>) =>
    request<OutlinePage>(`/projects/${projectId}/pages/${pageNumber}`, {
      method: "PATCH",
      body: input
    }),
  mockGeneratePage: (projectId: string, pageNumber: number) =>
    request<OutlinePage>(`/projects/${projectId}/pages/${pageNumber}/mock-generate`, {
      method: "POST"
    })
};

export function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
