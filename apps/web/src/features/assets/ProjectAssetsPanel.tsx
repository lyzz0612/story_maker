import { useCallback, useEffect, useState } from "react";

import type { AssetRegion, AssetSheet, Project } from "@story-maker/scene-schema";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { FormDialog } from "@/components/FormDialog";
import { Loading } from "@/components/Loading";
import { api, type AssetGenerateJob } from "@/lib/api";

import { AddAssetDialog } from "./AddAssetDialog";
import { AssetGenerateProgress } from "./AssetGenerateProgress";
import { AssetImportDialog } from "./AssetImportDialog";
import { AssetThumbnail } from "./AssetThumbnail";

interface ProjectAssetsPanelProps {
  project: Project;
  onAssetSheetUpdated: (assetSheet: AssetSheet) => void;
}

function emptyAssetSheet(): AssetSheet {
  return {
    sourceUrl: "",
    regions: [],
    sequences: {},
    updatedAt: new Date().toISOString()
  };
}

export function ProjectAssetsPanel({ project, onAssetSheetUpdated }: ProjectAssetsPanelProps) {
  const [assetSheet, setAssetSheet] = useState<AssetSheet>(emptyAssetSheet());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editRegion, setEditRegion] = useState<AssetRegion | null>(null);
  const [deleteRegion, setDeleteRegion] = useState<AssetRegion | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [activeGenerateJob, setActiveGenerateJob] = useState<AssetGenerateJob | null>(null);

  const loadSheet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sheet = await api.getAssetSheet(project.id);
      setAssetSheet(sheet ?? emptyAssetSheet());
    } catch (reason) {
      setAssetSheet(project.assetSheet ?? emptyAssetSheet());
      if (reason instanceof Error && !reason.message.includes("404")) {
        setError(reason.message);
      }
    } finally {
      setLoading(false);
    }
  }, [project.assetSheet, project.id]);

  useEffect(() => {
    void loadSheet();
  }, [loadSheet]);

  useEffect(() => {
    if (!activeGenerateJob || activeGenerateJob.status === "succeeded" || activeGenerateJob.status === "failed") {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const next = await api.getProjectAssetGenerateJob(project.id, activeGenerateJob.id);
        if (!cancelled) {
          setActiveGenerateJob(next);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "查询生图任务失败");
        }
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeGenerateJob?.id, activeGenerateJob?.status, project.id]);

  async function persistSheet(next: AssetSheet) {
    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveAssetSheet(project.id, next);
      setAssetSheet(saved);
      onAssetSheetUpdated(saved);
      return saved;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "保存资产失败";
      setError(message);
      throw reason instanceof Error ? reason : new Error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleImportConfirm(file: File, regions: AssetRegion[]) {
    const { sourceUrl } = await api.uploadAssetSheetSource(project.id, file);
    const sequences = regions.reduce<AssetSheet["sequences"]>((acc, region) => {
      const sequenceId = region.sequenceId ?? region.id;
      acc[sequenceId] = { frames: [], fps: 6, loop: true };
      return acc;
    }, {});

    await persistSheet({
      ...assetSheet,
      sourceUrl,
      regions,
      sequences,
      updatedAt: new Date().toISOString()
    });
  }

  async function handleGeneratedAssetConfirm(sourceUrl: string, regions: AssetRegion[]) {
    const sequences = regions.reduce<AssetSheet["sequences"]>((acc, region) => {
      const sequenceId = region.sequenceId ?? region.id;
      acc[sequenceId] = { frames: [], fps: 6, loop: true };
      return acc;
    }, {});

    await persistSheet({
      ...assetSheet,
      sourceUrl,
      regions,
      sequences,
      updatedAt: new Date().toISOString()
    });
  }

  async function handleRenameRegion() {
    if (!editRegion || !editLabel.trim()) {
      return;
    }
    const nextRegions = assetSheet.regions.map((region) =>
      region.id === editRegion.id ? { ...region, label: editLabel.trim() } : region
    );
    setEditRegion(null);
    await persistSheet({ ...assetSheet, regions: nextRegions, updatedAt: new Date().toISOString() });
  }

  async function confirmDeleteRegion() {
    if (!deleteRegion) {
      return;
    }
    const nextRegions = assetSheet.regions.filter((region) => region.id !== deleteRegion.id);
    setDeleteRegion(null);
    await persistSheet({ ...assetSheet, regions: nextRegions, updatedAt: new Date().toISOString() });
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Assets</p>
          <h2 className="font-display text-xl font-black text-ink">项目资产库</h2>
          <p className="mt-1 text-sm text-ink-soft">
            全绘本共用的角色与素材切片，各分页预览与场景均可引用。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" type="button" onClick={() => setImportOpen(true)}>
            导入图集
          </button>
          <button className="btn-primary" type="button" onClick={() => setAddOpen(true)}>
            AI 生成资产
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-berry/30 bg-berry/10 px-3 py-2 text-sm text-berry">
          {error}
        </p>
      ) : null}

      {activeGenerateJob &&
      (activeGenerateJob.status === "queued" || activeGenerateJob.status === "running") ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3">
          <AssetGenerateProgress compact startedAt={activeGenerateJob.startedAt} />
          <button className="btn-secondary shrink-0" type="button" onClick={() => setAddOpen(true)}>
            查看进度
          </button>
        </div>
      ) : null}

      {activeGenerateJob?.status === "succeeded" && !addOpen ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 border-mint/40 bg-mint/10">
          <p className="text-sm font-bold text-ink">AI 生图已完成，可以继续框选资产</p>
          <div className="flex gap-2">
            <button className="btn-primary" type="button" onClick={() => setAddOpen(true)}>
              继续框选
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => setActiveGenerateJob(null)}
            >
              忽略
            </button>
          </div>
        </div>
      ) : null}

      {activeGenerateJob?.status === "failed" ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 border-berry/30 bg-berry/10">
          <p className="text-sm text-berry">{activeGenerateJob.error ?? "AI 生图失败"}</p>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => setActiveGenerateJob(null)}
          >
            关闭
          </button>
        </div>
      ) : null}

      {loading ? <Loading label="加载资产..." /> : null}

      {!loading && assetSheet.regions.length === 0 ? (
        <EmptyState
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn-primary" type="button" onClick={() => setImportOpen(true)}>
                导入图集
              </button>
              <button className="btn-secondary" type="button" onClick={() => setAddOpen(true)}>
                AI 生成资产
              </button>
            </div>
          }
          description="AI 生成图集并框选资产，或导入已有图集。"
          icon="🧩"
          title="还没有资产"
        />
      ) : null}

      {!loading && assetSheet.regions.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 pb-4 md:grid-cols-3 xl:grid-cols-4">
          {assetSheet.regions.map((region, index) => (
            <article
              key={region.id}
              className="card card-hover overflow-hidden p-0"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex aspect-square items-center justify-center border-b border-paper-deep/60 bg-paper/50 p-3">
                <AssetThumbnail
                  alt={region.label}
                  region={region}
                  sourceUrl={assetSheet.sourceUrl}
                  className="max-h-full max-w-full rounded-xl"
                />
              </div>
              <div className="p-4">
                <h3 className="font-display text-base font-black text-ink">
                  {region.label || "未命名资产"}
                </h3>
                <p className="mt-1 text-xs text-ink-soft">
                  {Math.round(region.rect.w * 100)}% × {Math.round(region.rect.h * 100)}% 选区
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    className="btn-secondary flex-1 py-2 text-xs"
                    type="button"
                    onClick={() => {
                      setEditRegion(region);
                      setEditLabel(region.label ?? "");
                    }}
                  >
                    重命名
                  </button>
                  <button
                    className="btn-danger py-2 text-xs"
                    type="button"
                    onClick={() => setDeleteRegion(region)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {saving ? <p className="text-center text-xs font-semibold text-ink-soft">保存中...</p> : null}

      <AssetImportDialog
        existingSheet={assetSheet.regions.length > 0 ? assetSheet : null}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onConfirm={handleImportConfirm}
      />

      <AddAssetDialog
        activeGenerateJob={activeGenerateJob}
        existingSheet={assetSheet.regions.length > 0 ? assetSheet : null}
        open={addOpen}
        project={project}
        onActiveGenerateJobChange={setActiveGenerateJob}
        onClose={() => setAddOpen(false)}
        onConfirm={handleGeneratedAssetConfirm}
      />

      <FormDialog
        open={Boolean(editRegion)}
        title="重命名资产"
        onClose={() => setEditRegion(null)}
      >
        <div className="space-y-4">
          <input
            autoFocus
            className="field"
            value={editLabel}
            onChange={(event) => setEditLabel(event.target.value)}
            placeholder="资产名称"
          />
          <div className="flex gap-3">
            <button
              className="btn-primary flex-1"
              disabled={!editLabel.trim()}
              type="button"
              onClick={() => void handleRenameRegion()}
            >
              保存
            </button>
            <button className="btn-secondary" type="button" onClick={() => setEditRegion(null)}>
              取消
            </button>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        danger
        confirmLabel="删除"
        description={`确认删除资产「${deleteRegion?.label ?? ""}」？`}
        open={Boolean(deleteRegion)}
        title="删除资产？"
        onCancel={() => setDeleteRegion(null)}
        onConfirm={() => void confirmDeleteRegion()}
      />
    </section>
  );
}
