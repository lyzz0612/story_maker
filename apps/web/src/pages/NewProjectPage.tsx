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
import { formatImageProvider } from "@/lib/providerLabels";
import { relationLabels } from "@/lib/format";

function deriveTitle(brief: string) {
  const firstLine = brief.trim().split(/\n/)[0]?.trim();
  if (!firstLine) {
    return "未命名绘本";
  }
  return firstLine.length > 18 ? `${firstLine.slice(0, 18)}...` : firstLine;
}

const RELATION_EMOJI: Record<Character["relation"], string> = {
  baby: "👶",
  dad: "👨",
  mom: "👩",
  other: "🧑"
};

interface WizardStepsProps {
  step: 1 | 2;
  canContinue: boolean;
  onStepChange: (step: 1 | 2) => void;
}

function WizardSteps({ step, canContinue, onStepChange }: WizardStepsProps) {
  const steps = [
    { num: 1 as const, label: "梗概", hint: "故事种子与角色" },
    { num: 2 as const, label: "配置", hint: "画风与模型" }
  ];

  return (
    <nav aria-label="新建绘本步骤" className="panel !p-5">
      <ol className="flex items-center">
        {steps.map((item, index) => {
          const active = step === item.num;
          const done = step > item.num;
          const disabled = item.num === 2 && !canContinue;

          return (
            <li key={item.num} className="flex flex-1 items-center">
              <button
                className={[
                  "group flex flex-1 items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
                  active ? "bg-honey/15" : "hover:bg-white/60",
                  disabled ? "cursor-not-allowed opacity-40" : ""
                ].join(" ")}
                disabled={disabled}
                type="button"
                onClick={() => onStepChange(item.num)}
              >
                <span
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] text-sm font-black transition",
                    active
                      ? "bg-ink text-white shadow-soft"
                      : done
                        ? "bg-mint/25 text-emerald-800"
                        : "border border-paper-deep bg-white text-ink-soft"
                  ].join(" ")}
                >
                  {done ? "✓" : item.num}
                </span>
                <span>
                  <span
                    className={[
                      "block font-display text-base font-black",
                      active ? "text-ink" : "text-ink-soft"
                    ].join(" ")}
                  >
                    {item.label}
                  </span>
                  <span className="block text-xs text-ink-soft/80">{item.hint}</span>
                </span>
              </button>
              {index < steps.length - 1 ? (
                <div
                  aria-hidden
                  className={[
                    "mx-2 h-px w-8 shrink-0 sm:w-12",
                    step > 1 ? "bg-mint/50" : "bg-paper-deep"
                  ].join(" ")}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface CharacterChoiceProps {
  character: Character;
  selected: boolean;
  onToggle: () => void;
}

function CharacterChoice({ character, selected, onToggle }: CharacterChoiceProps) {
  return (
    <button
      className={[
        "card card-hover relative overflow-hidden p-0 text-left transition",
        selected ? "border-honey ring-4 ring-honey/20" : ""
      ].join(" ")}
      type="button"
      onClick={onToggle}
    >
      <div className="flex gap-4 p-4">
        <div
          className={[
            "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem_0.6rem_0.8rem_1.3rem] text-2xl",
            selected ? "bg-honey/25" : "bg-paper-deep/80"
          ].join(" ")}
        >
          {character.referenceImageUrl ? (
            <img
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              src={character.referenceImageUrl}
            />
          ) : (
            <span aria-hidden>{RELATION_EMOJI[character.relation]}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-black text-ink">{character.name}</span>
            <span className="badge badge-mint">{relationLabels[character.relation]}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-soft">{character.appearance}</p>
        </div>
      </div>
      {selected ? (
        <span
          aria-hidden
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-honey text-xs font-black text-white shadow-soft"
        >
          ✓
        </span>
      ) : null}
    </button>
  );
}

interface SelectBlockProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; description: string; previewUrl?: string }>;
  onChange: (value: string) => void;
  variant?: "default" | "visual";
}

function SelectBlock({ label, value, options, onChange, variant = "default" }: SelectBlockProps) {
  const isVisual = variant === "visual";

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="font-display text-lg font-black text-ink">{label}</h2>
        <span className="badge badge-honey">{options.length} 项可选</span>
      </div>
      <div className={isVisual ? "grid grid-cols-2 gap-4" : "grid grid-cols-2 gap-3"}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              className={[
                "card card-hover relative overflow-hidden text-left transition",
                isVisual ? "p-0" : "p-4",
                selected ? "border-honey ring-4 ring-honey/20" : ""
              ].join(" ")}
              type="button"
              onClick={() => onChange(option.value)}
            >
              {isVisual ? (
                <>
                  <div className="relative aspect-[4/3] overflow-hidden border-b border-white/70">
                    {option.previewUrl ? (
                      <img
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        src={option.previewUrl}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-honey/30 via-mint/20 to-berry/15" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
                    {selected ? (
                      <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-honey text-xs font-black text-white shadow-soft">
                        ✓
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <span className="block font-display font-black text-ink">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-ink-soft">{option.description}</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="block font-black text-ink">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-ink-soft">{option.description}</span>
                  {selected ? (
                    <span
                      aria-hidden
                      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-black text-white"
                    >
                      ✓
                    </span>
                  ) : null}
                </>
              )}
            </button>
          );
        })}
        {options.length === 0 ? (
          <div className="col-span-2 rounded-[1.75rem] border border-dashed border-paper-deep bg-white/70 p-5 text-sm text-ink-soft">
            暂无可选项，请先在设置页补齐。
          </div>
        ) : null}
      </div>
    </div>
  );
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
  const selectedStyle = styles.find((style) => style.id === artStyleId);

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
        description="两步完成：先写简略梗概并选择固定角色，再选择画风与模型配置。"
        actions={
          <Link className="btn-secondary inline-flex" to="/">
            返回项目
          </Link>
        }
      />

      {loading ? <Loading label="准备向导数据..." /> : null}
      {error ? (
        <p className="page-enter-delay-1 mb-4 rounded-2xl border border-berry/20 bg-berry/10 p-3 text-sm text-berry">
          {error}
        </p>
      ) : null}

      {!loading ? (
        <form className="space-y-6" onSubmit={(event) => void submit(event)}>
          <div className="page-enter-delay-1">
            <WizardSteps
              canContinue={canContinue}
              step={step}
              onStepChange={setStep}
            />
          </div>

          <div className="page-enter-delay-2 grid grid-cols-[1fr_340px] gap-6">
            <section className="panel">
              {step === 1 ? (
                <div className="space-y-7">
                  <div>
                    <p className="eyebrow mb-2">Step 1</p>
                    <h2 className="font-display text-2xl font-black text-ink">写下故事种子</h2>
                    <p className="mt-2 text-sm text-ink-soft">
                      用一两句话描述绘本主题，再挑选会反复出场的家庭角色。
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-ink-soft">书名（可选）</span>
                    <input
                      className="field"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="留空则从梗概自动提取"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-ink-soft">简略梗概</span>
                    <textarea
                      required
                      className="field min-h-52"
                      value={brief}
                      onChange={(event) => setBrief(event.target.value)}
                      placeholder="例如：宝宝和爸爸读三只小猪，最后一起学会勇敢和合作。"
                    />
                  </label>

                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-display text-lg font-black text-ink">选择家庭主角</h3>
                        <p className="mt-1 text-xs text-ink-soft">可多选，将作为固定出场角色</p>
                      </div>
                      <Link className="text-sm font-bold text-berry hover:underline" to="/characters">
                        管理角色库
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {characters.map((character) => (
                        <CharacterChoice
                          key={character.id}
                          character={character}
                          selected={selectedCharacterIds.includes(character.id)}
                          onToggle={() => toggleCharacter(character.id)}
                        />
                      ))}
                      {characters.length === 0 ? (
                        <div className="col-span-2 rounded-[1.75rem] border border-dashed border-paper-deep bg-white/70 p-5 text-sm text-ink-soft">
                          角色库为空，也可以先创建项目，之后通过大纲和页面继续编辑。
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <button
                    className="btn-primary w-full sm:w-auto"
                    disabled={!canContinue}
                    type="button"
                    onClick={() => setStep(2)}
                  >
                    下一步：选择画风与模型 →
                  </button>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-7">
                  <div>
                    <p className="eyebrow mb-2">Step 2</p>
                    <h2 className="font-display text-2xl font-black text-ink">锁定创作配置</h2>
                    <p className="mt-2 text-sm text-ink-soft">
                      为这本绘本选定视觉风格与生成模型，创建后可在工作台继续调整。
                    </p>
                  </div>

                  <SelectBlock
                    label="锁定画风"
                    value={artStyleId}
                    variant="visual"
                    options={styles.map((style) => ({
                      value: style.id,
                      label: style.name,
                      description: style.description,
                      previewUrl: style.previewUrl
                    }))}
                    onChange={setArtStyleId}
                  />
                  <SelectBlock
                    label="LLM 配置"
                    value={llmId}
                    options={llms.map((config) => ({
                      value: config.id,
                      label: config.name,
                      description: `OpenAI / ${config.model}${config.isDefault ? " / 默认" : ""}`
                    }))}
                    onChange={setLlmId}
                  />
                  <SelectBlock
                    label="生图模型"
                    value={imageId}
                    options={images.map((config) => ({
                      value: config.id,
                      label: config.name,
                      description: `${formatImageProvider(config.provider)} / ${config.model}${config.isDefault ? " / 默认" : ""}`
                    }))}
                    onChange={setImageId}
                  />
                  {!canCreate ? (
                    <p className="rounded-2xl border border-honey/30 bg-honey/10 p-3 text-sm font-semibold text-amber-800">
                      请先在设置中添加至少一个画风、LLM 和生图模型配置。
                    </p>
                  ) : null}
                  <div className="flex gap-3">
                    <button className="btn-secondary" type="button" onClick={() => setStep(1)}>
                      ← 上一步
                    </button>
                    <button className="btn-primary flex-1" disabled={!canCreate || saving} type="submit">
                      {saving ? "创建中..." : "创建并进入工作台"}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            <aside className="panel sticky top-6 h-fit overflow-hidden">
              <div
                className="relative -mx-6 -mt-6 mb-5 aspect-[3/2] overflow-hidden border-b border-white/70"
                style={{
                  borderTopLeftRadius: "1.75rem",
                  borderTopRightRadius: "1.75rem"
                }}
              >
                {selectedStyle?.previewUrl ? (
                  <img
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    src={selectedStyle.previewUrl}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-honey/35 via-coral/20 to-mint/25" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/15 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/75">Preview</p>
                  <h2 className="font-display text-xl font-black text-white">
                    {title.trim() || deriveTitle(brief)}
                  </h2>
                </div>
              </div>

              <p className="line-clamp-6 text-sm leading-6 text-ink-soft">
                {brief || "填写梗概后，这里会显示即将生成大纲的故事种子。"}
              </p>

              <div className="mt-5 border-t border-paper-deep/80 pt-5">
                <p className="text-sm font-black text-ink">固定角色</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCharacters.length > 0 ? (
                    selectedCharacters.map((character) => (
                      <span key={character.id} className="badge badge-mint">
                        {character.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-ink-soft/70">未选择固定角色</span>
                  )}
                </div>
              </div>

              {step === 2 && selectedStyle ? (
                <div className="mt-5 border-t border-paper-deep/80 pt-5">
                  <p className="text-sm font-black text-ink">已选画风</p>
                  <span className="badge badge-honey mt-2">{selectedStyle.name}</span>
                </div>
              ) : null}
            </aside>
          </div>
        </form>
      ) : null}
    </div>
  );
}
