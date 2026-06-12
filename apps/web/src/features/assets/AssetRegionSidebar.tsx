import type { DraftRegion } from "./AssetRegionPicker";
import { AssetThumbnail } from "./AssetThumbnail";

interface AssetRegionSidebarProps {
  sourceUrl: string;
  regions: DraftRegion[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string | null) => void;
  onRegionsChange: (regions: DraftRegion[]) => void;
}

export function AssetRegionSidebar({
  sourceUrl,
  regions,
  selectedRegionId,
  onSelectRegion,
  onRegionsChange
}: AssetRegionSidebarProps) {
  const selectedRegion = regions.find((region) => region.id === selectedRegionId);

  function updateRegionLabel(regionId: string, label: string) {
    onRegionsChange(
      regions.map((region) => (region.id === regionId ? { ...region, label } : region))
    );
  }

  function removeRegion(regionId: string) {
    const next = regions.filter((region) => region.id !== regionId);
    if (selectedRegionId === regionId) {
      onSelectRegion(next[0]?.id ?? null);
    }
    onRegionsChange(next);
  }

  return (
    <aside className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-2xl border border-paper-deep bg-white/60 p-3">
      <p className="shrink-0 text-xs font-bold text-ink-soft">已框选 {regions.length} 个区域</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {regions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-paper-deep px-3 py-8 text-center text-xs text-ink-soft">
            在图片上拖拽绘制选区，或点击「整图共用」
          </p>
        ) : (
          <ul className="space-y-2">
            {regions.map((region) => (
              <li
                key={region.id}
                className={[
                  "rounded-2xl border p-2 transition",
                  selectedRegionId === region.id
                    ? "border-honey bg-honey/10"
                    : "border-paper-deep bg-white/80"
                ].join(" ")}
              >
                <button
                  className="flex w-full items-center gap-2 text-left"
                  type="button"
                  onClick={() => onSelectRegion(region.id)}
                >
                  <AssetThumbnail
                    region={{ ...region, role: "sprite_frame" }}
                    sourceUrl={sourceUrl}
                    className="h-12 w-12 shrink-0 rounded-xl border border-paper-deep bg-paper"
                  />
                  <span className="line-clamp-2 text-xs font-bold text-ink">
                    {region.label || "未命名"}
                  </span>
                </button>
                <input
                  className="field mt-2 py-2 text-xs"
                  value={region.label}
                  onChange={(event) => updateRegionLabel(region.id, event.target.value)}
                  placeholder="资产名称"
                />
                <button
                  className="mt-2 text-xs font-bold text-berry hover:underline"
                  type="button"
                  onClick={() => removeRegion(region.id)}
                >
                  删除选区
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selectedRegion ? (
        <p className="shrink-0 text-[11px] text-ink-soft/60">
          选中：{selectedRegion.label} — 拖拽移动，角点缩放
        </p>
      ) : null}
    </aside>
  );
}
