import { useCallback, useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.12;

interface ImageSize {
  width: number;
  height: number;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function computeFitScale(viewport: HTMLDivElement, imageSize: ImageSize) {
  const padding = 16;
  const availableWidth = Math.max(viewport.clientWidth - padding, 120);
  const availableHeight = Math.max(viewport.clientHeight - padding, 120);
  const scaleW = availableWidth / imageSize.width;
  const scaleH = availableHeight / imageSize.height;
  return Math.min(scaleW, scaleH, 1);
}

interface ZoomableImagePreviewProps {
  imageUrl: string | null;
  alt?: string;
  className?: string;
  empty?: ReactNode;
  overlay?: ReactNode;
}

export function ZoomableImagePreview({
  imageUrl,
  alt = "预览",
  className = "",
  empty,
  overlay
}: ZoomableImagePreviewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);

  const applyFitToViewport = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !imageSize) {
      return;
    }
    setFitScale(computeFitScale(viewport, imageSize));
    setZoom(1);
  }, [imageSize]);

  useEffect(() => {
    setImageSize(null);
    setFitScale(1);
    setZoom(1);
  }, [imageUrl]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      if (!imageUrl) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const factor = event.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;
      setZoom((current) => clampZoom(current * factor));
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [imageUrl]);

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    const nextSize = {
      width: image.naturalWidth,
      height: image.naturalHeight
    };
    setImageSize(nextSize);

    const viewport = viewportRef.current;
    if (viewport) {
      setFitScale(computeFitScale(viewport, nextSize));
      setZoom(1);
    }
  }

  const scale = fitScale * zoom;
  const displayWidth = imageSize ? Math.max(1, Math.round(imageSize.width * scale)) : 1;
  const displayHeight = imageSize ? Math.max(1, Math.round(imageSize.height * scale)) : 1;

  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
            disabled={!imageUrl}
            type="button"
            onClick={() => setZoom((current) => clampZoom(current * (1 - ZOOM_STEP)))}
          >
            −
          </button>
          <span className="min-w-[3.5rem] text-center text-xs font-bold text-ink">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
            disabled={!imageUrl}
            type="button"
            onClick={() => setZoom((current) => clampZoom(current * (1 + ZOOM_STEP)))}
          >
            +
          </button>
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
            disabled={!imageUrl}
            type="button"
            onClick={() => {
              if (!imageSize) {
                return;
              }
              setFitScale(1);
              setZoom(1);
            }}
          >
            100%
          </button>
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
            disabled={!imageUrl}
            type="button"
            onClick={applyFitToViewport}
          >
            适应窗口
          </button>
        </div>
        {imageSize ? (
          <span className="text-[11px] text-ink-soft">
            {imageSize.width} × {imageSize.height}px · 滚轮缩放
          </span>
        ) : null}
      </div>

      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-auto rounded-2xl border border-paper-deep bg-[linear-gradient(45deg,#f0e8d8_25%,transparent_25%),linear-gradient(-45deg,#f0e8d8_25%,transparent_25%)] bg-[length:16px_16px]"
      >
        {!imageUrl ? (
          <div className="flex h-full min-h-[320px] items-center justify-center px-6">
            {empty ?? (
              <p className="text-center text-sm text-ink-soft">暂无预览图</p>
            )}
          </div>
        ) : (
          <>
            <div
              className="relative shrink-0"
              style={{
                width: displayWidth,
                height: displayHeight,
                minWidth: displayWidth,
                minHeight: displayHeight
              }}
            >
              <img
                alt={alt}
                className="block max-w-none select-none"
                draggable={false}
                src={imageUrl}
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  maxWidth: "none",
                  maxHeight: "none"
                }}
                onLoad={handleImageLoad}
              />
            </div>
            {overlay ? (
              <div className="pointer-events-none absolute bottom-3 left-3 z-10">{overlay}</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
