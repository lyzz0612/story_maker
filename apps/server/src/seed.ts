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
      name: "故事创作",
      provider: "openai-compatible",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "local-dev-key",
      model: "gpt-4.1-mini",
      isDefault: true
    },
    {
      id: "llm_dialog_mock",
      name: "对话改写",
      provider: "openai-compatible",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "local-dev-key",
      model: "gpt-4.1-mini",
      isDefault: false
    }
  ];

  const imageConfigs: ImageProviderConfig[] = [
    {
      id: "image_picture_book_mock",
      name: "绘本配图",
      provider: "fal",
      baseUrl: "https://fal.run",
      apiKey: "local-dev-key",
      model: "flux-dev",
      isDefault: true
    },
    {
      id: "image_sprite_mock",
      name: "精灵图集",
      provider: "replicate",
      baseUrl: "https://api.replicate.com/v1",
      apiKey: "local-dev-key",
      model: "sprite-sheet-v1",
      isDefault: false
    }
  ];

  const artStyles: ArtStyle[] = [
    {
      id: "style_warm_watercolor",
      name: "温暖水彩",
      description: "柔和边缘、温暖光线，适合睡前绘本。",
      promptSuffix: "warm watercolor picture book, soft lighting, gentle paper texture",
      previewUrl: "/assets/styles/warm-watercolor.png"
    },
    {
      id: "style_soft_pastel",
      name: "柔和粉彩",
      description: "低饱和粉彩与圆润造型，适合低龄儿童。",
      promptSuffix: "soft pastel colors, rounded shapes, cozy children illustration",
      previewUrl: "/assets/styles/soft-pastel.png"
    },
    {
      id: "style_pencil_storybook",
      name: "绘本铅笔",
      description: "铅笔线稿加轻薄上色，保留手作感。",
      promptSuffix: "storybook pencil sketch, light wash colors, hand-drawn texture",
      previewUrl: "/assets/styles/pencil-storybook.png"
    },
    {
      id: "style_clay_play",
      name: "黏土玩具",
      description: "类似手工黏土摆拍，角色质感亲切可爱。",
      promptSuffix: "clay toy diorama, miniature set, soft studio light",
      previewUrl: "/assets/styles/clay-play.png"
    }
  ];

  const characters: Character[] = [
    {
      id: "char_baby",
      name: "宝宝",
      relation: "baby",
      appearance: "圆脸、短刘海，穿黄色背带裤，表情好奇。",
      referenceImageUrl: "/assets/characters/baby-ref.png",
      createdAt: seededAt,
      updatedAt: seededAt
    },
    {
      id: "char_dad",
      name: "爸爸",
      relation: "dad",
      appearance: "高个子、戴圆框眼镜，蓝色开衫，笑容温和。",
      referenceImageUrl: "/assets/characters/dad-ref.png",
      createdAt: seededAt,
      updatedAt: seededAt
    },
    {
      id: "char_mom",
      name: "妈妈",
      relation: "mom",
      appearance: "栗色短发，穿米色围裙，喜欢拿一本故事书。",
      referenceImageUrl: "/assets/characters/mom-ref.png",
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
