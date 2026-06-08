import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { ArtStyle } from "@story-maker/scene-schema";

import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { api, type ProjectListItem } from "@/lib/api";
import { formatDate } from "@/lib/format";

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [styles, setStyles] = useState<ArtStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectData, styleData] = await Promise.all([api.listProjects(), api.listArtStyles()]);
      setProjects(projectData);
      setStyles(styleData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载项目失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const styleMap = useMemo(() => new Map(styles.map((style) => [style.id, style.name])), [styles]);

  return (
    <div>
      <PageHeader
        eyebrow="Projects"
        title="绘本项目"
        description="从项目列表进入工作台，继续大纲对话、分页编辑、资产区域和预览调试。"
        actions={
          <Link className="btn-primary inline-flex" to="/projects/new">
            新建绘本
          </Link>
        }
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <Loading label="加载项目..." /> : null}

      {!loading && projects.length === 0 ? (
        <EmptyState
          title="还没有项目"
          description="用一个简略梗概和几个家庭角色开始，系统会生成 6-8 页 mock 大纲。"
          action={
            <Link className="btn-primary inline-flex" to="/projects/new">
              创建第一个项目
            </Link>
          }
        />
      ) : null}

      <div className="grid grid-cols-2 gap-5">
        {projects.map((project) => (
          <Link
            key={project.id}
            className="card group block transition hover:-translate-y-1 hover:border-honey"
            to={`/projects/${project.id}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-berry">
                  {project.pageCount} 页绘本
                </p>
                <h2 className="mt-3 text-2xl font-black text-ink group-hover:text-slate-900">
                  {project.title}
                </h2>
              </div>
              <span className="rounded-full bg-honey/20 px-3 py-1 text-xs font-bold text-amber-700">
                {styleMap.get(project.artStyleId) ?? "未知画风"}
              </span>
            </div>
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
              {project.brief ?? "打开工作台查看完整梗概与分页内容。"}
            </p>
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-400">
              <span>出场固定角色 {project.castCharacterIds?.length ?? 0} 个</span>
              <span>更新于 {formatDate(project.updatedAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
