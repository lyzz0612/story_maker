import type { Character, OutlinePage } from "@story-maker/scene-schema";

export const relationLabels: Record<Character["relation"], string> = {
  baby: "宝宝",
  dad: "爸爸",
  mom: "妈妈",
  other: "其他"
};

export const pageStatusLabels: Record<OutlinePage["status"], string> = {
  draft: "草稿",
  generating: "生成中",
  ready: "已配图"
};

export function formatDate(value?: string) {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function getPageCount(pages: OutlinePage[] | undefined) {
  return pages?.length ?? 0;
}

export function getCharactersById(characters: Character[]) {
  return new Map(characters.map((character) => [character.id, character]));
}
