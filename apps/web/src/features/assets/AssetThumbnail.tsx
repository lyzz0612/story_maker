import { useEffect, useState } from "react";

import type { AssetRegion, NormalizedRect } from "@story-maker/scene-schema";

import { cropImageFromRect } from "./cropImage";

interface AssetThumbnailProps {
  sourceUrl: string;
  region: AssetRegion;
  className?: string;
  alt?: string;
}

export function AssetThumbnail({ sourceUrl, region, className = "", alt }: AssetThumbnailProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setPreviewUrl(null);

    if (region.imageUrl) {
      setPreviewUrl(region.imageUrl);
      return;
    }

    if (!sourceUrl) {
      return;
    }

    void cropImageFromRect(sourceUrl, region.rect)
      .then((url) => {
        if (!cancelled) {
          setPreviewUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sourceUrl, region.imageUrl, rectKey(region.rect)]);

  const label = alt ?? region.label ?? "资产预览";

  if (failed || (!sourceUrl && !region.imageUrl)) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-honey/20 via-berry/10 to-mint/20 text-2xl ${className}`}
      >
        🖼
      </div>
    );
  }

  if (!previewUrl) {
    return <div className={`animate-pulse bg-paper-deep/60 ${className}`} />;
  }

  return <img alt={label} className={`object-contain ${className}`} src={previewUrl} />;
}

function rectKey(rect: NormalizedRect) {
  return `${rect.x}-${rect.y}-${rect.w}-${rect.h}`;
}
