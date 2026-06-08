import type {
  ArtStyle as SchemaArtStyle,
  AssetSheet as SchemaAssetSheet,
  Character as SchemaCharacter,
  ImageProviderConfig as SchemaImageProviderConfig,
  LlmProviderConfig as SchemaLlmProviderConfig,
  OutlinePage as SchemaOutlinePage,
  Project as SchemaProject,
  SceneGraph as SchemaSceneGraph
} from "@story-maker/scene-schema";

type SchemaBacked<T> = {
  readonly __schema?: T;
};

export type Relation = "baby" | "dad" | "mom" | "other";
export type PageStatus = "draft" | "generating" | "ready";
export type AssetRole = "background" | "sprite_frame" | "preview_only";

export type LlmProviderConfig = SchemaBacked<SchemaLlmProviderConfig> & {
  id: string;
  name: string;
  provider: "openai-compatible" | "custom";
  baseUrl: string;
  apiKey: string;
  model: string;
  isDefault: boolean;
};

export type ImageProviderConfig = SchemaBacked<SchemaImageProviderConfig> & {
  id: string;
  name: string;
  provider: "fal" | "replicate" | "openai-compatible" | "custom";
  baseUrl: string;
  apiKey: string;
  model: string;
  isDefault: boolean;
};

export type ArtStyle = SchemaBacked<SchemaArtStyle> & {
  id: string;
  name: string;
  description: string;
  promptSuffix: string;
  previewUrl?: string;
};

export type Character = SchemaBacked<SchemaCharacter> & {
  id: string;
  name: string;
  relation: Relation;
  appearance: string;
  referenceImageUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type AssetRegion = {
  id: string;
  role: AssetRole;
  rect: { x: number; y: number; w: number; h: number };
  sequenceId?: string;
  frameIndex?: number;
};

export type AssetSheet = SchemaBacked<SchemaAssetSheet> & {
  sourceUrl: string;
  regions: AssetRegion[];
  sequences: Record<string, { frames: string[]; fps: number; loop: boolean }>;
  exports?: Record<string, string>;
};

export type SceneGraph = SchemaBacked<SchemaSceneGraph> & {
  id: string;
  version: string;
  size: { width: number; height: number };
  template?: "stagger_pop_in";
  trigger?: "tap" | "auto";
  layers: Array<
    | {
        id: string;
        type: "background" | "sprite";
        url: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | {
        id: string;
        type: "sprite_sequence";
        frames: string[];
        fps: number;
        loop: boolean;
        x: number;
        y: number;
        width: number;
        height: number;
      }
  >;
  sequence?: Array<{ layerId: string; delayMs: number; animation: "pop_in" }>;
};

export type OutlinePage = SchemaBacked<SchemaOutlinePage> & {
  pageNumber: number;
  summary: string;
  text: string;
  castCharacterIds: string[];
  temporaryCharacters: string[];
  status: PageStatus;
  imageUrl?: string;
  sceneJsonUrl?: string;
  sceneGraph?: SceneGraph;
  assetSheet: AssetSheet;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type Project = SchemaBacked<SchemaProject> & {
  id: string;
  title: string;
  brief: string;
  artStyleId: string;
  llmId: string;
  imageId: string;
  castCharacterIds: string[];
  outline: OutlinePage[];
  chatMessages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type Store = {
  llmConfigs: Map<string, LlmProviderConfig>;
  imageConfigs: Map<string, ImageProviderConfig>;
  artStyles: Map<string, ArtStyle>;
  characters: Map<string, Character>;
  projects: Map<string, Project>;
};
