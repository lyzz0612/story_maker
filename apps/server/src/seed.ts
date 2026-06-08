import { createProjectFromBrief, mockGeneratePage } from "./mock.js";
import { now, store } from "./store.js";
import type { ArtStyle, Character, ImageProviderConfig, LlmProviderConfig } from "./types.js";

export const seedStore = () => {
  store.llmConfigs.clear();
  store.imageConfigs.clear();
  store.artStyles.clear();
  store.characters.clear();
  store.projects.clear();

  const seededAt = now();

  const llmConfigs: LlmProviderConfig[] = [
    {
      id: "llm_story_mock",
      name: "Mock Story Writer",
      provider: "openai-compatible",
      baseUrl: "https://mock.local/v1",
      apiKey: "mock-key-never-sent",
      model: "mock-story-large",
      isDefault: true
    },
    {
      id: "llm_dialog_mock",
      name: "Mock Dialogue Rewriter",
      provider: "custom",
      baseUrl: "https://mock.local/dialogue",
      apiKey: "mock-key-never-sent",
      model: "mock-outline-chat",
      isDefault: false
    }
  ];

  const imageConfigs: ImageProviderConfig[] = [
    {
      id: "image_picture_book_mock",
      name: "Mock Picture Book Image",
      provider: "fal",
      baseUrl: "https://mock.local/images",
      apiKey: "mock-key-never-sent",
      model: "mock-watercolor-xl",
      isDefault: true
    },
    {
      id: "image_sprite_mock",
      name: "Mock Sprite Sheet Image",
      provider: "replicate",
      baseUrl: "https://mock.local/sprites",
      apiKey: "mock-key-never-sent",
      model: "mock-sprite-sheet",
      isDefault: false
    }
  ];

  const artStyles: ArtStyle[] = [
    {
      id: "style_warm_watercolor",
      name: "温暖水彩",
      description: "柔和边缘、温暖光线，适合睡前绘本。",
      promptSuffix: "warm watercolor picture book, soft lighting, gentle paper texture",
      previewUrl: "/mock/styles/warm-watercolor.png"
    },
    {
      id: "style_soft_pastel",
      name: "柔和粉彩",
      description: "低饱和粉彩与圆润造型，适合低龄儿童。",
      promptSuffix: "soft pastel colors, rounded shapes, cozy children illustration",
      previewUrl: "/mock/styles/soft-pastel.png"
    },
    {
      id: "style_pencil_storybook",
      name: "绘本铅笔",
      description: "铅笔线稿加轻薄上色，保留手作感。",
      promptSuffix: "storybook pencil sketch, light wash colors, hand-drawn texture",
      previewUrl: "/mock/styles/pencil-storybook.png"
    },
    {
      id: "style_clay_play",
      name: "黏土玩具",
      description: "类似手工黏土摆拍，角色质感亲切可爱。",
      promptSuffix: "clay toy diorama, miniature set, soft studio light",
      previewUrl: "/mock/styles/clay-play.png"
    }
  ];

  const characters: Character[] = [
    {
      id: "char_baby",
      name: "宝宝",
      relation: "baby",
      appearance: "圆脸、短刘海，穿黄色背带裤，表情好奇。",
      referenceImageUrl: "/mock/characters/baby-ref.png",
      createdAt: seededAt,
      updatedAt: seededAt
    },
    {
      id: "char_dad",
      name: "爸爸",
      relation: "dad",
      appearance: "高个子、戴圆框眼镜，蓝色开衫，笑容温和。",
      referenceImageUrl: "/mock/characters/dad-ref.png",
      createdAt: seededAt,
      updatedAt: seededAt
    },
    {
      id: "char_mom",
      name: "妈妈",
      relation: "mom",
      appearance: "栗色短发，穿米色围裙，喜欢拿一本故事书。",
      referenceImageUrl: "/mock/characters/mom-ref.png",
      createdAt: seededAt,
      updatedAt: seededAt
    }
  ];

  for (const item of llmConfigs) {
    store.llmConfigs.set(item.id, item);
  }
  for (const item of imageConfigs) {
    store.imageConfigs.set(item.id, item);
  }
  for (const item of artStyles) {
    store.artStyles.set(item.id, item);
  }
  for (const item of characters) {
    store.characters.set(item.id, item);
  }

  const threePigsProject = createProjectFromBrief({
    title: "三只小猪和宝宝的新房子",
    brief: "三只小猪一起盖房子，宝宝、爸爸和妈妈在旁边学习合作与安全感。",
    castCharacterIds: ["char_baby", "char_dad", "char_mom"],
    artStyleId: "style_warm_watercolor",
    llmId: "llm_story_mock",
    imageId: "image_picture_book_mock",
    pageCount: 8
  });
  threePigsProject.id = "project_three_pigs";
  threePigsProject.outline.forEach((page) => {
    if (page.pageNumber === 1 || page.pageNumber === 4) {
      mockGeneratePage(threePigsProject, page.pageNumber);
    }
  });
  store.projects.set(threePigsProject.id, threePigsProject);
};
