import { describe, expect, it } from "vitest";
import type { AssetSheet, Project, SceneGraph } from "./index.js";

describe("scene-schema contracts", () => {
  it("supports a project with editable outline pages and locked providers", () => {
    const updatedAt = "2026-06-08T13:00:00.000Z";
    const project: Project = {
      id: "project_three_pigs",
      title: "三只小猪和宝宝的新房子",
      brief: "三只小猪一起盖房子",
      castCharacterIds: ["char_baby", "char_dad"],
      artStyleId: "style_warm_watercolor",
      llmId: "llm_story_mock",
      imageId: "image_picture_book_mock",
      outline: [
        {
          pageNumber: 1,
          summary: "三只小猪准备出发。",
          text: "第 1 页文案",
          imagePrompt: "儿童绘本插画，三只小猪在森林小路上出发，温暖水彩风格",
          castCharacterIds: ["char_baby"],
          temporaryCharacters: ["小白猪", "小花猪", "小黑猪"],
          status: "draft",
          updatedAt
        }
      ],
      createdAt: updatedAt,
      updatedAt
    };

    expect(project.outline).toHaveLength(1);
    expect(project.outline[0]?.temporaryCharacters).toContain("小黑猪");
    expect(project.artStyleId).toBe("style_warm_watercolor");
  });

  it("represents asset sheets with normalized regions and frame sequences", () => {
    const assetSheet: AssetSheet = {
      sourceUrl: "/assets/projects/project_three_pigs/pages/4/asset-sheet.png",
      regions: [
        {
          id: "region_background",
          role: "background",
          rect: { x: 0.02, y: 0.02, w: 0.96, h: 0.42 }
        },
        {
          id: "region_hammer_1",
          role: "sprite_frame",
          rect: { x: 0.08, y: 0.52, w: 0.18, h: 0.28 },
          sequenceId: "hammer",
          frameIndex: 0
        }
      ],
      sequences: {
        hammer: {
          frames: ["/assets/hammer-1.png", "/assets/hammer-2.png"],
          fps: 6,
          loop: true
        }
      },
      updatedAt: "2026-06-08T13:00:00.000Z"
    };

    expect(assetSheet.regions.every((region) => region.rect.x >= 0 && region.rect.w <= 1)).toBe(true);
    expect(assetSheet.sequences.hammer?.frames).toHaveLength(2);
  });

  it("drives preview scenes from scene graph layers and templates", () => {
    const scene: SceneGraph = {
      id: "scene_intro",
      pageNumber: 1,
      width: 1280,
      height: 720,
      backgroundColor: "#f8efe2",
      layers: [
        {
          id: "background",
          kind: "background",
          name: "Forest background",
          sourceUrl: "/assets/background.png",
          x: 0,
          y: 0,
          width: 1280,
          height: 720
        },
        {
          id: "hammering-pig",
          kind: "sprite_sequence",
          name: "Hammering pig",
          frames: ["/assets/hammer-1.png", "/assets/hammer-2.png"],
          fps: 6,
          loop: true,
          x: 540,
          y: 320,
          width: 180,
          height: 180
        }
      ],
      template: {
        type: "stagger_pop_in",
        trigger: "tap",
        sequence: [{ layerId: "hammering-pig", delayMs: 250 }]
      },
      updatedAt: "2026-06-08T13:00:00.000Z"
    };

    expect(scene.layers.map((layer) => layer.kind)).toEqual(["background", "sprite_sequence"]);
    expect(scene.template?.type).toBe("stagger_pop_in");
  });
});
