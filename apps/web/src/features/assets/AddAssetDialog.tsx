import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { ArtStyle, AssetRegion, AssetSheet, ImageProviderConfig, Project } from "@story-maker/scene-schema";

import type { AssetGenerateJob } from "@/lib/api";
import { api } from "@/lib/api";
import { formatImageProvider } from "@/lib/providerLabels";

import { AssetGenerateProgress } from "./AssetGenerateProgress";

import {
  AssetRegionPicker,
  createDraftRegionId,
  type DraftRegion
} from "./AssetRegionPicker";
import { AssetRegionSidebar } from "./AssetRegionSidebar";

interface AddAssetDialogProps {
  open: boolean;
  project: Project;
  existingSheet: AssetSheet | null;
  activeGenerateJob: AssetGenerateJob | null;
  onActiveGenerateJobChange: (job: AssetGenerateJob | null) => void;
  onClose: () => void;
  onConfirm: (sourceUrl: string, regions: AssetRegion[]) => Promise<void>;
}

function isJobRunning(job: AssetGenerateJob | null) {
  return job?.status === "queued" || job?.status === "running";
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "asset";
}

export function AddAssetDialog({
  open,
  project,
  existingSheet,
  activeGenerateJob,
  onActiveGenerateJobChange,
  onClose,
  onConfirm
}: AddAssetDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [imageId, setImageId] = useState("");
  const [artStyleId, setArtStyleId] = useState("");
  const [imageConfigs, setImageConfigs] = useState<ImageProviderConfig[]>([]);
  const [artStyles, setArtStyles] = useState<ArtStyle[]>([]);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [regions, setRegions] = useState<DraftRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [startingJob, setStartingJob] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const generating = startingJob || isJobRunning(activeGenerateJob);

  const projectImage = useMemo(
    () => imageConfigs.find((config) => config.id === project.imageId),
    [imageConfigs, project.imageId]
  );
  const projectArtStyle = useMemo(
    () => artStyles.find((style) => style.id === project.artStyleId),
    [artStyles, project.artStyleId]
  );

  function reset() {
    setPrompt("");
    setImageId("");
    setArtStyleId("");
    setSourceUrl(null);
    setRegions([]);
    setSelectedRegionId(null);
    setError(null);
  }

  function handleClose() {
    onClose();
  }

  useEffect(() => {
    if (activeGenerateJob?.status === "succeeded" && activeGenerateJob.result) {
      setSourceUrl(activeGenerateJob.result.imageUrl);
      setRegions([]);
      setSelectedRegionId(null);
      setError(null);
    }
    if (activeGenerateJob?.status === "failed") {
      setError(activeGenerateJob.error ?? "生图失败");
    }
  }, [
    activeGenerateJob?.status,
    activeGenerateJob?.result,
    activeGenerateJob?.error
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let cancelled = false;
    setLoadingOptions(true);
    void Promise.all([api.getImageConfigs(), api.listArtStyles()])
      .then(([configs, styles]) => {
        if (cancelled) {
          return;
        }
        setImageConfigs(configs);
        setArtStyles(styles);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "加载模型配置失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      });

    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("请填写生图提示词");
      return;
    }
    if (isJobRunning(activeGenerateJob)) {
      return;
    }

    setStartingJob(true);
    setError(null);
    try {
      const started = await api.startProjectAssetGenerate(project.id, {
        prompt: prompt.trim(),
        imageId: imageId || undefined,
        artStyleId: artStyleId || undefined
      });
      const job = await api.getProjectAssetGenerateJob(project.id, started.jobId);
      onActiveGenerateJobChange(job);
      setSourceUrl(null);
      setRegions([]);
      setSelectedRegionId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "启动生图任务失败");
    } finally {
      setStartingJob(false);
    }
  }

  function addRegion() {
    const region: DraftRegion = {
      id: createDraftRegionId(),
      rect: { x: 0.1, y: 0.1, w: 0.25, h: 0.25 },
      label: `资产 ${regions.length + 1}`
    };
    setRegions((current) => [...current, region]);
    setSelectedRegionId(region.id);
  }

  function useWholeImage() {
    const region: DraftRegion = {
      id: createDraftRegionId(),
      rect: { x: 0, y: 0, w: 1, h: 1 },
      label: "共用图集"
    };
    setRegions([region]);
    setSelectedRegionId(region.id);
  }

  async function handleConfirm() {
    if (!sourceUrl) {
      setError("请先生成图片");
      return;
    }
    if (regions.length === 0) {
      setError("请框选至少一个区域，或点击「整图共用」");
      return;
    }
    const unnamed = regions.find((region) => !region.label.trim());
    if (unnamed) {
      setError("请为每个选区填写资产名称");
      setSelectedRegionId(unnamed.id);
      return;
    }

    const assetRegions: AssetRegion[] = regions.map((region) => ({
      id: region.id,
      role: "sprite_frame",
      rect: region.rect,
      label: region.label.trim(),
      sequenceId: slugify(region.label),
      frameIndex: 0
    }));

    setSaving(true);
    setError(null);
    try {
      await onConfirm(sourceUrl, assetRegions);
      reset();
      onActiveGenerateJobChange(null);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  const canGenerate = Boolean(prompt.trim()) && !generating && !saving;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/45 p-3 backdrop-blur-sm sm:p-5"
      onClick={handleClose}
    >
      <div
        className="flex h-[min(92vh,900px)] w-[min(98vw,1400px)] flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-paper shadow-lift"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-asset-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-paper-deep/70 px-6 py-5">
          <div>
            <h2 id="add-asset-title" className="font-display text-xl font-black text-ink">
              AI 生成并框选资产
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              抽卡生图后框选区域切片，或整图作为项目共用图集
            </p>
          </div>
          <button
            aria-label="关闭"
            className="rounded-xl px-2 py-1 text-xl leading-none text-ink-soft transition hover:bg-white hover:text-ink"
            type="button"
            onClick={handleClose}
          >
            ×
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col gap-4 overflow-hidden border-b border-paper-deep/70 px-6 py-4 lg:border-b-0 lg:border-r">
            <label className="block shrink-0">
              <span className="mb-2 block text-sm font-bold text-ink-soft">生图提示词</span>
              <textarea
                className="field min-h-[8rem] resize-none leading-relaxed"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="描述要生成的图集或场景，例如：三只小猪与砖房、草地背景、角色精灵图集"
              />
            </label>

            <div className="grid shrink-0 gap-3">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-ink-soft">生图模型</span>
                <select
                  className="field py-2.5 text-sm"
                  disabled={loadingOptions || generating || saving}
                  value={imageId}
                  onChange={(event) => setImageId(event.target.value)}
                >
                  <option value="">
                    项目默认
                    {projectImage ? `（${projectImage.name}）` : ""}
                  </option>
                  {imageConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} · {formatImageProvider(config.provider)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-ink-soft">画风</span>
                <select
                  className="field py-2.5 text-sm"
                  disabled={loadingOptions || generating || saving}
                  value={artStyleId}
                  onChange={(event) => setArtStyleId(event.target.value)}
                >
                  <option value="">
                    项目默认
                    {projectArtStyle ? `（${projectArtStyle.name}）` : "（不使用）"}
                  </option>
                  {artStyles.map((style) => (
                    <option key={style.id} value={style.id}>
                      {style.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              className="btn-primary shrink-0"
              disabled={!canGenerate}
              type="button"
              onClick={() => void handleGenerate()}
            >
              {generating ? "后台生图中…" : sourceUrl ? "再抽一张" : "提交生图任务"}
            </button>

            {isJobRunning(activeGenerateJob) ? (
              <div className="shrink-0 rounded-2xl border border-honey/30 bg-honey/10 px-3 py-2">
                <AssetGenerateProgress compact startedAt={activeGenerateJob!.startedAt} />
              </div>
            ) : null}

            {existingSheet?.sourceUrl ? (
              <p className="shrink-0 rounded-2xl border border-honey/30 bg-honey/10 px-3 py-2 text-xs text-ink-soft">
                确认后将替换当前项目图集；已有 {existingSheet.regions.length} 个资产会被覆盖。
              </p>
            ) : null}

            {error ? (
              <p className="shrink-0 rounded-2xl border border-berry/30 bg-berry/10 px-3 py-2 text-sm text-berry">
                {error}
              </p>
            ) : null}
          </aside>

          <section className="flex min-h-0 flex-col gap-3 overflow-hidden px-6 py-4">
            {generating ? (
              <AssetGenerateProgress startedAt={activeGenerateJob?.startedAt ?? new Date().toISOString()} />
            ) : sourceUrl ? (
              <>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={addRegion}>
                    添加选区
                  </button>
                  <button className="btn-secondary" type="button" onClick={useWholeImage}>
                    整图共用
                  </button>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <AssetRegionPicker
                    className="min-h-0"
                    regions={regions}
                    selectedRegionId={selectedRegionId}
                    sourceUrl={sourceUrl}
                    onRegionsChange={setRegions}
                    onSelectRegion={setSelectedRegionId}
                  />
                  <AssetRegionSidebar
                    regions={regions}
                    selectedRegionId={selectedRegionId}
                    sourceUrl={sourceUrl}
                    onRegionsChange={setRegions}
                    onSelectRegion={setSelectedRegionId}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-paper-deep bg-white/40 p-12 text-center">
                <div>
                  <p className="text-4xl">🎲</p>
                  <p className="mt-3 text-sm font-bold text-ink">填写提示词并提交生图任务</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    任务在后台运行，完成后可框选多个资产或整图共用
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="flex shrink-0 gap-3 border-t border-paper-deep/70 px-6 py-4">
          <button
            className="btn-primary flex-1"
            disabled={saving || generating || !sourceUrl}
            type="button"
            onClick={() => void handleConfirm()}
          >
            {saving ? "保存中..." : "确认保存资产"}
          </button>
          <button className="btn-secondary" type="button" disabled={saving || generating} onClick={handleClose}>
            取消
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
