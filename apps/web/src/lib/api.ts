import type {
  ArtStyle,
  AssetSheet,
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

export type ArtStyleInput = Pick<ArtStyle, "name" | "description" | "promptSuffix"> & {
  previewUrl?: string;
};

export type DeployStatus = "idle" | "running" | "succeeded" | "failed";

export type DeployState = {
  status: DeployStatus;
  startedAt?: string;
  finishedAt?: string;
  branch?: string;
  error?: string;
};

export type AboutInfo = {
  name: string;
  version: string;
  deploy: {
    enabled: boolean;
    available: boolean;
    branch?: string;
    state: DeployState;
  };
};

export type DeployUpdateResponse = {
  accepted: boolean;
  reason?: string;
  state: DeployState;
};

export type CharacterInput = Pick<Character, "name" | "appearance"> & {
  referenceImageUrl?: string;
};

export type ProjectAssetGenerateInput = {
  prompt: string;
  label?: string;
  imageId?: string;
  artStyleId?: string;
};

export type ProjectAssetGenerateResponse = {
  imageUrl: string;
  prompt: string;
};

export type AssetGenerateJobStatus = "queued" | "running" | "succeeded" | "failed";

export type AssetGenerateJob = {
  id: string;
  projectId: string;
  status: AssetGenerateJobStatus;
  startedAt: string;
  finishedAt?: string;
  input: ProjectAssetGenerateInput;
  result?: ProjectAssetGenerateResponse;
  error?: string;
};

export type StartProjectAssetGenerateResponse = {
  jobId: string;
  status: AssetGenerateJobStatus;
  startedAt: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  previewArtStyleDraft: (input: ArtStyleInput) =>
    request<{ previewUrl: string }>("/art-styles/generate-preview", {
      method: "POST",
      body: input
    }),

  listCharacters: () => request<Character[]>("/characters"),
  createCharacter: (input: CharacterInput) =>
    request<Character>("/characters", { method: "POST", body: input }),
  updateCharacter: (id: string, input: CharacterInput) =>
    request<Character>(`/characters/${id}`, { method: "PUT", body: input }),
  deleteCharacter: (id: string) =>
    request<void>(`/characters/${id}`, { method: "DELETE" }),
  previewCharacterReference: (input: CharacterInput) =>
    request<{ referenceImageUrl: string }>("/characters/generate-reference", {
      method: "POST",
      body: input
    }),

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
  generatePageImage: (projectId: string, pageNumber: number) =>
    request<OutlinePage>(`/projects/${projectId}/pages/${pageNumber}/generate`, {
      method: "POST"
    }),
  getAssetSheet: (projectId: string) => request<AssetSheet>(`/projects/${projectId}/asset-sheet`),
  uploadAssetSheetSource: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(`${API_BASE}/projects/${projectId}/asset-sheet/source`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      let message =
        response.status === 413
          ? "上传图片过大，请压缩后重试或缩小图集尺寸"
          : `请求失败：${response.status}`;
      try {
        const payload = (await response.json()) as { message?: string; error?: string };
        message = payload.message ?? payload.error ?? message;
      } catch {
        // Keep the generic message when the API returns plain text or no body.
      }
      throw new Error(message);
    }

    return (await response.json()) as { sourceUrl: string };
  },
  startProjectAssetGenerate: (projectId: string, input: ProjectAssetGenerateInput) =>
    request<StartProjectAssetGenerateResponse>(`/projects/${projectId}/asset-sheet/generate`, {
      method: "POST",
      body: input
    }),
  getProjectAssetGenerateJob: (projectId: string, jobId: string) =>
    request<AssetGenerateJob>(`/projects/${projectId}/asset-sheet/generate/${jobId}`),
  waitForProjectAssetGenerate: async (
    projectId: string,
    jobId: string,
    options: {
      onUpdate?: (job: AssetGenerateJob) => void;
      intervalMs?: number;
      signal?: AbortSignal;
    } = {}
  ) => {
    const intervalMs = options.intervalMs ?? 1000;

    while (true) {
      if (options.signal?.aborted) {
        throw new Error("已取消等待生图任务");
      }

      const job = await request<AssetGenerateJob>(
        `/projects/${projectId}/asset-sheet/generate/${jobId}`
      );
      options.onUpdate?.(job);

      if (job.status === "succeeded") {
        if (!job.result) {
          throw new Error("生图任务已完成，但缺少结果");
        }
        return job.result;
      }

      if (job.status === "failed") {
        throw new Error(job.error ?? "生图失败");
      }

      await sleep(intervalMs);
    }
  },
  saveAssetSheet: (projectId: string, assetSheet: Partial<AssetSheet>) =>
    request<AssetSheet>(`/projects/${projectId}/asset-sheet`, {
      method: "PATCH",
      body: assetSheet
    }),

  getAbout: () => request<AboutInfo>("/about"),
  getDeployStatus: () => request<{ enabled: boolean; state: DeployState }>("/deploy/status"),
  triggerDeployUpdate: () => request<DeployUpdateResponse>("/deploy/update", { method: "POST" })
};

export function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
