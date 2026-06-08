import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type {
  AssetRegion,
  AssetRegionRole,
  AssetSheet,
  NormalizedRect,
} from "@story-maker/scene-schema";
import { DEFAULT_MOCK_ASSET_SHEET, MOCK_ASSET_OPTIONS } from "./mockAssets";
import "./AssetEditor.css";

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

export interface AssetEditorProps {
  value?: AssetSheet;
  defaultValue?: AssetSheet;
  saveEndpoint?: string;
  pageNumber?: number;
  className?: string;
  readOnly?: boolean;
  onChange?: (assetSheet: AssetSheet) => void;
  onSave?: (assetSheet: AssetSheet) => void | Promise<void>;
}

const roleOptions: AssetRegionRole[] = [
  "background",
  "sprite_frame",
  "preview_only",
];

const minimumRectSize = 0.015;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRect(start: Point, end: Point): NormalizedRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x: clamp(x),
    y: clamp(y),
    w: clamp(Math.abs(end.x - start.x), minimumRectSize),
    h: clamp(Math.abs(end.y - start.y), minimumRectSize),
  };
}

function constrainRect(rect: NormalizedRect): NormalizedRect {
  const w = clamp(rect.w, minimumRectSize);
  const h = clamp(rect.h, minimumRectSize);
  return {
    x: clamp(rect.x, 0, 1 - w),
    y: clamp(rect.y, 0, 1 - h),
    w,
    h,
  };
}

function moveRect(rect: NormalizedRect, delta: Point): NormalizedRect {
  return constrainRect({
    ...rect,
    x: rect.x + delta.x,
    y: rect.y + delta.y,
  });
}

function resizeRect(
  rect: NormalizedRect,
  delta: Point,
  handle: ResizeHandle,
): NormalizedRect {
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

function createRegionId() {
  return `region-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function formatFrameIndex(frameIndex?: number) {
  return Math.max(0, frameIndex ?? 0).toString().padStart(3, "0");
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "sequence";
}

export function buildMockExportMap(
  assetSheet: AssetSheet,
  pageNumber = 1,
): Record<string, string> {
  let backgroundCount = 0;

  return Object.fromEntries(
    assetSheet.regions.map((region) => {
      if (region.role === "background") {
        backgroundCount += 1;
        return [
          region.id,
          `pages/page-${pageNumber.toString().padStart(3, "0")}/background-${backgroundCount
            .toString()
            .padStart(3, "0")}.svg`,
        ];
      }

      if (region.role === "sprite_frame") {
        const sequenceId = slugify(region.sequenceId ?? "sequence");
        return [
          region.id,
          `pages/page-${pageNumber
            .toString()
            .padStart(3, "0")}/sequences/${sequenceId}/frame-${formatFrameIndex(
            region.frameIndex,
          )}.svg`,
        ];
      }

      return [
        region.id,
        `pages/page-${pageNumber
          .toString()
          .padStart(3, "0")}/reference/${region.id}.svg`,
      ];
    }),
  );
}

function rebuildSequences(
  assetSheet: AssetSheet,
  exports: Record<string, string>,
): AssetSheet["sequences"] {
  const sequences = { ...assetSheet.sequences };
  const sequenceIds = new Set(
    assetSheet.regions
      .filter((region) => region.role === "sprite_frame" && region.sequenceId)
      .map((region) => region.sequenceId as string),
  );

  for (const sequenceId of sequenceIds) {
    const existing = sequences[sequenceId] ?? { fps: 6, loop: true, frames: [] };
    const frames = assetSheet.regions
      .filter(
        (region) =>
          region.role === "sprite_frame" && region.sequenceId === sequenceId,
      )
      .sort((left, right) => (left.frameIndex ?? 0) - (right.frameIndex ?? 0))
      .map((region) => exports[region.id])
      .filter((frame): frame is string => Boolean(frame));

    sequences[sequenceId] = {
      ...existing,
      frames,
    };
  }

  return sequences;
}

function touch(assetSheet: AssetSheet): AssetSheet {
  return {
    ...assetSheet,
    updatedAt: new Date().toISOString(),
  };
}

export function AssetEditor({
  value,
  defaultValue = DEFAULT_MOCK_ASSET_SHEET,
  saveEndpoint,
  pageNumber = 1,
  className,
  readOnly = false,
  onChange,
  onSave,
}: AssetEditorProps) {
  const [draft, setDraft] = useState<AssetSheet>(value ?? defaultValue);
  const [selectedRegionId, setSelectedRegionId] = useState(
    draft.regions[0]?.id ?? "",
  );
  const [status, setStatus] = useState("");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const isControlled = value !== undefined;
  const selectedRegion = useMemo(
    () => draft.regions.find((region) => region.id === selectedRegionId),
    [draft.regions, selectedRegionId],
  );
  const exportMap = useMemo(
    () => draft.exports ?? buildMockExportMap(draft, pageNumber),
    [draft, pageNumber],
  );

  useEffect(() => {
    if (value) {
      setDraft(value);
      setSelectedRegionId((current) => current || value.regions[0]?.id || "");
    }
  }, [value]);

  function commit(next: AssetSheet) {
    const touched = touch(next);
    if (!isControlled) {
      setDraft(touched);
    }
    onChange?.(touched);
  }

  function updateRegion(regionId: string, updater: (region: AssetRegion) => AssetRegion) {
    commit({
      ...draft,
      regions: draft.regions.map((region) =>
        region.id === regionId ? updater(region) : region,
      ),
    });
  }

  function pointFromEvent(event: PointerEvent<SVGElement>): Point {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }

    const bounds = svg.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    };
  }

  function handleCanvasPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (readOnly || event.target !== event.currentTarget) {
      return;
    }

    const point = pointFromEvent(event);
    const region: AssetRegion = {
      id: createRegionId(),
      role: "sprite_frame",
      rect: { x: point.x, y: point.y, w: minimumRectSize, h: minimumRectSize },
      sequenceId: "sequence",
      frameIndex: draft.regions.filter((item) => item.role === "sprite_frame")
        .length,
    };

    setSelectedRegionId(region.id);
    dragRef.current = {
      mode: "create",
      regionId: region.id,
      startPoint: point,
      originRect: region.rect,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    commit({
      ...draft,
      regions: [...draft.regions, region],
    });
  }

  function handleRegionPointerDown(
    event: PointerEvent<SVGRectElement>,
    region: AssetRegion,
  ) {
    if (readOnly) {
      return;
    }

    event.stopPropagation();
    setSelectedRegionId(region.id);
    dragRef.current = {
      mode: "move",
      regionId: region.id,
      startPoint: pointFromEvent(event),
      originRect: region.rect,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHandlePointerDown(
    event: PointerEvent<SVGCircleElement>,
    region: AssetRegion,
    handle: ResizeHandle,
  ) {
    if (readOnly) {
      return;
    }

    event.stopPropagation();
    setSelectedRegionId(region.id);
    dragRef.current = {
      mode: "resize",
      regionId: region.id,
      startPoint: pointFromEvent(event),
      originRect: region.rect,
      handle,
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
      y: point.y - drag.startPoint.y,
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

  function handleSourceChange(sourceUrl: string) {
    commit({
      ...draft,
      sourceUrl,
    });
  }

  function handleDeleteSelected() {
    if (!selectedRegion) {
      return;
    }

    const regions = draft.regions.filter(
      (region) => region.id !== selectedRegion.id,
    );
    setSelectedRegionId(regions[0]?.id ?? "");
    commit({
      ...draft,
      regions,
    });
  }

  function updateSelectedRegion<K extends keyof AssetRegion>(
    key: K,
    rawValue: AssetRegion[K],
  ) {
    if (!selectedRegion) {
      return;
    }

    updateRegion(selectedRegion.id, (region) => ({
      ...region,
      [key]: rawValue,
    }));
  }

  function updateSequence(
    sequenceId: string,
    patch: Partial<AssetSheet["sequences"][string]>,
  ) {
    const existing = draft.sequences[sequenceId] ?? {
      frames: [],
      fps: 6,
      loop: true,
    };
    commit({
      ...draft,
      sequences: {
        ...draft.sequences,
        [sequenceId]: {
          ...existing,
          ...patch,
        },
      },
    });
  }

  function exportRegions() {
    const exports = buildMockExportMap(draft, pageNumber);
    const next: AssetSheet = touch({
      ...draft,
      regions: draft.regions.map((region) => ({
        ...region,
        exportedName: exports[region.id],
      })),
      exports,
      sequences: rebuildSequences(draft, exports),
    });

    if (!isControlled) {
      setDraft(next);
    }
    onChange?.(next);
    setStatus("Mock export mapping refreshed.");
    return next;
  }

  async function handleSave() {
    const exported = exportRegions();

    if (saveEndpoint) {
      await fetch(saveEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exported),
      });
    }

    await onSave?.(exported);
    setStatus("Asset sheet saved.");
  }

  const sequenceIds = useMemo(() => {
    const ids = new Set(Object.keys(draft.sequences));
    for (const region of draft.regions) {
      if (region.sequenceId) {
        ids.add(region.sequenceId);
      }
    }
    return Array.from(ids).sort();
  }, [draft.regions, draft.sequences]);

  return (
    <section className={["asset-editor", className].filter(Boolean).join(" ")}>
      <div className="asset-editor__toolbar">
        <label>
          Mock atlas
          <select
            value={draft.sourceUrl}
            onChange={(event) => handleSourceChange(event.target.value)}
            disabled={readOnly}
          >
            {MOCK_ASSET_OPTIONS.map((option) => (
              <option key={option.url} value={option.url}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={exportRegions}>
          Mock export regions
        </button>
        <button type="button" onClick={handleSave}>
          Save asset sheet
        </button>
      </div>

      <div className="asset-editor__body">
        <div className="asset-editor__stage">
          <img src={draft.sourceUrl} alt="Mock atlas" draggable={false} />
          <svg
            ref={svgRef}
            className="asset-editor__overlay"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {draft.regions.map((region) => {
              const isSelected = region.id === selectedRegionId;
              const { x, y, w, h } = region.rect;
              const handles: Array<[ResizeHandle, number, number]> = [
                ["nw", x, y],
                ["ne", x + w, y],
                ["sw", x, y + h],
                ["se", x + w, y + h],
              ];

              return (
                <g key={region.id} className={`asset-editor__region role-${region.role}`}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    className={isSelected ? "is-selected" : ""}
                    onPointerDown={(event) => handleRegionPointerDown(event, region)}
                  />
                  <text x={x + 0.01} y={y + 0.03}>
                    {region.role}
                  </text>
                  {isSelected &&
                    handles.map(([handle, cx, cy]) => (
                      <circle
                        key={handle}
                        cx={cx}
                        cy={cy}
                        r={0.012}
                        className="asset-editor__handle"
                        onPointerDown={(event) =>
                          handleHandlePointerDown(event, region, handle)
                        }
                      />
                    ))}
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="asset-editor__panel">
          <h3>Region properties</h3>
          {selectedRegion ? (
            <div className="asset-editor__fields">
              <label>
                Role
                <select
                  value={selectedRegion.role}
                  onChange={(event) =>
                    updateSelectedRegion(
                      "role",
                      event.target.value as AssetRegionRole,
                    )
                  }
                  disabled={readOnly}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Label
                <input
                  value={selectedRegion.label ?? ""}
                  onChange={(event) =>
                    updateSelectedRegion("label", event.target.value)
                  }
                  disabled={readOnly}
                />
              </label>
              <label>
                Sequence ID
                <input
                  value={selectedRegion.sequenceId ?? ""}
                  onChange={(event) =>
                    updateSelectedRegion("sequenceId", event.target.value)
                  }
                  disabled={readOnly || selectedRegion.role !== "sprite_frame"}
                />
              </label>
              <label>
                Frame index
                <input
                  type="number"
                  min={0}
                  value={selectedRegion.frameIndex ?? 0}
                  onChange={(event) =>
                    updateSelectedRegion(
                      "frameIndex",
                      Number.parseInt(event.target.value, 10) || 0,
                    )
                  }
                  disabled={readOnly || selectedRegion.role !== "sprite_frame"}
                />
              </label>
              <dl className="asset-editor__rect">
                <div>
                  <dt>x</dt>
                  <dd>{selectedRegion.rect.x.toFixed(3)}</dd>
                </div>
                <div>
                  <dt>y</dt>
                  <dd>{selectedRegion.rect.y.toFixed(3)}</dd>
                </div>
                <div>
                  <dt>w</dt>
                  <dd>{selectedRegion.rect.w.toFixed(3)}</dd>
                </div>
                <div>
                  <dt>h</dt>
                  <dd>{selectedRegion.rect.h.toFixed(3)}</dd>
                </div>
              </dl>
              <button type="button" onClick={handleDeleteSelected} disabled={readOnly}>
                Delete region
              </button>
            </div>
          ) : (
            <p>Drag on the atlas to create a new normalized region.</p>
          )}

          <h3>Sequences</h3>
          <div className="asset-editor__sequences">
            {sequenceIds.length > 0 ? (
              sequenceIds.map((sequenceId) => {
                const sequence = draft.sequences[sequenceId] ?? {
                  frames: [],
                  fps: 6,
                  loop: true,
                };
                const frameCount = draft.regions.filter(
                  (region) =>
                    region.role === "sprite_frame" &&
                    region.sequenceId === sequenceId,
                ).length;

                return (
                  <fieldset key={sequenceId}>
                    <legend>{sequenceId}</legend>
                    <label>
                      FPS
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={sequence.fps}
                        onChange={(event) =>
                          updateSequence(sequenceId, {
                            fps: Number.parseInt(event.target.value, 10) || 1,
                          })
                        }
                        disabled={readOnly}
                      />
                    </label>
                    <label className="asset-editor__checkbox">
                      <input
                        type="checkbox"
                        checked={sequence.loop}
                        onChange={(event) =>
                          updateSequence(sequenceId, {
                            loop: event.target.checked,
                          })
                        }
                        disabled={readOnly}
                      />
                      Loop
                    </label>
                    <small>{frameCount} selected frame regions</small>
                  </fieldset>
                );
              })
            ) : (
              <p>No sprite sequence regions yet.</p>
            )}
          </div>

          <h3>Mock export map</h3>
          <ul className="asset-editor__exports">
            {Object.entries(exportMap).map(([regionId, logicalName]) => (
              <li key={regionId}>
                <span>{regionId}</span>
                <code>{logicalName}</code>
              </li>
            ))}
          </ul>
          {status && <p className="asset-editor__status">{status}</p>}
        </aside>
      </div>
    </section>
  );
}
