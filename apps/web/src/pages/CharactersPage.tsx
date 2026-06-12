import { useCallback, useEffect, useState, type FormEvent } from "react";

import type { Character } from "@story-maker/scene-schema";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { FormDialog } from "@/components/FormDialog";
import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { api, type CharacterInput } from "@/lib/api";
import { formatDate } from "@/lib/format";

function createCharacterDraft(): CharacterInput {
  return {
    name: "",
    appearance: ""
  };
}

const STAGGER_BASE_MS = 80;
const STAGGER_STEP_MS = 65;

function staggerStyle(index: number) {
  return {
    animation: "fade-up 0.55s ease-out both",
    animationDelay: `${(STAGGER_BASE_MS + index * STAGGER_STEP_MS) / 1000}s`
  } as const;
}

function PortraitPlaceholder({
  label,
  compact = false
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-honey/35 via-berry/25 to-mint/30 ${
        compact ? "h-full min-h-48" : "h-full min-h-[15rem]"
      }`}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(232,168,56,0.35) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(93,184,154,0.3) 0%, transparent 45%), radial-gradient(circle at 50% 50%, rgba(212,86,106,0.15) 0%, transparent 60%)"
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(26,35,50,0.06) 8px, rgba(26,35,50,0.06) 9px)"
        }}
      />
      <div className="relative flex flex-col items-center gap-3 px-6 text-center">
        <div
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-white/60 bg-white/50 text-3xl shadow-soft backdrop-blur-sm"
          style={{ animation: "gentle-float 3.2s ease-in-out infinite" }}
        >
          🎨
        </div>
        {label ? (
          <p className="max-w-[12rem] text-xs font-semibold leading-relaxed text-ink-soft/80">{label}</p>
        ) : (
          <p className="font-display text-sm font-bold tracking-wide text-ink/60">待绘立绘</p>
        )}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-4 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 bottom-4 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />
    </div>
  );
}

function GeneratingRitual({ name }: { name: string }) {
  const displayName = name.trim() || "角色";

  return (
    <div className="relative flex h-56 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-honey/20 via-paper-deep to-mint/20">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2s ease-in-out infinite"
        }}
      />
      <div aria-hidden className="absolute inset-0 flex items-center justify-center">
        <div
          className="h-36 w-36 rounded-full border border-honey/20"
          style={{ animation: "gentle-float 2.4s ease-in-out infinite" }}
        />
        <div
          className="absolute h-28 w-28 rounded-full border border-berry/15"
          style={{ animation: "gentle-float 2.4s ease-in-out 0.3s infinite" }}
        />
        <div
          className="absolute h-20 w-20 rounded-full border border-mint/25"
          style={{ animation: "gentle-float 2.4s ease-in-out 0.6s infinite" }}
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3 px-8 text-center">
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-xl shadow-soft backdrop-blur-sm"
          style={{ animation: "gentle-float 1.8s ease-in-out infinite" }}
        >
          ✨
        </span>
        <p className="font-display text-base font-black text-ink">正在为「{displayName}」绘制立绘</p>
        <p className="text-xs font-semibold text-ink-soft">画笔挥动中，请稍候片刻…</p>
        <div className="mt-1 flex gap-1.5">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-honey"
              style={{
                animation: "gentle-float 1.2s ease-in-out infinite",
                animationDelay: `${dot * 0.2}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CharacterIllustrationCard({
  character,
  index,
  onEdit,
  onDelete
}: {
  character: Character;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasPortrait = Boolean(character.referenceImageUrl);

  return (
    <article
      className="card-hover group overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/90"
      style={staggerStyle(index)}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {hasPortrait ? (
          <>
            <img
              alt={`${character.name} 参考图`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              src={character.referenceImageUrl}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent opacity-60"
            />
          </>
        ) : (
          <PortraitPlaceholder />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-[1.25rem] border border-white/30"
        />
        <div className="absolute left-4 top-4">
          <span className={`badge ${hasPortrait ? "badge-mint" : "badge-honey"}`}>
            {hasPortrait ? "已绘立绘" : "待补立绘"}
          </span>
        </div>
      </div>

      <div className="relative border-t border-paper-deep/60 bg-gradient-to-b from-white to-paper/40 px-5 pb-5 pt-5">
        <div
          aria-hidden
          className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-honey/40 to-transparent"
        />

        <h2 className="font-display text-[1.65rem] font-black leading-tight tracking-tight text-ink">
          {character.name}
        </h2>

        <div className="mt-2 flex items-center gap-2">
          <span className="badge badge-berry">固定主角</span>
          <span className="text-[0.7rem] font-semibold text-ink-soft/70">
            更新于 {formatDate(character.updatedAt)}
          </span>
        </div>

        <div className="mt-4 border-l-2 border-honey/35 pl-3.5">
          <p className="line-clamp-4 text-[0.85rem] leading-[1.75] text-ink-soft">{character.appearance}</p>
        </div>

        <div className="mt-5 flex gap-2 border-t border-paper-deep/50 pt-4">
          <button className="btn-secondary flex-1" type="button" onClick={onEdit}>
            编辑立绘卡
          </button>
          <button className="btn-danger shrink-0" type="button" onClick={onDelete}>
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

export function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [draft, setDraft] = useState<CharacterInput>(createCharacterDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [generatingReference, setGeneratingReference] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCharacters(await api.listCharacters());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载角色失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setDraft(createCharacterDraft());
    setReferenceImageUrl(null);
    setFormOpen(true);
  }

  function startEdit(character: Character) {
    setEditingId(character.id);
    setDraft({
      name: character.name,
      appearance: character.appearance
    });
    setReferenceImageUrl(character.referenceImageUrl || null);
    setFormOpen(true);
  }

  function closeForm() {
    setEditingId(null);
    setDraft(createCharacterDraft());
    setReferenceImageUrl(null);
    setFormOpen(false);
  }

  function canGenerateReference(input: CharacterInput) {
    return Boolean(input.name.trim() && input.appearance.trim());
  }

  async function generateReferencePreview() {
    if (!canGenerateReference(draft)) {
      setError("请先填写名字与外貌描述");
      return;
    }
    setGeneratingReference(true);
    setError(null);
    try {
      const result = await api.previewCharacterReference(draft);
      setReferenceImageUrl(result.referenceImageUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成参考图失败");
    } finally {
      setGeneratingReference(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: CharacterInput = {
        ...draft,
        referenceImageUrl: referenceImageUrl ?? undefined
      };
      if (editingId) {
        await api.updateCharacter(editingId, payload);
      } else {
        await api.createCharacter(payload);
      }
      closeForm();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存角色失败");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    await api.deleteCharacter(deleteTarget.id);
    setDeleteTarget(null);
    if (editingId === deleteTarget.id) {
      closeForm();
    }
    await load();
  }

  const portraitCount = characters.filter((c) => c.referenceImageUrl).length;

  return (
    <div>
      <PageHeader
        eyebrow="Characters"
        title="家庭角色库"
        description="固定主角在这里维护。临时故事角色只存在于项目大纲中，不会写入家庭角色库。"
      />

      <section className="panel page-enter-delay-1 mb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="eyebrow mb-2">立绘收藏册</p>
            <h2 className="font-display text-2xl font-black text-ink">固定角色</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              在弹窗中填写外貌描述并生成参考图，新建故事时多选出场。
            </p>
            {!loading && characters.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="badge badge-honey">共 {characters.length} 位主角</span>
                <span className="badge badge-mint">{portraitCount} 张立绘</span>
                {portraitCount < characters.length ? (
                  <span className="badge badge-berry">{characters.length - portraitCount} 待补图</span>
                ) : null}
              </div>
            ) : null}
          </div>
          <button className="btn-primary shrink-0" type="button" onClick={startCreate}>
            ＋ 新增角色
          </button>
        </div>
      </section>

      {error ? (
        <p
          className="page-enter-delay-2 mb-5 rounded-2xl border border-berry/20 bg-berry/10 p-3.5 text-sm font-semibold text-berry"
          style={staggerStyle(0)}
        >
          {error}
        </p>
      ) : null}

      {loading ? <Loading label="加载角色..." /> : null}

      {!loading && characters.length === 0 ? (
        <div className="page-enter-delay-2">
          <EmptyState
            icon="🎭"
            title="还没有家庭角色"
            description="创建固定主角后，新建故事时可以直接多选出场。"
            action={
              <button className="btn-primary" type="button" onClick={startCreate}>
                绘制第一位主角
              </button>
            }
          />
        </div>
      ) : null}

      {!loading && characters.length > 0 ? (
        <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
          {characters.map((character, index) => (
            <CharacterIllustrationCard
              key={character.id}
              character={character}
              index={index}
              onDelete={() => setDeleteTarget(character)}
              onEdit={() => startEdit(character)}
            />
          ))}
        </div>
      ) : null}

      <FormDialog
        open={formOpen}
        title={editingId ? "编辑角色" : "新增角色"}
        onClose={closeForm}
      >
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink-soft">名字</span>
            <input
              required
              className="field font-display text-base"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="宝宝"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink-soft">外貌描述</span>
            <textarea
              required
              className="field min-h-36 leading-relaxed"
              value={draft.appearance}
              onChange={(event) => setDraft({ ...draft, appearance: event.target.value })}
              placeholder="圆脸、好奇、穿黄色背带裤..."
            />
          </label>

          <div className="overflow-hidden rounded-[1.25rem] border border-paper-deep bg-gradient-to-b from-paper/60 to-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-display text-sm font-black text-ink">参考立绘</span>
                <p className="mt-0.5 text-xs text-ink-soft">根据外貌描述生成角色参考图</p>
              </div>
              <button
                className="btn-secondary shrink-0"
                disabled={generatingReference || !canGenerateReference(draft)}
                type="button"
                onClick={() => void generateReferencePreview()}
              >
                {generatingReference ? "绘制中…" : "生成参考图"}
              </button>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-[1.1rem] border-2 border-white shadow-soft">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-1 z-10 rounded-[0.9rem] border border-honey/20"
              />
              {generatingReference ? (
                <GeneratingRitual name={draft.name} />
              ) : referenceImageUrl ? (
                <div className="relative">
                  <img
                    alt="角色参考图"
                    className="h-56 w-full object-cover"
                    src={referenceImageUrl}
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/15 via-transparent to-honey/10"
                  />
                  <div className="absolute bottom-3 left-3">
                    <span className="badge badge-mint">立绘已生成</span>
                  </div>
                </div>
              ) : (
                <PortraitPlaceholder
                  compact
                  label={
                    canGenerateReference(draft)
                      ? "外貌描述已就绪，点击「生成参考图」开始绘制"
                      : "填写名字与外貌描述后，即可生成角色立绘"
                  }
                />
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button className="btn-primary flex-1" disabled={saving} type="submit">
              {saving ? "保存中..." : "保存角色"}
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
        title="删除角色？"
        description={`确认删除“${deleteTarget?.name ?? ""}”？已创建项目中的角色 id 不会自动迁移。`}
        confirmLabel="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
