import type { ImageProvider } from "@story-maker/scene-schema";

const imageProviderLabels: Record<ImageProvider, string> = {
  fal: "Fal",
  replicate: "Replicate",
  "openai-compatible": "OpenAI"
};

export const imageProviderOptions = Object.keys(imageProviderLabels) as ImageProvider[];

export function formatImageProvider(provider: ImageProvider | string): string {
  return imageProviderLabels[provider as ImageProvider] ?? provider;
}
