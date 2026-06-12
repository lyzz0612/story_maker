import { useCallback, useEffect, useRef, useState, type PointerEvent, type SyntheticEvent } from "react";

import type { NormalizedRect } from "@story-maker/scene-schema";

export interface DraftRegion {
  id: string;
  rect: NormalizedRect;
  label: string;
}

type DragMode = "create" | "move" | "resize";
type ResizeHandle = "nw" | "ne" | "sw" | "se";

interface Point {
  x: number;
  y: number;
}

interface DragState {
  mode: DragMode;
  regionId: string;
  startPoint: Point;
  originRect: NormalizedRect;
  handle?: ResizeHandle;
}

interface ImageSize {
  width: number;
  height: number;
}

const minimumRectSize = 0.02;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.12;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function normalizeRect(start: Point, end: Point): NormalizedRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x: clamp(x),
    y: clamp(y),
    w: clamp(Math.abs(end.x - start.x), minimumRectSize),
    h: clamp(Math.abs(end.y - start.y), minimumRectSize)
  };
}

function constrainRect(rect: NormalizedRect): NormalizedRect {
  const w = clamp(rect.w, minimumRectSize);
  const h = clamp(rect.h, minimumRectSize);
  return {
    x: clamp(rect.x, 0, 1 - w),
    y: clamp(rect.y, 0, 1 - h),
    w,
    h
  };
}

function moveRect(rect: NormalizedRect, delta: Point): NormalizedRect {
  return constrainRect({ ...rect, x: rect.x + delta.x, y: rect.y + delta.y });
}

function resizeRect(rect: NormalizedRect, delta: Point, handle: ResizeHandle): NormalizedRect {
  const next = { ...rect };
  if (handle.includes("w")) {
    next.x = rect.x + delta.x;
    next.w = rect.w - delta.x;
  }
  if (handle.includes("e")) {
    next.w = rect.w + delta.x;
  }
  if (handle.includes("n")) {
    next.y = rect.y + delta.y;
    next.h = rect.h - delta.y;
  }
  if (handle.includes("s")) {
    next.h = rect.h + delta.y;
  }
  return constrainRect(next);
}

function computeFitScale(viewport: HTMLDivElement, imageSize: ImageSize) {
  const padding = 16;
  const availableWidth = Math.max(viewport.clientWidth - padding, 120);
  const availableHeight = Math.max(viewport.clientHeight - padding, 120);
  const scaleW = availableWidth / imageSize.width;
  const scaleH = availableHeight / imageSize.height;
  return Math.min(scaleW, scaleH, 1);
}

export function createDraftRegionId() {
  return `region-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface AssetRegionPickerProps {
  sourceUrl: string;
  regions: DraftRegion[];
  selectedRegionId: string | null;
  onRegionsChange: (regions: DraftRegion[]) => void;
  onSelectRegion: (regionId: string) => void;
  className?: string;
}

export function AssetRegionPicker({
  sourceUrl,
  regions,
  selectedRegionId,
  onRegionsChange,
  onSelectRegion,
  className = ""
}: AssetRegionPickerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
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
  }, [sourceUrl]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const factor = event.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;
      setZoom((current) => clampZoom(current * factor));
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

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

  function pointFromEvent(event: PointerEvent<SVGElement>): Point {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const bounds = svg.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height)
    };
  }

  function updateRegion(regionId: string, updater: (region: DraftRegion) => DraftRegion) {
    onRegionsChange(regions.map((region) => (region.id === regionId ? updater(region) : region)));
  }

  function handleCanvasPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    const point = pointFromEvent(event);
    const region: DraftRegion = {
      id: createDraftRegionId(),
      rect: { x: point.x, y: point.y, w: minimumRectSize, h: minimumRectSize },
      label: `资产 ${regions.length + 1}`
    };

    onSelectRegion(region.id);
    dragRef.current = {
      mode: "create",
      regionId: region.id,
      startPoint: point,
      originRect: region.rect
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    onRegionsChange([...regions, region]);
  }

  function handleRegionPointerDown(event: PointerEvent<SVGCircleElement | SVGRectElement>, region: DraftRegion) {
    event.stopPropagation();
    onSelectRegion(region.id);
    dragRef.current = {
      mode: "move",
      regionId: region.id,
      startPoint: pointFromEvent(event),
      originRect: region.rect
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHandlePointerDown(
    event: PointerEvent<SVGCircleElement>,
    region: DraftRegion,
    handle: ResizeHandle
  ) {
    event.stopPropagation();
    onSelectRegion(region.id);
    dragRef.current = {
      mode: "resize",
      regionId: region.id,
      startPoint: pointFromEvent(event),
      originRect: region.rect,
      handle
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    const point = pointFromEvent(event);
    const delta = {
      x: point.x - drag.startPoint.x,
      y: point.y - drag.startPoint.y
    };

    updateRegion(drag.regionId, (region) => {
      if (drag.mode === "create") {
        return { ...region, rect: normalizeRect(drag.startPoint, point) };
      }
      if (drag.mode === "resize" && drag.handle) {
        return { ...region, rect: resizeRect(drag.originRect, delta, drag.handle) };
      }
      return { ...region, rect: moveRect(drag.originRect, delta) };
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  const scale = fitScale * zoom;
  const displayWidth = imageSize ? Math.max(1, Math.round(imageSize.width * scale)) : 1;
  const displayHeight = imageSize ? Math.max(1, Math.round(imageSize.height * scale)) : 1;

  return (
    <div className={["flex min-h-0 flex-col gap-2", className].join(" ")}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-paper-deep bg-white/80 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
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
            type="button"
            onClick={() => setZoom((current) => clampZoom(current * (1 + ZOOM_STEP)))}
          >
            +
          </button>
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
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
          <button className="btn-secondary px-3 py-1.5 text-xs" type="button" onClick={applyFitToViewport}>
            适应窗口
          </button>
        </div>
        {imageSize ? (
          <span className="text-[11px] text-ink-soft">
            {imageSize.width} × {imageSize.height}px · 显示 {displayWidth} × {displayHeight}px · 滚轮缩放
          </span>
        ) : null}
      </div>

      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-auto rounded-2xl border border-paper-deep bg-[linear-gradient(45deg,#f0e8d8_25%,transparent_25%),linear-gradient(-45deg,#f0e8d8_25%,transparent_25%)] bg-[length:16px_16px]"
      >
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
            alt="导入图集"
            className="block max-w-none select-none"
            draggable={false}
            src={sourceUrl}
            style={{
              width: displayWidth,
              height: displayHeight,
              maxWidth: "none",
              maxHeight: "none"
            }}
            onLoad={handleImageLoad}
          />
          {imageSize ? (
            <svg
              ref={svgRef}
              className="absolute inset-0 cursor-crosshair touch-none"
              height={displayHeight}
              preserveAspectRatio="none"
              viewBox="0 0 1 1"
              width={displayWidth}
              onPointerCancel={handlePointerUp}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {regions.map((region) => {
                const isSelected = region.id === selectedRegionId;
                const { x, y, w, h } = region.rect;
                const handles: Array<[ResizeHandle, number, number]> = [
                  ["nw", x, y],
                  ["ne", x + w, y],
                  ["sw", x, y + h],
                  ["se", x + w, y + h]
                ];

                return (
                  <g key={region.id}>
                    <rect
                      className={
                        isSelected
                          ? "fill-honey/30 stroke-ink stroke-[0.006]"
                          : "fill-mint/25 stroke-mint stroke-[0.004]"
                      }
                      height={h}
                      width={w}
                      x={x}
                      y={y}
                      onPointerDown={(event) => handleRegionPointerDown(event, region)}
                    />
                    <text
                      className="pointer-events-none select-none fill-ink text-[0.028px] font-bold"
                      x={x + 0.008}
                      y={y + 0.028}
                    >
                      {region.label || "未命名"}
                    </text>
                    {isSelected
                      ? handles.map(([handle, cx, cy]) => (
                          <circle
                            key={handle}
                            className="fill-white stroke-ink stroke-[0.004] cursor-nwse-resize"
                            cx={cx}
                            cy={cy}
                            r={0.014}
                            onPointerDown={(event) => handleHandlePointerDown(event, region, handle)}
                          />
                        ))
                      : null}
                  </g>
                );
              })}
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
}
