import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import type {
  ArtStyle,
  ImageProviderConfig,
  LlmProviderConfig
} from "@story-maker/scene-schema";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { api, makeId, type ArtStyleInput, type ProviderConfig, type ProviderKind } from "@/lib/api";

type SettingsTab = "llm" | "image" | "styles";

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "llm", label: "LLM" },
  { id: "image", label: "生图模型" },
  { id: "styles", label: "画风" }
];

const providerOptions = {
  llm: ["openai-compatible", "custom"],
  image: ["fal", "replicate", "openai-compatible", "custom"]
} as const;

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

  const options = providerOptions[kind];

  async function persist(next: T[]) {
    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveProviderConfigs<T>(kind, normalizeDefault(next));
      setConfigs(normalizeDefault(saved));
      setDraft(createProviderDraft<T>(kind, saved.some((config) => config.isDefault)));
      setEditingId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存配置失败");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(config: T) {
    setEditingId(config.id);
    setDraft({ ...config });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(createProviderDraft<T>(kind, configs.some((config) => config.isDefault)));
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
    <div className="grid grid-cols-[1fr_360px] gap-6">
      <section className="card">
        <div className="mb-5">
          <h2 className="text-xl font-black text-ink">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        {loading ? <Loading label="加载模型配置..." /> : null}
        {error ? <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {guardMessage ? (
          <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
            {guardMessage}
          </p>
        ) : null}

        {!loading && configs.length === 0 ? (
          <EmptyState title="还没有配置" description="添加一个 mock 模型配置后，新建故事时即可选择。" />
        ) : null}

        <div className="space-y-3">
          {configs.map((config) => (
            <article key={config.id} className="rounded-3xl border border-slate-100 bg-paper p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-ink">{config.name || "未命名配置"}</h3>
                    {config.isDefault ? (
                      <span className="rounded-full bg-mint/20 px-2 py-1 text-xs font-bold text-emerald-700">
                        默认
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {config.provider} / {config.model || "未填写 model"}
                  </p>
                  <p className="mt-2 break-all text-xs text-slate-400">{config.baseUrl || "未填写 baseUrl"}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
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

      <aside className="card">
        <h2 className="text-lg font-black text-ink">{editingId ? "编辑配置" : "新增配置"}</h2>
        <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-600">名称</span>
            <input
              required
              className="field"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="如：本地 OpenAI 兼容接口"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-600">Provider</span>
            <select
              className="field"
              value={draft.provider}
              onChange={(event) => setDraft({ ...draft, provider: event.target.value as T["provider"] })}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-600">Base URL</span>
            <input
              className="field"
              value={draft.baseUrl}
              onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
              placeholder="https://example.test/v1"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-600">API Key</span>
            <input
              className="field"
              value={draft.apiKey}
              onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
              placeholder="mock-key"
              type="password"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-600">Model</span>
            <input
              required
              className="field"
              value={draft.model}
              onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              placeholder={kind === "llm" ? "gpt-4.1-mini" : "flux-dev"}
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-paper p-3 text-sm font-semibold text-slate-600">
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
            <button className="btn-secondary" type="button" onClick={resetForm}>
              重置
            </button>
          </div>
        </form>
      </aside>

      <ConfirmDialog
        danger
        open={Boolean(deleteTarget)}
        title="删除模型配置？"
        description={`确认删除“${deleteTarget?.name ?? ""}”？此操作只影响 mock 存储。`}
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
    promptSuffix: "",
    previewUrl: ""
  };
}

function ArtStyleManager() {
  const [styles, setStyles] = useState<ArtStyle[]>([]);
  const [draft, setDraft] = useState<ArtStyleInput>(createStyleDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArtStyle | null>(null);

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

  function startEdit(style: ArtStyle) {
    setEditingId(style.id);
    setDraft({
      name: style.name,
      description: style.description,
      promptSuffix: style.promptSuffix,
      previewUrl: style.previewUrl ?? ""
    });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(createStyleDraft());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.updateArtStyle(editingId, draft);
      } else {
        await api.createArtStyle(draft);
      }
      resetForm();
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

  return (
    <div className="grid grid-cols-[1fr_380px] gap-6">
      <section className="card">
        <div className="mb-5">
          <h2 className="text-xl font-black text-ink">画风预设</h2>
          <p className="mt-1 text-sm text-slate-500">维护 prompt 片段，新建绘本时会锁定所选画风。</p>
        </div>
        {loading ? <Loading label="加载画风..." /> : null}
        {error ? <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {!loading && styles.length === 0 ? (
          <EmptyState title="还没有画风" description="请确认 mock server seed，或先手动新增一个画风。" />
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          {styles.map((style) => (
            <article key={style.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
              <div className="h-28 bg-gradient-to-br from-honey/60 via-berry/20 to-mint/40">
                {style.previewUrl ? (
                  <img alt={style.name} className="h-full w-full object-cover" src={style.previewUrl} />
                ) : null}
              </div>
              <div className="p-4">
                <h3 className="font-black text-ink">{style.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{style.description}</p>
                <p className="mt-3 line-clamp-3 rounded-2xl bg-paper p-3 text-xs leading-5 text-slate-500">
                  {style.promptSuffix}
                </p>
                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary flex-1" type="button" onClick={() => startEdit(style)}>
                    编辑
                  </button>
                  <button className="btn-danger" type="button" onClick={() => setDeleteTarget(style)}>
                    删除
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="card">
        <h2 className="text-lg font-black text-ink">{editingId ? "编辑画风" : "新增画风"}</h2>
        <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-600">名称</span>
            <input
              required
              className="field"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="温暖水彩"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-600">描述</span>
            <input
              className="field"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="适合睡前亲子故事"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-600">Prompt 片段</span>
            <textarea
              required
              className="field min-h-32"
              value={draft.promptSuffix}
              onChange={(event) => setDraft({ ...draft, promptSuffix: event.target.value })}
              placeholder="warm watercolor, soft light, picture book style"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-600">预览图 URL</span>
            <input
              className="field"
              value={draft.previewUrl ?? ""}
              onChange={(event) => setDraft({ ...draft, previewUrl: event.target.value })}
              placeholder="/mock/style-watercolor.png"
            />
          </label>
          <div className="flex gap-3">
            <button className="btn-primary flex-1" disabled={saving} type="submit">
              {saving ? "保存中..." : "保存画风"}
            </button>
            <button className="btn-secondary" type="button" onClick={resetForm}>
              重置
            </button>
          </div>
        </form>
      </aside>

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

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("llm");
  const activeTitle = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.label ?? "设置", [activeTab]);

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="设置"
        description="管理 mock 阶段使用的 LLM、生图模型与画风预设；保存配置不会触发真实外网 AI 请求。"
      />
      <div className="mb-6 flex gap-2 rounded-3xl bg-white/70 p-2 shadow-soft">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={[
              "flex-1 rounded-2xl px-4 py-3 text-sm font-black transition",
              activeTab === tab.id ? "bg-ink text-white" : "text-slate-500 hover:bg-white hover:text-ink"
            ].join(" ")}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "llm" ? (
        <ProviderManager<LlmProviderConfig>
          kind="llm"
          title={`${activeTitle} 配置`}
          description="故事大纲、对话改写等 mock 入口会引用默认 LLM 配置。"
        />
      ) : null}
      {activeTab === "image" ? (
        <ProviderManager<ImageProviderConfig>
          kind="image"
          title={`${activeTitle}配置`}
          description="页面配图 mock 生成会引用默认或项目指定的生图配置。"
        />
      ) : null}
      {activeTab === "styles" ? <ArtStyleManager /> : null}
    </div>
  );
}
