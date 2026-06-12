import { makeId, now, store } from "./store.js";
import type {
  ArtStyle,
  AssetSheet,
  Character,
  ChatMessage,
  OutlinePage,
  Project,
  SceneGraph
} from "./types.js";

const ART_STYLE_PREVIEW_SCENE =
  "A cozy children's picture book scene with a small animal reading under a warm lamp.";

export const buildArtStylePreviewPrompt = (
  style: Pick<ArtStyle, "name" | "description" | "promptSuffix">
) => {
  const mood = style.description.trim() || style.name.trim() || "gentle picture book mood";
  return [
    ART_STYLE_PREVIEW_SCENE,
    `Mood and audience: ${mood}.`,
    `Visual style: ${style.promptSuffix.trim()}.`,
    "Single square illustration, no text, no watermark."
  ].join(" ");
};

export const mockGenerateArtStylePreview = (
  style: Pick<ArtStyle, "id" | "name" | "description" | "promptSuffix">
) => {
  const prompt = buildArtStylePreviewPrompt(style);
  const defaultImage =
    Array.from(store.imageConfigs.values()).find((config) => config.isDefault) ??
    Array.from(store.imageConfigs.values())[0];
  const slug = encodeURIComponent(
    (style.name || "style").toLowerCase().replace(/[^\w-]+/g, "-").slice(0, 24)
  );
  const token = Date.now().toString(36);
  void prompt;
  void defaultImage;
  return `/assets/styles/preview-${slug}-${token}.png`;
};

export const buildCharacterReferencePrompt = (character: Pick<Character, "name" | "appearance">) => {
  const appearance = character.appearance.trim() || character.name.trim() || "friendly picture book character";
  return [
    "Children picture book character reference portrait, full body, plain background.",
    `Character name: ${character.name.trim() || "unnamed"}.`,
    `Appearance: ${appearance}.`,
    "Single character, no text, no watermark."
  ].join(" ");
};

export const mockGenerateCharacterReferenceUrl = (
  character: Pick<Character, "name" | "appearance">
) => {
  const prompt = buildCharacterReferencePrompt(character);
  const defaultImage =
    Array.from(store.imageConfigs.values()).find((config) => config.isDefault) ??
    Array.from(store.imageConfigs.values())[0];
  const slug = encodeURIComponent(
    (character.name || "character").toLowerCase().replace(/[^\w-]+/g, "-").slice(0, 24)
  );
  const token = Date.now().toString(36);
  void prompt;
  void defaultImage;
  return `/assets/characters/generated-${slug}-${token}.png`;
};

export const buildAssetPrompt = (input: {
  prompt: string;
  label?: string;
  artStyle?: Pick<ArtStyle, "name" | "description" | "promptSuffix"> | null;
  project?: Pick<Project, "title" | "brief">;
}) => {
  const userPrompt = input.prompt.trim();
  if (!userPrompt) {
    throw new Error("Asset prompt is required");
  }

  const parts = [
    "Children picture book asset illustration, single object or character sprite, plain or simple background.",
    userPrompt
  ];

  if (input.label?.trim()) {
    parts.push(`Asset name: ${input.label.trim()}.`);
  }
  if (input.project?.title?.trim()) {
    parts.push(`Story context: ${input.project.title.trim()}.`);
  }
  if (input.project?.brief?.trim()) {
    parts.push(`Story brief: ${input.project.brief.trim().slice(0, 160)}.`);
  }
  if (input.artStyle?.promptSuffix?.trim()) {
    parts.push(`Visual style: ${input.artStyle.promptSuffix.trim()}.`);
  } else if (input.artStyle?.name?.trim()) {
    parts.push(`Visual style mood: ${input.artStyle.name.trim()}.`);
  }

  parts.push("No text, no watermark.");
  return parts.join(" ");
};

export const mockGenerateProjectAsset = async (
  project: Project,
  input: {
    prompt: string;
    label?: string;
    imageId?: string;
    artStyleId?: string;
  }
) => {
  const imageConfig =
    (input.imageId ? store.imageConfigs.get(input.imageId) : undefined) ??
    (project.imageId ? store.imageConfigs.get(project.imageId) : undefined) ??
    Array.from(store.imageConfigs.values()).find((config) => config.isDefault) ??
    Array.from(store.imageConfigs.values())[0];

  const artStyle =
    (input.artStyleId ? store.artStyles.get(input.artStyleId) : undefined) ??
    (project.artStyleId ? store.artStyles.get(project.artStyleId) : undefined) ??
    null;

  const prompt = buildAssetPrompt({
    prompt: input.prompt,
    label: input.label,
    artStyle,
    project
  });

  const slug = encodeURIComponent(
    (input.label || "asset").toLowerCase().replace(/[^\w-]+/g, "-").slice(0, 24)
  );
  const token = `${slug}-${Date.now().toString(36)}`;

  const { saveGeneratedAssetImage } = await import("./assetStorage.js");
  const imageUrl = await saveGeneratedAssetImage(project.id, token);

  void imageConfig;
  return { imageUrl, prompt };
};

const clampPageCount = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 8;
  }
  return Math.min(8, Math.max(6, Math.round(parsed)));
};

const defaultAssetSheet = (pageNumber: number): AssetSheet => ({
  sourceUrl: `/assets/pages/page-${pageNumber}-sheet.png`,
  regions: [],
  sequences: {}
});

export const defaultProjectAssetSheet = (): AssetSheet => ({
  sourceUrl: "",
  regions: [],
  sequences: {},
  updatedAt: now()
});

export const makeSceneGraph = (projectId: string, page: OutlinePage): SceneGraph => {
  const isBuildingPage = page.temporaryCharacters.some((name) => name.includes("小黑猪")) || page.pageNumber === 4;
  if (isBuildingPage) {
    return {
      id: `scene_${projectId}_${page.pageNumber}`,
      version: "1",
      size: { width: 1280, height: 720 },
      layers: [
        {
          id: "background",
          type: "background",
          url: `/assets/projects/${projectId}/pages/${page.pageNumber}/background.png`,
          x: 0,
          y: 0,
          width: 1280,
          height: 720
        },
        {
          id: "hammering-pig",
          type: "sprite_sequence",
          frames: [
            `/assets/projects/${projectId}/pages/${page.pageNumber}/hammer-1.png`,
            `/assets/projects/${projectId}/pages/${page.pageNumber}/hammer-2.png`,
            `/assets/projects/${projectId}/pages/${page.pageNumber}/hammer-3.png`
          ],
          fps: 6,
          loop: true,
          x: 540,
          y: 320,
          width: 180,
          height: 180
        }
      ]
    };
  }

  return {
    id: `scene_${projectId}_${page.pageNumber}`,
    version: "1",
    size: { width: 1280, height: 720 },
    template: "stagger_pop_in",
    trigger: "tap",
    layers: [
      {
        id: "background",
        type: "background",
        url: `/assets/projects/${projectId}/pages/${page.pageNumber}/background.png`,
        x: 0,
        y: 0,
        width: 1280,
        height: 720
      },
      {
        id: "pig-one",
        type: "sprite",
        url: `/assets/projects/${projectId}/pages/${page.pageNumber}/pig-one.png`,
        x: 300,
        y: 360,
        width: 160,
        height: 160
      },
      {
        id: "pig-two",
        type: "sprite",
        url: `/assets/projects/${projectId}/pages/${page.pageNumber}/pig-two.png`,
        x: 560,
        y: 350,
        width: 160,
        height: 160
      },
      {
        id: "pig-three",
        type: "sprite",
        url: `/assets/projects/${projectId}/pages/${page.pageNumber}/pig-three.png`,
        x: 820,
        y: 365,
        width: 160,
        height: 160
      }
    ],
    sequence: [
      { layerId: "pig-one", delayMs: 0, animation: "pop_in" },
      { layerId: "pig-two", delayMs: 250, animation: "pop_in" },
      { layerId: "pig-three", delayMs: 500, animation: "pop_in" }
    ]
  };
};

export const mockGeneratePage = (project: Project, pageNumber: number) => {
  const page = project.outline.find((item) => item.pageNumber === pageNumber);
  if (!page) {
    return undefined;
  }

  const updatedAt = now();
  page.status = "ready";
  const prompt = page.imagePrompt?.trim() || page.summary;
  page.imageUrl = `/assets/projects/${project.id}/pages/${pageNumber}/illustration.png?prompt=${encodeURIComponent(prompt)}`;
  page.sceneJsonUrl = `/assets/projects/${project.id}/pages/${pageNumber}/scene.json`;
  page.sceneGraph = makeSceneGraph(project.id, page);
  page.assetSheet = {
    sourceUrl: `/assets/projects/${project.id}/pages/${pageNumber}/asset-sheet.png`,
    regions:
      pageNumber === 4
        ? [
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
            },
            {
              id: "region_hammer_2",
              role: "sprite_frame",
              rect: { x: 0.3, y: 0.52, w: 0.18, h: 0.28 },
              sequenceId: "hammer",
              frameIndex: 1
            }
          ]
        : [],
    sequences:
      pageNumber === 4
        ? {
            hammer: {
              frames: [
                `/assets/projects/${project.id}/pages/${pageNumber}/hammer-1.png`,
                `/assets/projects/${project.id}/pages/${pageNumber}/hammer-2.png`
              ],
              fps: 6,
              loop: true
            }
          }
        : {}
  };
  page.updatedAt = updatedAt;
  project.updatedAt = updatedAt;
  return page;
};

export const buildOutline = (brief: string, castCharacterIds: string[], pageCountInput?: unknown): OutlinePage[] => {
  const pageCount = clampPageCount(pageCountInput);
  const isThreePigs = /三只小猪|three\s*pigs/i.test(brief);
  const selectedCast = castCharacterIds.filter((id) => store.characters.has(id));

  const threePigsSummaries = [
    "三只小猪离开家，决定各自盖一间能挡风的房子。",
    "小白猪用稻草搭出轻巧的小屋，开心地邀请家人参观。",
    "小花猪用木头盖房，大灰狼第一次在森林边出现。",
    "小黑猪认真搬砖盖房，还练习用小锤子敲出节奏。",
    "大灰狼吹倒前两座房子，大家跑向砖房求助。",
    "砖房稳稳站住，三只小猪学会合作和提前准备。",
    "家人一起修补花园，给森林邻居准备温暖晚餐。",
    "睡前，宝宝把三只小猪的故事画成一本小书。"
  ];

  const genericSummaries = [
    "主角听到一个新奇的愿望，准备开始今天的小冒险。",
    "家人一起整理线索，发现第一个温柔的小挑战。",
    "主角遇见临时伙伴，并学会用礼貌表达需求。",
    "事情出现小波折，大家停下来想一个更好的办法。",
    "主角鼓起勇气尝试新方案，家人给出支持。",
    "问题被解决，大家发现合作比单打独斗更有趣。",
    "主角把经历分享给朋友，留下一个可爱的纪念。",
    "夜晚到来，家人用拥抱结束这次温暖的故事。"
  ];

  const summaries = isThreePigs ? threePigsSummaries : genericSummaries;
  const temporaryCharacters = isThreePigs ? ["小白猪", "小花猪", "小黑猪", "大灰狼"] : ["森林伙伴"];
  const createdAt = now();

  return Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    const summary = summaries[index] ?? summaries[summaries.length - 1]!;
    const pageTemporaryCharacters = isThreePigs
      ? pageNumber <= 2
        ? temporaryCharacters.slice(0, 3)
        : pageNumber <= 5
          ? temporaryCharacters
          : temporaryCharacters.slice(0, 3)
      : pageNumber === 3
        ? temporaryCharacters
        : [];

    return {
      pageNumber,
      summary,
      text: `第 ${pageNumber} 页文案占位：${summary}`,
      imagePrompt: `儿童绘本插画，${summary}，温馨明亮、角色表情生动，无文字水印`,
      castCharacterIds: pageNumber === 1 || pageNumber === pageCount ? selectedCast : selectedCast.slice(0, 1),
      temporaryCharacters: pageTemporaryCharacters,
      status: "draft",
      assetSheet: defaultAssetSheet(pageNumber),
      updatedAt: createdAt
    };
  });
};

export const createProjectFromBrief = (input: {
  title?: string;
  brief: string;
  castCharacterIds?: string[];
  artStyleId?: string;
  llmId?: string;
  imageId?: string;
  pageCount?: unknown;
}): Project => {
  const defaultArtStyle = Array.from(store.artStyles.values())[0];
  const defaultLlm = Array.from(store.llmConfigs.values()).find((item) => item.isDefault) ?? Array.from(store.llmConfigs.values())[0];
  const defaultImage =
    Array.from(store.imageConfigs.values()).find((item) => item.isDefault) ?? Array.from(store.imageConfigs.values())[0];
  const createdAt = now();
  const brief = input.brief.trim();
  const outline = buildOutline(brief, input.castCharacterIds ?? [], input.pageCount);

  return {
    id: makeId("project"),
    title: input.title?.trim() || (brief.includes("三只小猪") ? "三只小猪的新房子" : brief.slice(0, 18) || "未命名绘本"),
    brief,
    artStyleId: input.artStyleId || defaultArtStyle?.id || "",
    llmId: input.llmId || defaultLlm?.id || "",
    imageId: input.imageId || defaultImage?.id || "",
    castCharacterIds: input.castCharacterIds ?? [],
    outline,
    chatMessages: [],
    assetSheet: defaultProjectAssetSheet(),
    createdAt,
    updatedAt: createdAt
  };
};

const parsePageNumber = (message: string, pageCount: number) => {
  const match = message.match(/第\s*(\d+)\s*页/) ?? message.match(/page\s*(\d+)/i);
  if (!match) {
    return undefined;
  }
  const pageNumber = Number(match[1]);
  if (!Number.isInteger(pageNumber)) {
    return undefined;
  }
  return Math.min(pageCount, Math.max(1, pageNumber));
};

const findCharacterIdByKeyword = (message: string) => {
  for (const character of store.characters.values()) {
    if (message.includes(character.name) || message.toLowerCase().includes(character.relation)) {
      return character.id;
    }
  }
  return undefined;
};

export const applyMockChat = (project: Project, message: string) => {
  const createdAt = now();
  const userMessage: ChatMessage = { id: makeId("msg"), role: "user", content: message, createdAt };
  const pageNumber = parsePageNumber(message, project.outline.length) ?? project.outline.length;
  const page = project.outline.find((item) => item.pageNumber === pageNumber)!;
  const characterId = findCharacterIdByKeyword(message);
  let reply = `已更新第 ${pageNumber} 页大纲。`;

  if (characterId && !page.castCharacterIds.includes(characterId)) {
    page.castCharacterIds.push(characterId);
    const character = store.characters.get(characterId);
    page.summary = `${page.summary} ${character?.name ?? "家庭角色"}也加入这一页。`;
    reply = `好的，第 ${pageNumber} 页已加入${character?.name ?? "指定角色"}出场。`;
  } else if (/scary|可怕|吓人|温馨|柔和/.test(message)) {
    page.summary = `${page.summary} 语气调整为更温馨、更适合睡前阅读。`;
    page.text = `${page.text} 这一页会用轻柔的方式表达冲突，不制造惊吓。`;
    page.imagePrompt = `${page.imagePrompt ?? page.summary} 画面温馨柔和，适合睡前阅读，避免惊悚元素。`;
    reply = `已把第 ${pageNumber} 页语气调得更温馨，不走 scary 路线。`;
  } else {
    page.summary = `${page.summary}（根据对话补充：${message.slice(0, 24)}）`;
  }

  page.updatedAt = createdAt;
  project.updatedAt = createdAt;
  const assistantMessage: ChatMessage = { id: makeId("msg"), role: "assistant", content: reply, createdAt };
  project.chatMessages.push(userMessage, assistantMessage);

  return { reply, patchedPageNumber: pageNumber, project, outline: project.outline, messages: project.chatMessages };
};
