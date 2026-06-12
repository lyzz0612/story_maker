import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import type {
  ArtStyle,
  ImageProviderConfig,
  LlmProviderConfig
} from "@story-maker/scene-schema";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { FormDialog } from "@/components/FormDialog";
import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { TabBar } from "@/components/TabBar";
import {
  api,
  makeId,
  type AboutInfo,
  type ArtStyleInput,
  type DeployStatus,
  type ProviderConfig,
  type ProviderKind
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { formatImageProvider, imageProviderOptions } from "@/lib/providerLabels";

type SettingsTab = "llm" | "image" | "styles" | "about";

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "llm", label: "LLM" },
  { id: "image", label: "生图模型" },
  { id: "styles", label: "画风" },
  { id: "about", label: "关于" }
];

const deployStatusLabels: Record<DeployStatus, string> = {
  idle: "空闲",
  running: "更新中",
  succeeded: "已完成",
  failed: "失败"
};

const styleSwatchPalettes = [
  "from-honey/75 via-berry/35 to-mint/55",
  "from-berry/55 via-honey/45 to-mint/65",
  "from-mint/65 via-honey/35 to-berry/45",
  "from-honey/55 via-mint/45 to-berry/35",
  "from-berry/40 via-mint/50 to-honey/60"
] as const;

function hashSeed(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function styleSwatchMeta(style: Pick<ArtStyle, "name" | "promptSuffix">) {
  const seed = hashSeed(`${style.name}|${style.promptSuffix}`);
  const letter = (style.name.trim() || style.promptSuffix.trim() || "?")[0]?.toUpperCase() ?? "?";
  return {
    gradient: styleSwatchPalettes[seed % styleSwatchPalettes.length],
    letter
  };
}

function formatProviderLabel(kind: ProviderKind, provider: string): string {
  return kind === "llm" ? "OpenAI" : formatImageProvider(provider);
}

function createProviderDraft<T extends ProviderConfig>(kind: ProviderKind, hasDefault: boolean): T {
  const now = new Date().toISOString();
  return {
    id: makeId(kind),
    name: "",
    provider: kind === "llm" ? "openai-compatible" : "fal",
    baseUrl: "",
    apiKey: "",
    model: "",
    isDefault: !hasDefault,
    createdAt: now,
    updatedAt: now
  } as T;
}

function normalizeDefault<T extends ProviderConfig>(configs: T[], defaultId?: string) {
  if (configs.length === 0) {
    return configs;
  }

  const nextDefaultId = defaultId ?? configs.find((config) => config.isDefault)?.id ?? configs[0]?.id;
  return configs.map((config) => ({ ...config, isDefault: config.id === nextDefaultId }));
}

interface ProviderManagerProps {
  kind: ProviderKind;
  title: string;
  description: string;
}

function ProviderManager<T extends ProviderConfig>({
  kind,
  title,
  description
}: ProviderManagerProps) {
  const [configs, setConfigs] = useState<T[]>([]);
  const [draft, setDraft] = useState<T>(() => createProviderDraft<T>(kind, false));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardMessage, setGuardMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProviderConfigs<T>(kind);
      setConfigs(normalizeDefault(data));
      setDraft(createProviderDraft<T>(kind, data.some((config) => config.isDefault)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载配置失败");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  async function persist(next: T[]) {
    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveProviderConfigs<T>(kind, normalizeDefault(next));
      setConfigs(normalizeDefault(saved));
      setDraft(createProviderDraft<T>(kind, saved.some((config) => config.isDefault)));
      setEditingId(null);
      setFormOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存配置失败");
    } finally {
      setSaving(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setDraft(createProviderDraft<T>(kind, configs.some((config) => config.isDefault)));
    setFormOpen(true);
  }

  function startEdit(config: T) {
    setEditingId(config.id);
    setDraft({ ...config });
    setFormOpen(true);
  }

  function closeForm() {
    setEditingId(null);
    setDraft(createProviderDraft<T>(kind, configs.some((config) => config.isDefault)));
    setFormOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = { ...draft, name: draft.name.trim(), model: draft.model.trim() };
    const exists = configs.some((config) => config.id === trimmed.id);
    const next = exists
      ? configs.map((config) => (config.id === trimmed.id ? trimmed : config))
      : [...configs, trimmed];
    await persist(normalizeDefault(next, trimmed.isDefault ? trimmed.id : undefined));
  }

  function requestDelete(config: T) {
    if (config.isDefault) {
      setGuardMessage(`“${config.name}” 是当前默认项，请先将其他配置设为默认后再删除。`);
      return;
    }
    setDeleteTarget(config);
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    await persist(configs.filter((config) => config.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  async function makeDefault(config: T) {
    await persist(normalizeDefault(configs, config.id));
  }

  return (
    <div className="page-enter-delay-2">
      <section className="card">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-paper-deep/60 pb-5">
          <div>
            <p className="eyebrow mb-2">工具面板</p>
            <h2 className="font-display text-2xl font-black text-ink">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{description}</p>
          </div>
          <button className="btn-primary shrink-0" type="button" onClick={startCreate}>
            新增配置
          </button>
        </div>

        {loading ? <Loading label="加载模型配置..." /> : null}
        {error ? (
          <p className="mb-4 rounded-2xl border border-berry/20 bg-berry/10 p-3 text-sm font-semibold text-berry">
            {error}
          </p>
        ) : null}
        {guardMessage ? (
          <p className="mb-4 rounded-2xl border border-honey/30 bg-honey/15 p-3 text-sm font-semibold text-amber-800">
            {guardMessage}
          </p>
        ) : null}

        {!loading && configs.length === 0 ? (
          <EmptyState
            icon="🛠"
            title="还没有配置"
            description="添加模型配置后，新建故事时即可选择。"
            action={
              <button className="btn-primary" type="button" onClick={startCreate}>
                添加第一个配置
              </button>
            }
          />
        ) : null}

        <div className="grid gap-4">
          {configs.map((config) => (
            <article
              key={config.id}
              className={[
                "card card-hover overflow-hidden p-0",
                config.isDefault ? "ring-2 ring-mint/40 ring-offset-2 ring-offset-white/80" : ""
              ].join(" ")}
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 gap-4">
                  <div
                    aria-hidden
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-honey/30 via-berry/15 to-mint/25 text-xl"
                  >
                    {kind === "llm" ? "✎" : "🖼"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-black text-ink">
                        {config.name || "未命名配置"}
                      </h3>
                      {config.isDefault ? <span className="badge badge-mint">默认</span> : null}
                      <span className="badge badge-honey">
                        {formatProviderLabel(kind, config.provider)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-semibold text-ink">
                      {config.model || "未填写 model"}
                    </p>
                    <p className="mt-1.5 truncate text-xs text-ink-soft">
                      {config.baseUrl || "未填写 baseUrl"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {!config.isDefault ? (
                    <button className="btn-secondary" type="button" onClick={() => void makeDefault(config)}>
                      设默认
                    </button>
                  ) : null}
                  <button className="btn-secondary" type="button" onClick={() => startEdit(config)}>
                    编辑
                  </button>
                  <button className="btn-danger" type="button" onClick={() => requestDelete(config)}>
                    删除
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FormDialog
        open={formOpen}
        title={editingId ? "编辑配置" : "新增配置"}
        onClose={closeForm}
      >
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-4">
            <p className="eyebrow">基本信息</p>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-ink-soft">名称</span>
              <input
                required
                className="field"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="如：本地 OpenAI 兼容接口"
              />
            </label>
            {kind === "image" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-ink-soft">Provider</span>
                <select
                  className="field"
                  value={draft.provider}
                  onChange={(event) => setDraft({ ...draft, provider: event.target.value as T["provider"] })}
                >
                  {imageProviderOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatImageProvider(option)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-ink-soft">Model</span>
              <input
                required
                className="field"
                value={draft.model}
                onChange={(event) => setDraft({ ...draft, model: event.target.value })}
                placeholder={kind === "llm" ? "gpt-4.1-mini" : "flux-dev"}
              />
            </label>
          </div>

          <div className="panel space-y-4">
            <div>
              <p className="font-display text-sm font-black text-ink">连接凭证</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Base URL 与 API Key 仅保存在本地，不会上传到云端。
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-ink-soft">Base URL</span>
              <input
                className="field"
                value={draft.baseUrl}
                onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
                placeholder="https://example.test/v1"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-ink-soft">API Key</span>
              <input
                className="field"
                value={draft.apiKey}
                onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
                placeholder="sk-..."
                type="password"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-paper-deep/80 bg-paper/60 p-3 text-sm font-semibold text-ink-soft">
            <input
              checked={draft.isDefault}
              type="checkbox"
              onChange={(event) => setDraft({ ...draft, isDefault: event.target.checked })}
            />
            保存后设为默认
          </label>
          <div className="flex gap-3">
            <button className="btn-primary flex-1" disabled={saving} type="submit">
              {saving ? "保存中..." : "保存"}
            </button>
            <button className="btn-secondary" type="button" onClick={closeForm}>
              取消
            </button>
          </div>
        </form>
      </FormDialog>

      <ConfirmDialog
        danger
        open={Boolean(deleteTarget)}
        title="删除模型配置？"
        description={`确认删除“${deleteTarget?.name ?? ""}”？删除后新建项目将无法再选用该配置。`}
        confirmLabel="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function createStyleDraft(): ArtStyleInput {
  return {
    name: "",
    description: "",
    promptSuffix: ""
  };
}

function ArtStyleManager() {
  const [styles, setStyles] = useState<ArtStyle[]>([]);
  const [draft, setDraft] = useState<ArtStyleInput>(createStyleDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArtStyle | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStyles(await api.listArtStyles());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载画风失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setDraft(createStyleDraft());
    setPreviewUrl(null);
    setFormOpen(true);
  }

  function startEdit(style: ArtStyle) {
    setEditingId(style.id);
    setDraft({
      name: style.name,
      description: style.description,
      promptSuffix: style.promptSuffix
    });
    setPreviewUrl(style.previewUrl ?? null);
    setFormOpen(true);
  }

  function closeForm() {
    setEditingId(null);
    setDraft(createStyleDraft());
    setPreviewUrl(null);
    setFormOpen(false);
  }

  function canGeneratePreview(input: ArtStyleInput) {
    return Boolean(input.name.trim() && input.description.trim() && input.promptSuffix.trim());
  }

  async function generateFormPreview() {
    if (!canGeneratePreview(draft)) {
      setError("请先填写名称、描述与 Prompt 片段");
      return;
    }
    setGeneratingPreview(true);
    setError(null);
    try {
      const result = await api.previewArtStyleDraft(draft);
      setPreviewUrl(result.previewUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成预览图失败");
    } finally {
      setGeneratingPreview(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: ArtStyleInput = { ...draft, previewUrl: previewUrl ?? undefined };
      if (editingId) {
        await api.updateArtStyle(editingId, payload);
      } else {
        await api.createArtStyle(payload);
      }
      closeForm();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存画风失败");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    await api.deleteArtStyle(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  }

  const draftSwatch = styleSwatchMeta(draft);

  return (
    <div className="page-enter-delay-2">
      <section className="card">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-paper-deep/60 pb-5">
          <div>
            <p className="eyebrow mb-2">风格画廊</p>
            <h2 className="font-display text-2xl font-black text-ink">画风预设</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              维护画风描述与 prompt 片段，在编辑弹窗中生成预览图。
            </p>
          </div>
          <button className="btn-primary shrink-0" type="button" onClick={startCreate}>
            新增画风
          </button>
        </div>
        {loading ? <Loading label="加载画风..." /> : null}
        {error && !formOpen ? (
          <p className="mb-4 rounded-2xl border border-berry/20 bg-berry/10 p-3 text-sm font-semibold text-berry">
            {error}
          </p>
        ) : null}
        {!loading && styles.length === 0 ? (
          <EmptyState
            icon="🎨"
            title="还没有画风"
            description="请先手动新增一个画风，为故事配图定下视觉基调。"
            action={
              <button className="btn-primary" type="button" onClick={startCreate}>
                创建第一个画风
              </button>
            }
          />
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {styles.map((style) => {
            const swatch = styleSwatchMeta(style);
            return (
              <article
                key={style.id}
                className="card card-hover group overflow-hidden p-0 transition duration-300"
              >
                <div className={`relative aspect-[5/3] overflow-hidden bg-gradient-to-br ${swatch.gradient}`}>
                  {style.previewUrl ? (
                    <img
                      alt={style.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      src={style.previewUrl}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-display text-5xl font-black text-white/90 drop-shadow-md">
                        {swatch.letter}
                      </span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/35 to-transparent" />
                  <h3 className="absolute bottom-3 left-4 font-display text-lg font-black text-white drop-shadow">
                    {style.name}
                  </h3>
                </div>
                <div className="space-y-3 p-4">
                  <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">{style.description}</p>
                  <p className="line-clamp-2 rounded-2xl border border-paper-deep/70 bg-paper/70 px-3 py-2 font-mono text-xs leading-5 text-ink-soft">
                    {style.promptSuffix}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button className="btn-secondary flex-1" type="button" onClick={() => startEdit(style)}>
                      编辑
                    </button>
                    <button className="btn-danger" type="button" onClick={() => setDeleteTarget(style)}>
                      删除
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <FormDialog
        open={formOpen}
        title={editingId ? "编辑画风" : "新增画风"}
        onClose={closeForm}
      >
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          {error && formOpen ? (
            <p className="rounded-2xl border border-berry/20 bg-berry/10 p-3 text-sm font-semibold text-berry">
              {error}
            </p>
          ) : null}

          <div className="space-y-4">
            <p className="eyebrow">画风信息</p>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-ink-soft">名称</span>
              <input
                required
                className="field"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="温暖水彩"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-ink-soft">描述</span>
              <textarea
                required
                className="field min-h-24"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="柔和边缘、温暖光线，适合睡前绘本"
              />
            </label>
          </div>

          <div className="panel space-y-4">
            <div>
              <p className="font-display text-sm font-black text-ink">Prompt 片段</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                生图时会自动拼接到每页 prompt 末尾，请使用英文关键词。
              </p>
            </div>
            <textarea
              required
              className="field min-h-32"
              value={draft.promptSuffix}
              onChange={(event) => setDraft({ ...draft, promptSuffix: event.target.value })}
              placeholder="warm watercolor, soft light, picture book style"
            />
          </div>

          <div className="panel space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-sm font-black text-ink">预览图</p>
                <p className="mt-1 text-xs text-ink-soft">填写完整信息后可生成样张</p>
              </div>
              <button
                className="btn-secondary shrink-0"
                disabled={generatingPreview || !canGeneratePreview(draft)}
                type="button"
                onClick={() => void generateFormPreview()}
              >
                {generatingPreview ? "生成中..." : "生成预览图"}
              </button>
            </div>
            <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${draftSwatch.gradient}`}>
              {previewUrl ? (
                <img alt="画风预览" className="aspect-[16/9] w-full object-cover" src={previewUrl} />
              ) : (
                <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 px-6 text-center">
                  <span className="font-display text-4xl font-black text-white/85 drop-shadow">
                    {draftSwatch.letter}
                  </span>
                  <p className="text-sm font-semibold text-white/80">填写描述后点击「生成预览图」</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn-primary flex-1" disabled={saving} type="submit">
              {saving ? "保存中..." : "保存画风"}
            </button>
            <button className="btn-secondary" type="button" onClick={closeForm}>
              取消
            </button>
          </div>
        </form>
      </FormDialog>

      <ConfirmDialog
        danger
        open={Boolean(deleteTarget)}
        title="删除画风？"
        description={`确认删除“${deleteTarget?.name ?? ""}”？已创建项目仍会保留原 artStyleId。`}
        confirmLabel="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function AboutPanel() {
  const [about, setAbout] = useState<AboutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAbout(await api.getAbout());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载应用信息失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (about?.deploy.state.status !== "running") {
      return;
    }

    const timer = window.setInterval(() => {
      void load();
    }, 2000);

    return () => window.clearInterval(timer);
  }, [about?.deploy.state.status, load]);

  async function handleUpdate() {
    setUpdating(true);
    setError(null);
    try {
      const result = await api.triggerDeployUpdate();
      if (!result.accepted) {
        setError(result.reason ?? "已有更新任务在运行");
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "触发更新失败");
    } finally {
      setUpdating(false);
      setConfirmOpen(false);
    }
  }

  const deployState = about?.deploy.state;
  const canUpdate = about?.deploy.available && deployState?.status !== "running";

  return (
    <div className="page-enter-delay-2">
      <section className="card">
        <div className="mb-6 border-b border-paper-deep/60 pb-5">
          <p className="eyebrow mb-2">应用信息</p>
          <h2 className="font-display text-2xl font-black text-ink">关于 Story Maker</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            查看当前版本，并在服务器上手动拉取最新代码并重新部署。
          </p>
        </div>

        {loading ? <Loading label="加载应用信息..." /> : null}
        {error ? (
          <p className="mb-4 rounded-2xl border border-berry/20 bg-berry/10 p-3 text-sm font-semibold text-berry">
            {error}
          </p>
        ) : null}

        {about ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="panel space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">应用</p>
                <p className="mt-2 font-display text-3xl font-black text-ink">{about.name}</p>
              </div>
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4 border-b border-paper-deep/50 pb-3">
                  <dt className="font-semibold text-ink-soft">版本</dt>
                  <dd className="font-mono font-bold text-ink">v{about.version}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-paper-deep/50 pb-3">
                  <dt className="font-semibold text-ink-soft">手动更新</dt>
                  <dd className="font-semibold text-ink">
                    {about.deploy.available ? "已启用" : "未启用"}
                  </dd>
                </div>
                {about.deploy.branch ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-semibold text-ink-soft">部署分支</dt>
                    <dd className="font-mono text-sm font-bold text-ink">{about.deploy.branch}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="panel space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-sm font-black text-ink">更新状态</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                    从 Git 拉取代码、构建并通过 pm2 重新加载服务。
                  </p>
                </div>
                <span
                  className={[
                    "badge",
                    deployState?.status === "running"
                      ? "badge-honey"
                      : deployState?.status === "failed"
                        ? "badge-berry"
                        : deployState?.status === "succeeded"
                          ? "badge-mint"
                          : ""
                  ].join(" ")}
                >
                  {deployState ? deployStatusLabels[deployState.status] : "未知"}
                </span>
              </div>

              <dl className="grid gap-2 rounded-2xl border border-paper-deep/70 bg-paper/60 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">最近开始</dt>
                  <dd className="font-semibold text-ink">{formatDate(deployState?.startedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">最近结束</dt>
                  <dd className="font-semibold text-ink">{formatDate(deployState?.finishedAt)}</dd>
                </div>
                {deployState?.error ? (
                  <div className="border-t border-paper-deep/60 pt-3">
                    <dt className="mb-1 text-ink-soft">错误信息</dt>
                    <dd className="font-mono text-xs leading-5 text-berry">{deployState.error}</dd>
                  </div>
                ) : null}
              </dl>

              {!about.deploy.available ? (
                <p className="rounded-2xl border border-paper-deep/80 bg-paper/70 p-3 text-sm leading-relaxed text-ink-soft">
                  当前环境未开启手动更新。在 VPS 上设置{" "}
                  <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">DEPLOY_ENABLED=true</code>{" "}
                  后即可在此触发部署。
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  className="btn-primary"
                  disabled={!canUpdate || updating}
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                >
                  {updating || deployState?.status === "running" ? "更新中..." : "手动更新"}
                </button>
                <button className="btn-secondary" type="button" onClick={() => void load()}>
                  刷新状态
                </button>
              </div>

              {deployState?.status === "succeeded" ? (
                <p className="text-xs leading-relaxed text-ink-soft">
                  更新完成后服务会自动重载。若页面异常，请手动刷新浏览器。
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="开始手动更新？"
        description="将从远程仓库拉取最新代码、执行构建并重启服务。更新期间创作功能可能短暂不可用。"
        confirmLabel="开始更新"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleUpdate()}
      />
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("llm");
  const activeTitle = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.label ?? "设置", [activeTab]);

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="设置"
        description="管理 LLM、生图模型与画风预设 — 像整理工作室工具台一样配置你的创作引擎。"
      />
      <TabBar className="mb-6" tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "llm" ? (
        <ProviderManager<LlmProviderConfig>
          kind="llm"
          title={`${activeTitle} 配置`}
          description="故事大纲、对话改写等功能会引用默认 LLM 配置。"
        />
      ) : null}
      {activeTab === "image" ? (
        <ProviderManager<ImageProviderConfig>
          kind="image"
          title={`${activeTitle}配置`}
          description="页面配图生成会引用默认或项目指定的生图配置。"
        />
      ) : null}
      {activeTab === "styles" ? <ArtStyleManager /> : null}
      {activeTab === "about" ? <AboutPanel /> : null}
    </div>
  );
}
