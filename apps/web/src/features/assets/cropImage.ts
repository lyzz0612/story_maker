import type { NormalizedRect } from "@story-maker/scene-schema";

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(sourceUrl);
  if (cached) {
    return cached;
  }

  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = sourceUrl;
  });

  imageCache.set(sourceUrl, pending);
  pending.catch(() => {
    imageCache.delete(sourceUrl);
  });
  return pending;
}

export async function cropImageFromRect(
  sourceUrl: string,
  rect: NormalizedRect,
  mimeType: "image/png" | "image/jpeg" = "image/png"
): Promise<string> {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  const sx = Math.round(rect.x * image.naturalWidth);
  const sy = Math.round(rect.y * image.naturalHeight);
  const sw = Math.max(1, Math.round(rect.w * image.naturalWidth));
  const sh = Math.max(1, Math.round(rect.h * image.naturalHeight));

  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("无法创建画布");
  }

  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL(mimeType);
}
