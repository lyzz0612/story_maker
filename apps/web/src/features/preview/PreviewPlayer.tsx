import { useEffect, useMemo, useRef, useState } from "react";
import type { SceneGraph, SceneLayer } from "@story-maker/scene-schema";
import {
  Application,
  Assets,
  Container,
  Sprite,
} from "pixi.js";
import type { Texture } from "pixi.js";
import "./PreviewPlayer.css";

export interface PreviewPage {
  id?: string;
  title?: string;
  pageNumber?: number;
  scene: SceneGraph;
}

export interface PreviewPlayerProps {
  pages: PreviewPage[];
  currentPageIndex?: number;
  initialPageIndex?: number;
  width?: number;
  height?: number;
  className?: string;
  showControls?: boolean;
  emptyMessage?: string;
  onPageChange?: (pageIndex: number, page: PreviewPage) => void;
}

type PixiApplication = Application & {
  init?: (options: Record<string, unknown>) => Promise<void>;
  canvas?: HTMLCanvasElement;
  view?: HTMLCanvasElement;
};

type PixiStage = Container & {
  eventMode?: string;
  interactive?: boolean;
  hitArea?: unknown;
  on: (event: string, listener: () => void) => void;
  off: (event: string, listener: () => void) => void;
};

const defaultWidth = 960;
const defaultHeight = 540;

function clampIndex(index: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.min(total - 1, Math.max(0, index));
}

function getTickerDeltaMs(tickerOrDelta: unknown) {
  if (typeof tickerOrDelta === "number") {
    return tickerOrDelta * (1000 / 60);
  }

  if (
    tickerOrDelta &&
    typeof tickerOrDelta === "object" &&
    "deltaMS" in tickerOrDelta
  ) {
    const deltaMS = (tickerOrDelta as { deltaMS?: number }).deltaMS;
    return deltaMS ?? 1000 / 60;
  }

  return 1000 / 60;
}

function isPreviewOnlyLayer(layer: SceneLayer) {
  const looseLayer = layer as unknown as { role?: string; kind?: string };
  return looseLayer.role === "preview_only" || looseLayer.kind === "preview_only";
}

function fitRootToStage(
  root: Container,
  scene: SceneGraph,
  width: number,
  height: number,
) {
  const scale = Math.min(width / scene.width, height / scene.height);
  root.scale.set(scale);
  root.position.set(
    Math.round((width - scene.width * scale) / 2),
    Math.round((height - scene.height * scale) / 2),
  );
}

function applyLayerTransform(sprite: Sprite, layer: SceneLayer) {
  sprite.x = layer.x;
  sprite.y = layer.y;
  sprite.width = layer.width;
  sprite.height = layer.height;
  sprite.alpha = layer.opacity ?? 1;
  sprite.visible = layer.visible ?? true;
}

async function loadTexture(sourceUrl: string) {
  return (await Assets.load(sourceUrl)) as Texture;
}

function animatePopIn(app: PixiApplication, sprite: Sprite) {
  const durationMs = 240;
  const targetAlpha = sprite.alpha || 1;
  const baseScale = { x: sprite.scale.x, y: sprite.scale.y };
  let elapsedMs = 0;

  sprite.visible = true;
  sprite.alpha = 0;
  sprite.scale.set(baseScale.x * 0.76, baseScale.y * 0.76);

  const tick = (tickerOrDelta: unknown) => {
    elapsedMs += getTickerDeltaMs(tickerOrDelta);
    const progress = Math.min(1, elapsedMs / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);

    sprite.alpha = targetAlpha * eased;
    sprite.scale.set(
      baseScale.x * (0.76 + 0.24 * eased),
      baseScale.y * (0.76 + 0.24 * eased),
    );

    if (progress >= 1) {
      app.ticker.remove(tick);
    }
  };

  app.ticker.add(tick);
  return () => app.ticker.remove(tick);
}

function setupStaggerPopIn(
  app: PixiApplication,
  scene: SceneGraph,
  spritesByLayerId: Map<string, Sprite>,
  registerCleanup: (cleanup: () => void) => void,
) {
  if (
    scene.template?.type !== "stagger_pop_in" ||
    scene.template.trigger !== "tap"
  ) {
    return;
  }

  for (const step of scene.template.sequence) {
    const sprite = spritesByLayerId.get(step.layerId);
    if (sprite) {
      sprite.visible = false;
      sprite.alpha = 0;
    }
  }

  let played = false;
  const stage = app.stage as PixiStage;
  const handleTap = () => {
    if (played) {
      return;
    }

    played = true;
    for (const step of scene.template?.sequence ?? []) {
      const sprite = spritesByLayerId.get(step.layerId);
      if (!sprite) {
        continue;
      }

      const timeoutId = window.setTimeout(() => {
        const cleanupAnimation = animatePopIn(app, sprite);
        registerCleanup(cleanupAnimation);
      }, step.delayMs);
      registerCleanup(() => window.clearTimeout(timeoutId));
    }
  };

  stage.eventMode = "static";
  stage.interactive = true;
  stage.hitArea = app.screen;
  stage.on("pointertap", handleTap);
  registerCleanup(() => stage.off("pointertap", handleTap));
}

async function mountScene(
  host: HTMLDivElement,
  scene: SceneGraph,
  width: number,
  height: number,
) {
  const cleanupCallbacks: Array<() => void> = [];
  const app = new Application({
    width,
    height,
    backgroundColor: scene.backgroundColor,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  } as Record<string, unknown>) as PixiApplication;

  if (app.init) {
    await app.init({
      width,
      height,
      background: scene.backgroundColor,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
  } else {
    app.renderer.resize(width, height);
  }

  const canvas = app.canvas ?? app.view;
  if (canvas) {
    host.replaceChildren(canvas);
  }

  const root = new Container();
  fitRootToStage(root, scene, width, height);
  app.stage.addChild(root);

  const spritesByLayerId = new Map<string, Sprite>();

  for (const layer of scene.layers) {
    if (layer.visible === false || isPreviewOnlyLayer(layer)) {
      continue;
    }

    if (layer.kind === "background" || layer.kind === "sprite") {
      const texture = await loadTexture(layer.sourceUrl);
      const sprite = new Sprite(texture);
      applyLayerTransform(sprite, layer);
      root.addChild(sprite);
      spritesByLayerId.set(layer.id, sprite);
      continue;
    }

    if (layer.kind === "sprite_sequence") {
      const textures = await Promise.all(layer.frames.map(loadTexture));
      const firstTexture = textures[0];
      if (!firstTexture) {
        continue;
      }

      const sprite = new Sprite(firstTexture);
      applyLayerTransform(sprite, layer);
      root.addChild(sprite);
      spritesByLayerId.set(layer.id, sprite);

      let elapsedMs = 0;
      let frameIndex = 0;
      const intervalMs = 1000 / Math.max(1, layer.fps);
      const advanceFrame = (tickerOrDelta: unknown) => {
        elapsedMs += getTickerDeltaMs(tickerOrDelta);
        if (elapsedMs < intervalMs) {
          return;
        }

        elapsedMs %= intervalMs;
        const nextIndex = frameIndex + 1;
        if (nextIndex >= textures.length) {
          if (!layer.loop) {
            app.ticker.remove(advanceFrame);
            return;
          }
          frameIndex = 0;
        } else {
          frameIndex = nextIndex;
        }

        const texture = textures[frameIndex];
        if (texture) {
          sprite.texture = texture;
        }
      };

      app.ticker.add(advanceFrame);
      cleanupCallbacks.push(() => app.ticker.remove(advanceFrame));
    }
  }

  setupStaggerPopIn(app, scene, spritesByLayerId, (cleanup) =>
    cleanupCallbacks.push(cleanup),
  );

  return () => {
    for (const cleanup of cleanupCallbacks) {
      cleanup();
    }
    app.destroy(true, { children: true, texture: false });
    host.replaceChildren();
  };
}

export function PreviewPlayer({
  pages,
  currentPageIndex,
  initialPageIndex = 0,
  width = defaultWidth,
  height = defaultHeight,
  className,
  showControls = true,
  emptyMessage = "No scene is available for preview.",
  onPageChange,
}: PreviewPlayerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [internalPageIndex, setInternalPageIndex] = useState(initialPageIndex);
  const [error, setError] = useState("");
  const activeIndex = clampIndex(
    currentPageIndex ?? internalPageIndex,
    pages.length,
  );
  const activePage = pages[activeIndex];
  const activeScene = activePage?.scene;

  const hasStaggerTap = activeScene?.template?.type === "stagger_pop_in";
  const pageLabel = useMemo(() => {
    if (!activePage || pages.length === 0) {
      return "0 / 0";
    }

    const pageNumber = activePage.pageNumber ?? activePage.scene.pageNumber;
    return `Page ${pageNumber} (${activeIndex + 1} / ${pages.length})`;
  }, [activeIndex, activePage, pages.length]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !activeScene) {
      return;
    }

    let cancelled = false;
    let cleanupScene: (() => void) | undefined;
    setError("");
    host.replaceChildren();

    mountScene(host, activeScene, width, height)
      .then((cleanup) => {
        if (cancelled) {
          cleanup();
          return;
        }
        cleanupScene = cleanup;
      })
      .catch((reason: unknown) => {
        const message =
          reason instanceof Error ? reason.message : "Failed to mount Pixi scene.";
        setError(message);
      });

    return () => {
      cancelled = true;
      cleanupScene?.();
    };
  }, [activeScene, height, width]);

  function goToPage(nextIndex: number) {
    const safeIndex = clampIndex(nextIndex, pages.length);
    const page = pages[safeIndex];
    if (!page) {
      return;
    }

    if (currentPageIndex === undefined) {
      setInternalPageIndex(safeIndex);
    }
    onPageChange?.(safeIndex, page);
  }

  if (!activeScene) {
    return (
      <section className={["preview-player", className].filter(Boolean).join(" ")}>
        <div className="preview-player__empty">{emptyMessage}</div>
      </section>
    );
  }

  return (
    <section className={["preview-player", className].filter(Boolean).join(" ")}>
      <div className="preview-player__frame" style={{ maxWidth: width }}>
        <div
          ref={hostRef}
          className="preview-player__host"
          style={{ aspectRatio: `${width} / ${height}` }}
        />
        {hasStaggerTap && (
          <div className="preview-player__hint">Click the page to trigger pop-in.</div>
        )}
      </div>

      {showControls && (
        <div className="preview-player__controls">
          <button
            type="button"
            onClick={() => goToPage(activeIndex - 1)}
            disabled={activeIndex <= 0}
          >
            Previous
          </button>
          <strong>{pageLabel}</strong>
          <button
            type="button"
            onClick={() => goToPage(activeIndex + 1)}
            disabled={activeIndex >= pages.length - 1}
          >
            Next
          </button>
        </div>
      )}

      {error && <p className="preview-player__error">{error}</p>}
    </section>
  );
}
