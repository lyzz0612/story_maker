import type { AssetRegion, AssetSheet } from "@story-maker/scene-schema";

export interface MockAssetOption {
  label: string;
  url: string;
  description: string;
}

export const MOCK_ASSET_OPTIONS: MockAssetOption[] = [
  {
    label: "Pig house atlas",
    url: "/mock/pig-house-atlas.svg",
    description: "Background, hammer frames, and preview guide regions.",
  },
  {
    label: "Intro background",
    url: "/mock/background-intro.svg",
    description: "Simple outdoor page background.",
  },
  {
    label: "House background",
    url: "/mock/background-house.svg",
    description: "Static building-scene background.",
  },
];

const defaultRegions: AssetRegion[] = [
  {
    id: "region-background-house",
    role: "background",
    rect: { x: 0.04, y: 0.06, w: 0.92, h: 0.36 },
    label: "house background",
    exportedName: "pages/page-002/background-001.svg",
  },
  {
    id: "region-hammer-0",
    role: "sprite_frame",
    rect: { x: 0.08, y: 0.52, w: 0.18, h: 0.28 },
    sequenceId: "hammer",
    frameIndex: 0,
    label: "hammer frame 0",
    exportedName: "pages/page-002/sequences/hammer/frame-000.svg",
  },
  {
    id: "region-hammer-1",
    role: "sprite_frame",
    rect: { x: 0.29, y: 0.52, w: 0.18, h: 0.28 },
    sequenceId: "hammer",
    frameIndex: 1,
    label: "hammer frame 1",
    exportedName: "pages/page-002/sequences/hammer/frame-001.svg",
  },
  {
    id: "region-hammer-2",
    role: "sprite_frame",
    rect: { x: 0.5, y: 0.52, w: 0.18, h: 0.28 },
    sequenceId: "hammer",
    frameIndex: 2,
    label: "hammer frame 2",
    exportedName: "pages/page-002/sequences/hammer/frame-002.svg",
  },
  {
    id: "region-hammer-3",
    role: "sprite_frame",
    rect: { x: 0.71, y: 0.52, w: 0.18, h: 0.28 },
    sequenceId: "hammer",
    frameIndex: 3,
    label: "hammer frame 3",
    exportedName: "pages/page-002/sequences/hammer/frame-003.svg",
  },
  {
    id: "region-preview-guide",
    role: "preview_only",
    rect: { x: 0.67, y: 0.1, w: 0.25, h: 0.26 },
    label: "composition guide",
    exportedName: "pages/page-002/reference/preview-guide.svg",
  },
];

export const DEFAULT_MOCK_ASSET_SHEET: AssetSheet = {
  sourceUrl: "/mock/pig-house-atlas.svg",
  regions: defaultRegions,
  sequences: {
    hammer: {
      frames: [
        "pages/page-002/sequences/hammer/frame-000.svg",
        "pages/page-002/sequences/hammer/frame-001.svg",
        "pages/page-002/sequences/hammer/frame-002.svg",
        "pages/page-002/sequences/hammer/frame-003.svg",
      ],
      fps: 6,
      loop: true,
    },
  },
  exports: Object.fromEntries(
    defaultRegions.map((region) => [region.id, region.exportedName ?? ""]),
  ),
  updatedAt: "2026-06-08T00:00:00.000Z",
};
