import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { ArtStyle } from "@story-maker/scene-schema";

import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { api, type ProjectListItem } from "@/lib/api";
import { formatDate } from "@/lib/format";

const COVER_GRADIENTS = [
  "from-honey/35 via-coral/20 to-berry/15",
  "from-mint/30 via-honey/20 to-coral/15",
  "from-berry/25 via-honey/25 to-mint/20",
  "from-coral/30 via-berry/15 to-honey/25"
] as const;

const STAGGER_CLASSES = ["page-enter", "page-enter-delay-1", "page-enter-delay-2"] as const;

function getCoverGradient(index: number) {
  return COVER_GRADIENTS[index % COVER_GRADIENTS.length];
}

interface ProjectCardProps {
  project: ProjectListItem;
  styleName: string;
  previewUrl?: string;
  index: number;
}

function ProjectCard({ project, styleName, previewUrl, index }: ProjectCardProps) {
  const castCount = project.castCharacterIds?.length ?? 0;
  const gradient = getCoverGradient(index);
  const coverRadius =
    index % 2 === 0
      ? { borderTopLeftRadius: "2rem", borderTopRightRadius: "0.85rem" }
      : { borderTopLeftRadius: "0.85rem", borderTopRightRadius: "2rem" };

  return (
    <Link
      className={[
        "card card-hover group block overflow-hidden p-0",
        STAGGER_CLASSES[index % STAGGER_CLASSES.length]
      ].join(" ")}
      to={`/projects/${project.id}`}
    >
      <div
        className="relative aspect-[5/3] overflow-hidden border-b border-white/60"
        style={coverRadius}
      >
        {previewUrl ? (
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            src={previewUrl}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-ink/10 to-transparent" />

        <div
          aria-hidden
          className="absolute left-0 top-0 h-full w-3 bg-gradient-to-r from-ink/25 to-transparent"
        />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="badge badge-honey">{project.pageCount} 页</span>
          <span className="badge badge-mint">{castCount} 角色</span>
        </div>

        <span className="badge badge-berry absolute right-4 top-4 max-w-[9rem] truncate backdrop-blur-sm">
          {styleName}
        </span>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="font-display text-2xl font-black leading-tight text-white drop-shadow-sm transition group-hover:text-honey-light">
            {project.title}
          </h2>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rotate-12 rounded-sm bg-white/20 shadow-soft backdrop-blur-sm transition duration-300 group-hover:-right-4 group-hover:-top-4"
        />
      </div>

      <div className="space-y-4 p-5">
        <p className="line-clamp-2 text-sm leading-6 text-ink-soft">
          {project.brief ?? "打开工作台查看完整梗概与分页内容。"}
        </p>
        <div className="flex items-center justify-between border-t border-paper-deep/80 pt-4 text-xs font-semibold text-ink-soft/70">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="text-base">
              📖
            </span>
            绘本工作台
          </span>
          <time dateTime={project.updatedAt}>更新于 {formatDate(project.updatedAt)}</time>
        </div>
      </div>
    </Link>
  );
}

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

  const styleMap = useMemo(
    () => new Map(styles.map((style) => [style.id, { name: style.name, previewUrl: style.previewUrl }])),
    [styles]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Projects"
        title="绘本项目"
        description="从项目列表进入工作台，继续大纲对话、分页编辑、资产区域和预览调试。"
        actions={
          <Link className="btn-primary inline-flex items-center gap-2" to="/projects/new">
            <span aria-hidden>✦</span>
            新建绘本
          </Link>
        }
      />

      {error ? (
        <p className="page-enter-delay-1 mb-4 rounded-2xl border border-berry/20 bg-berry/10 p-3 text-sm text-berry">
          {error}
        </p>
      ) : null}
      {loading ? <Loading label="加载项目..." /> : null}

      {!loading && projects.length === 0 ? (
        <div className="page-enter-delay-1">
          <EmptyState
            icon="📚"
            title="还没有项目"
            description="用一个简略梗概和几个家庭角色开始，系统会生成 6-8 页分页大纲。"
            action={
              <Link className="btn-primary inline-flex" to="/projects/new">
                创建第一个项目
              </Link>
            }
          />
        </div>
      ) : null}

      {!loading && projects.length > 0 ? (
        <div className="grid grid-cols-2 gap-6">
          {projects.map((project, index) => {
            const style = styleMap.get(project.artStyleId);
            return (
              <ProjectCard
                key={project.id}
                index={index}
                previewUrl={style?.previewUrl}
                project={project}
                styleName={style?.name ?? "未知画风"}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
