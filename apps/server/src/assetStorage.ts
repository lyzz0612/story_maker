import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { HttpError } from "./store.js";

const webPublicDir = join(dirname(fileURLToPath(import.meta.url)), "../../web/public");

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif"
]);

function extensionForMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

export function assertImageMime(mime: string) {
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    throw new HttpError(400, "Only image files are supported");
  }
}

export async function saveAssetSheetImage(
  projectId: string,
  buffer: Buffer,
  mime: string
): Promise<string> {
  assertImageMime(mime);

  const extension = extensionForMime(mime);
  const relativePath = join("assets", "projects", projectId, `asset-sheet.${extension}`);
  const absolutePath = join(webPublicDir, relativePath);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return `/${relativePath.replace(/\\/g, "/")}`;
}

const MOCK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

export async function saveGeneratedAssetImage(projectId: string, token: string): Promise<string> {
  const relativePath = join("assets", "projects", projectId, "generated", `${token}.png`);
  const absolutePath = join(webPublicDir, relativePath);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, MOCK_PNG);

  return `/${relativePath.replace(/\\/g, "/")}`;
}
