export type Relation = "baby" | "dad" | "mom" | "other";

export interface Character {
  id: string;
  name: string;
  relation: Relation;
  appearance: string;
  referenceImageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArtStyle {
  id: string;
  name: string;
  description: string;
  promptSuffix: string;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type LlmProvider = "openai-compatible" | "custom";

export interface LlmProviderConfig {
  id: string;
  name: string;
  provider: LlmProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ImageProvider = "fal" | "replicate" | "openai-compatible" | "custom";

export interface ImageProviderConfig {
  id: string;
  name: string;
  provider: ImageProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PageStatus = "draft" | "generating" | "ready";

export interface OutlinePage {
  pageNumber: number;
  summary: string;
  text: string;
  castCharacterIds: string[];
  temporaryCharacters: string[];
  status: PageStatus;
  imageUrl?: string;
  sceneJsonPath?: string;
  sceneJsonUrl?: string;
  scene?: SceneGraph;
  sceneGraph?: SceneGraph;
  assetSheet?: AssetSheet;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  brief: string;
  castCharacterIds: string[];
  artStyleId: string;
  llmId: string;
  imageId: string;
  outline: OutlinePage[];
  pages?: OutlinePage[];
  pageCount?: number;
  chatMessages?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type AssetRegionRole = "background" | "sprite_frame" | "preview_only";

export interface NormalizedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AssetRegion {
  id: string;
  role: AssetRegionRole;
  rect: NormalizedRect;
  sequenceId?: string;
  frameIndex?: number;
  label?: string;
  exportedName?: string;
}

export interface AssetSequence {
  frames: string[];
  fps: number;
  loop: boolean;
}

export interface AssetSheet {
  sourceUrl: string;
  regions: AssetRegion[];
  sequences: Record<string, AssetSequence>;
  exports?: Record<string, string>;
  updatedAt: string;
}

export type SceneLayerKind = "background" | "sprite" | "sprite_sequence";

export interface SceneLayerBase {
  id: string;
  kind: SceneLayerKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  visible?: boolean;
}

export interface BackgroundLayer extends SceneLayerBase {
  kind: "background";
  sourceUrl: string;
}

export interface SpriteLayer extends SceneLayerBase {
  kind: "sprite";
  sourceUrl: string;
}

export interface SpriteSequenceLayer extends SceneLayerBase {
  kind: "sprite_sequence";
  frames: string[];
  fps: number;
  loop: boolean;
}

export type SceneLayer = BackgroundLayer | SpriteLayer | SpriteSequenceLayer;

export interface StaggerPopInStep {
  layerId: string;
  delayMs: number;
}

export interface StaggerPopInTemplate {
  type: "stagger_pop_in";
  trigger: "tap";
  sequence: StaggerPopInStep[];
}

export type SceneTemplate = StaggerPopInTemplate;

export interface SceneGraph {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  backgroundColor: string;
  layers: SceneLayer[];
  template?: SceneTemplate;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  brief: string;
  pageCount: number;
  artStyleId: string;
  llmId: string;
  imageId: string;
  castCharacterIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type ProviderConfig = LlmProviderConfig | ImageProviderConfig;
