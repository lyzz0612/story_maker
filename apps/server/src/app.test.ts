import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import type {
  ArtStyle,
  AssetSheet,
  Character,
  ImageProviderConfig,
  LlmProviderConfig,
  OutlinePage,
  Project
} from "./types.js";

describe("mock API", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("serves seeded settings, characters, art styles, and projects", async () => {
    const [llmResponse, imageResponse, artStylesResponse, charactersResponse, projectsResponse] =
      await Promise.all([
        app.inject({ method: "GET", url: "/api/settings/llm" }),
        app.inject({ method: "GET", url: "/api/settings/image" }),
        app.inject({ method: "GET", url: "/api/art-styles" }),
        app.inject({ method: "GET", url: "/api/characters" }),
        app.inject({ method: "GET", url: "/api/projects" })
      ]);

    expect(llmResponse.statusCode).toBe(200);
    expect(llmResponse.json<LlmProviderConfig[]>()).toHaveLength(2);
    expect(imageResponse.json<ImageProviderConfig[]>()).toHaveLength(2);
    expect(artStylesResponse.json<ArtStyle[]>().length).toBeGreaterThanOrEqual(3);
    expect(charactersResponse.json<Character[]>()).toHaveLength(3);
    expect(projectsResponse.json<Array<{ id: string; pageCount: number }>>()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "project_three_pigs", pageCount: 8 })])
    );
  });

  it("normalizes provider defaults and protects removing the only default", async () => {
    const llmPayload: LlmProviderConfig[] = [
      {
        id: "llm_a",
        name: "LLM A",
        provider: "openai-compatible",
        baseUrl: "https://mock.local/a",
        apiKey: "never-sent",
        model: "mock-a",
        isDefault: false
      },
      {
        id: "llm_b",
        name: "LLM B",
        provider: "custom",
        baseUrl: "https://mock.local/b",
        apiKey: "never-sent",
        model: "mock-b",
        isDefault: true
      }
    ];

    const llmResponse = await app.inject({
      method: "PUT",
      url: "/api/settings/llm",
      payload: llmPayload
    });
    expect(llmResponse.statusCode).toBe(200);
    expect(llmResponse.json<LlmProviderConfig[]>()).toMatchObject([
      { id: "llm_a", isDefault: false },
      { id: "llm_b", isDefault: true }
    ]);

    const imageResponse = await app.inject({
      method: "PUT",
      url: "/api/settings/image",
      payload: [
        {
          id: "image_only",
          name: "Only Image",
          provider: "fal",
          baseUrl: "https://mock.local/image",
          apiKey: "never-sent",
          model: "mock-image",
          isDefault: false
        }
      ]
    });
    expect(imageResponse.statusCode).toBe(400);
    expect(imageResponse.json<{ error: string }>().error).toContain("default image");
  });

  it("supports art style CRUD", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/art-styles",
      payload: {
        name: "夜光蜡笔",
        description: "深色背景与柔和蜡笔边缘",
        promptSuffix: "glowing crayon picture book"
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json<ArtStyle>();

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/art-styles/${created.id}`,
      payload: { promptSuffix: "updated crayon prompt" }
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json<ArtStyle>().promptSuffix).toBe("updated crayon prompt");

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/art-styles/${created.id}`
    });
    expect(deleteResponse.statusCode).toBe(204);
  });

  it("supports character CRUD and mock reference image generation", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: {
        name: "外婆",
        relation: "other",
        appearance: "银色短发，红色围巾",
        referenceImageUrl: "/mock/characters/grandma-ref.png"
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json<Character>();

    const updateResponse = await app.inject({
      method: "PUT",
      url: `/api/characters/${created.id}`,
      payload: { ...created, appearance: "银色短发，绿色围巾" }
    });
    expect(updateResponse.json<Character>().appearance).toContain("绿色围巾");

    const referenceResponse = await app.inject({
      method: "POST",
      url: `/api/characters/${created.id}/mock-generate-reference`
    });
    expect(referenceResponse.statusCode).toBe(200);
    expect(referenceResponse.json<Character>().referenceImageUrl).toContain("/mock/characters/generated-");

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/characters/${created.id}`
    });
    expect(deleteResponse.statusCode).toBe(204);
  });

  it("creates projects, patches outline via chat, generates pages, and saves asset sheets", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: {
        title: "三只小猪测试书",
        brief: "三只小猪和宝宝一起盖一间安全的新房子",
        castCharacterIds: ["char_baby"],
        artStyleId: "style_warm_watercolor",
        llmId: "llm_story_mock",
        imageId: "image_picture_book_mock",
        pageCount: 6
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const project = createResponse.json<Project>();
    expect(project.outline).toHaveLength(6);
    expect(project.outline.some((page) => page.temporaryCharacters.includes("小黑猪"))).toBe(true);

    const chatResponse = await app.inject({
      method: "POST",
      url: `/api/projects/${project.id}/chat`,
      payload: { message: "第 3 页让爸爸出场" }
    });
    expect(chatResponse.statusCode).toBe(200);
    expect(chatResponse.json<{ reply: string; outline: OutlinePage[] }>().reply).toContain("爸爸");
    expect(chatResponse.json<{ outline: OutlinePage[] }>().outline[2]?.castCharacterIds).toContain("char_dad");

    const generateResponse = await app.inject({
      method: "POST",
      url: `/api/projects/${project.id}/pages/4/mock-generate`
    });
    expect(generateResponse.statusCode).toBe(200);
    const generatedPage = generateResponse.json<OutlinePage>();
    expect(generatedPage.status).toBe("ready");
    expect(generatedPage.imageUrl).toContain("/mock/projects/");
    expect(generatedPage.sceneGraph?.layers.some((layer) => layer.type === "sprite_sequence")).toBe(true);

    const assetResponse = await app.inject({
      method: "PATCH",
      url: `/api/projects/${project.id}/pages/4/asset-sheet`,
      payload: {
        sourceUrl: "/mock/projects/test/pages/4/asset-sheet.png",
        regions: [
          {
            id: "background",
            role: "background",
            rect: { x: 0, y: 0, w: 1, h: 0.5 }
          },
          {
            id: "hammer_0",
            role: "sprite_frame",
            rect: { x: 0.1, y: 0.6, w: 0.2, h: 0.2 },
            sequenceId: "hammer",
            frameIndex: 0
          }
        ],
        sequences: {
          hammer: { frames: [], fps: 6, loop: true }
        }
      } satisfies Partial<AssetSheet>
    });
    expect(assetResponse.statusCode).toBe(200);
    expect(assetResponse.json<AssetSheet>().exports).toMatchObject({
      background: "background/region-0.png",
      hammer_0: "sprite_frame/hammer-0.png"
    });
  });
});
