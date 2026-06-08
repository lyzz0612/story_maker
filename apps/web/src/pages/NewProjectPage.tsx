import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import type {
  ArtStyle,
  Character,
  ImageProviderConfig,
  LlmProviderConfig
} from "@story-maker/scene-schema";

import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { relationLabels } from "@/lib/format";

function deriveTitle(brief: string) {
  const firstLine = brief.trim().split(/\n/)[0]?.trim();
  if (!firstLine) {
    return "未命名绘本";
  }
  return firstLine.length > 18 ? `${firstLine.slice(0, 18)}...` : firstLine;
}

export function NewProjectPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [brief, setBrief] = useState("");
  const [title, setTitle] = useState("");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [styles, setStyles] = useState<ArtStyle[]>([]);
  const [llms, setLlms] = useState<LlmProviderConfig[]>([]);
  const [images, setImages] = useState<ImageProviderConfig[]>([]);
  const [artStyleId, setArtStyleId] = useState("");
  const [llmId, setLlmId] = useState("");
  const [imageId, setImageId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [characterData, styleData, llmData, imageData] = await Promise.all([
        api.listCharacters(),
        api.listArtStyles(),
        api.getLlmConfigs(),
        api.getImageConfigs()
      ]);
      setCharacters(characterData);
      setStyles(styleData);
      setLlms(llmData);
      setImages(imageData);
      setArtStyleId(styleData[0]?.id ?? "");
      setLlmId(llmData.find((config) => config.isDefault)?.id ?? llmData[0]?.id ?? "");
      setImageId(imageData.find((config) => config.isDefault)?.id ?? imageData[0]?.id ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载向导数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canContinue = brief.trim().length > 0;
  const canCreate = canContinue && artStyleId && llmId && imageId;
  const selectedCharacters = useMemo(
    () => characters.filter((character) => selectedCharacterIds.includes(character.id)),
    [characters, selectedCharacterIds]
  );

  function toggleCharacter(characterId: string) {
    setSelectedCharacterIds((current) =>
      current.includes(characterId)
        ? current.filter((id) => id !== characterId)
        : [...current, characterId]
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const project = await api.createProject({
        title: title.trim() || deriveTitle(brief),
        brief,
        castCharacterIds: selectedCharacterIds,
        artStyleId,
        llmId,
        imageId
      });
      navigate(`/projects/${project.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建项目失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="New Story"
        title="新建绘本"
        description="两步完成：先写简略梗概并选择固定角色，再锁定画风与 mock 模型配置。"
        actions={
          <Link className="btn-secondary inline-flex" to="/">
            返回项目
          </Link>
        }
      />

      {loading ? <Loading label="准备向导数据..." /> : null}
      {error ? <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {!loading ? (
        <form className="grid grid-cols-[1fr_360px] gap-6" onSubmit={(event) => void submit(event)}>
          <section className="card">
            <div className="mb-6 flex gap-2 rounded-3xl bg-paper p-2">
              {[1, 2].map((item) => (
                <button
                  key={item}
                  className={[
                    "flex-1 rounded-2xl px-4 py-3 text-sm font-black",
                    step === item ? "bg-ink text-white" : "text-slate-500"
                  ].join(" ")}
                  type="button"
                  onClick={() => setStep(item as 1 | 2)}
                  disabled={item === 2 && !canContinue}
                >
                  Step {item}
                </button>
              ))}
            </div>

            {step === 1 ? (
              <div className="space-y-6">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">书名（可选）</span>
                  <input
                    className="field"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="留空则从梗概自动提取"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">简略梗概</span>
                  <textarea
                    required
                    className="field min-h-52"
                    value={brief}
                    onChange={(event) => setBrief(event.target.value)}
                    placeholder="例如：宝宝和爸爸读三只小猪，最后一起学会勇敢和合作。"
                  />
                </label>
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-black text-ink">选择家庭主角</h2>
                    <Link className="text-sm font-bold text-berry" to="/characters">
                      管理角色库
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {characters.map((character) => {
                      const selected = selectedCharacterIds.includes(character.id);
                      return (
                        <button
                          key={character.id}
                          className={[
                            "rounded-3xl border p-4 text-left transition",
                            selected
                              ? "border-honey bg-honey/20"
                              : "border-slate-100 bg-white hover:border-honey"
                          ].join(" ")}
                          type="button"
                          onClick={() => toggleCharacter(character.id)}
                        >
                          <span className="text-base font-black text-ink">{character.name}</span>
                          <span className="ml-2 rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">
                            {relationLabels[character.relation]}
                          </span>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                            {character.appearance}
                          </p>
                        </button>
                      );
                    })}
                    {characters.length === 0 ? (
                      <div className="col-span-2 rounded-3xl border border-dashed border-slate-200 bg-white/70 p-5 text-sm text-slate-500">
                        角色库为空，也可以先创建项目，之后通过大纲和页面继续编辑。
                      </div>
                    ) : null}
                  </div>
                </div>
                <button
                  className="btn-primary"
                  type="button"
                  disabled={!canContinue}
                  onClick={() => setStep(2)}
                >
                  下一步：选择画风与模型
                </button>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <SelectBlock
                  label="锁定画风"
                  value={artStyleId}
                  onChange={setArtStyleId}
                  options={styles.map((style) => ({
                    value: style.id,
                    label: style.name,
                    description: style.description
                  }))}
                />
                <SelectBlock
                  label="LLM 配置"
                  value={llmId}
                  onChange={setLlmId}
                  options={llms.map((config) => ({
                    value: config.id,
                    label: config.name,
                    description: `${config.provider} / ${config.model}${config.isDefault ? " / 默认" : ""}`
                  }))}
                />
                <SelectBlock
                  label="生图模型"
                  value={imageId}
                  onChange={setImageId}
                  options={images.map((config) => ({
                    value: config.id,
                    label: config.name,
                    description: `${config.provider} / ${config.model}${config.isDefault ? " / 默认" : ""}`
                  }))}
                />
                {!canCreate ? (
                  <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                    请确认 mock server 已提供至少一个画风、LLM 和生图模型配置。
                  </p>
                ) : null}
                <div className="flex gap-3">
                  <button className="btn-secondary" type="button" onClick={() => setStep(1)}>
                    上一步
                  </button>
                  <button className="btn-primary flex-1" disabled={!canCreate || saving} type="submit">
                    {saving ? "创建中..." : "创建并进入工作台"}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="card h-fit">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-berry">Summary</p>
            <h2 className="mt-3 text-xl font-black text-ink">{title.trim() || deriveTitle(brief)}</h2>
            <p className="mt-3 line-clamp-6 text-sm leading-6 text-slate-500">
              {brief || "填写梗概后，这里会显示即将生成大纲的故事种子。"}
            </p>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-sm font-black text-ink">固定角色</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCharacters.length > 0 ? (
                  selectedCharacters.map((character) => (
                    <span
                      key={character.id}
                      className="rounded-full bg-mint/20 px-3 py-1 text-xs font-bold text-emerald-700"
                    >
                      {character.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">未选择固定角色</span>
                )}
              </div>
            </div>
          </aside>
        </form>
      ) : null}
    </div>
  );
}

interface SelectBlockProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; description: string }>;
  onChange: (value: string) => void;
}

function SelectBlock({ label, value, options, onChange }: SelectBlockProps) {
  return (
    <div>
      <h2 className="mb-3 font-black text-ink">{label}</h2>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              className={[
                "rounded-3xl border p-4 text-left transition",
                selected ? "border-honey bg-honey/20" : "border-slate-100 bg-white hover:border-honey"
              ].join(" ")}
              type="button"
              onClick={() => onChange(option.value)}
            >
              <span className="block font-black text-ink">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
            </button>
          );
        })}
        {options.length === 0 ? (
          <div className="col-span-2 rounded-3xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
            暂无可选项，请先在设置页补齐。
          </div>
        ) : null}
      </div>
    </div>
  );
}
