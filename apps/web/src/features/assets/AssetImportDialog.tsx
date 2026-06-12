import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";

import type { AssetRegion, AssetSheet } from "@story-maker/scene-schema";

import {
  AssetRegionPicker,
  createDraftRegionId,
  type DraftRegion
} from "./AssetRegionPicker";
import { AssetRegionSidebar } from "./AssetRegionSidebar";

interface AssetImportDialogProps {
  open: boolean;
  existingSheet: AssetSheet | null;
  onClose: () => void;
  onConfirm: (file: File, regions: AssetRegion[]) => Promise<void>;
}

export function AssetImportDialog({
  open,
  existingSheet,
  onClose,
  onConfirm
}: AssetImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [regions, setRegions] = useState<DraftRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setSourceFile(null);
    setRegions([]);
    setSelectedRegionId(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  useEffect(() => {
    if (!sourceFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(sourceFile);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [sourceFile]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    setSourceFile(file);
    setRegions([]);
    setSelectedRegionId(null);
    setError(null);
    event.target.value = "";
  }

  async function handleConfirm() {
    if (!sourceFile || !previewUrl) {
      setError("请先导入图片");
      return;
    }
    if (regions.length === 0) {
      setError("请至少框选一个区域");
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
      await onConfirm(sourceFile, assetRegions);
      reset();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "导入失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/45 p-3 backdrop-blur-sm sm:p-5"
      onClick={handleClose}
    >
      <div
        className="flex h-[min(92vh,900px)] w-[min(96vw,1400px)] flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-paper shadow-lift"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-import-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-paper-deep/70 px-6 py-5">
          <div>
            <h2 id="asset-import-title" className="font-display text-xl font-black text-ink">
              导入图集并框选资产
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              上传图集后在画布上框选区域，支持缩放与滚动查看大图细节。
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

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
          {existingSheet?.sourceUrl ? (
            <p className="shrink-0 rounded-2xl border border-honey/30 bg-honey/10 px-3 py-2 text-xs text-ink-soft">
              确认后将替换当前项目图集；已有 {existingSheet.regions.length} 个资产会被覆盖。
            </p>
          ) : null}

          <div className="flex shrink-0 flex-wrap gap-2">
            <input
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              type="file"
              onChange={handleFileChange}
            />
            <button className="btn-secondary" type="button" onClick={() => fileInputRef.current?.click()}>
              {sourceFile ? "重新选择图片" : "选择图片"}
            </button>
            {previewUrl ? (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  const region: DraftRegion = {
                    id: createDraftRegionId(),
                    rect: { x: 0.1, y: 0.1, w: 0.25, h: 0.25 },
                    label: `资产 ${regions.length + 1}`
                  };
                  setRegions((current) => [...current, region]);
                  setSelectedRegionId(region.id);
                }}
              >
                添加选区
              </button>
            ) : null}
            {previewUrl ? (
              <button className="btn-secondary" type="button" onClick={() => {
                const region: DraftRegion = {
                  id: createDraftRegionId(),
                  rect: { x: 0, y: 0, w: 1, h: 1 },
                  label: "共用图集"
                };
                setRegions([region]);
                setSelectedRegionId(region.id);
              }}>
                整图共用
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="shrink-0 rounded-2xl border border-berry/30 bg-berry/10 px-3 py-2 text-sm text-berry">
              {error}
            </p>
          ) : null}

          {previewUrl ? (
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <AssetRegionPicker
                className="min-h-[min(60vh,640px)]"
                regions={regions}
                selectedRegionId={selectedRegionId}
                sourceUrl={previewUrl}
                onRegionsChange={setRegions}
                onSelectRegion={setSelectedRegionId}
              />
              <AssetRegionSidebar
                regions={regions}
                selectedRegionId={selectedRegionId}
                sourceUrl={previewUrl}
                onRegionsChange={setRegions}
                onSelectRegion={setSelectedRegionId}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-paper-deep bg-white/40 p-12 text-center">
              <div>
                <p className="text-4xl">🖼</p>
                <p className="mt-3 text-sm font-bold text-ink">选择一张图集开始框选</p>
                <p className="mt-1 text-xs text-ink-soft">支持大尺寸图片，导入后可缩放查看细节</p>
              </div>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 gap-3 border-t border-paper-deep/70 px-6 py-4">
          <button
            className="btn-primary flex-1"
            disabled={saving}
            type="button"
            onClick={() => void handleConfirm()}
          >
            {saving ? "上传并保存..." : "确认导入并截图"}
          </button>
          <button className="btn-secondary" type="button" disabled={saving} onClick={handleClose}>
            取消
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "asset";
}
