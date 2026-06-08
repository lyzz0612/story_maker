import { useCallback, useEffect, useState, type FormEvent } from "react";

import type { Character } from "@story-maker/scene-schema";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { formatDate, relationLabels } from "@/lib/format";

type CharacterDraft = Pick<Character, "name" | "relation" | "appearance" | "referenceImageUrl">;

const emptyDraft: CharacterDraft = {
  name: "",
  relation: "baby",
  appearance: "",
  referenceImageUrl: "/mock/character-ref-placeholder.png"
};

export function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [draft, setDraft] = useState<CharacterDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
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

  function startEdit(character: Character) {
    setEditingId(character.id);
    setDraft({
      name: character.name,
      relation: character.relation,
      appearance: character.appearance,
      referenceImageUrl: character.referenceImageUrl
    });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.updateCharacter(editingId, draft);
      } else {
        await api.createCharacter(draft);
      }
      resetForm();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存角色失败");
    } finally {
      setSaving(false);
    }
  }

  async function generateReference(character: Character) {
    setGeneratingId(character.id);
    setError(null);
    try {
      await api.generateCharacterReference(character.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "模拟生成参考图失败");
    } finally {
      setGeneratingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    await api.deleteCharacter(deleteTarget.id);
    setDeleteTarget(null);
    if (editingId === deleteTarget.id) {
      resetForm();
    }
    await load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Characters"
        title="家庭角色库"
        description="固定主角在这里维护。临时故事角色只存在于项目大纲中，不会写入家庭角色库。"
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid grid-cols-[1fr_380px] gap-6">
        <section>
          {loading ? <Loading label="加载角色..." /> : null}
          {!loading && characters.length === 0 ? (
            <EmptyState
              title="还没有家庭角色"
              description="创建宝宝、爸爸、妈妈等固定主角后，新建故事时可以直接多选出场。"
            />
          ) : null}

          <div className="grid grid-cols-2 gap-5">
            {characters.map((character) => (
              <article key={character.id} className="card overflow-hidden p-0">
                <div className="relative h-56 bg-gradient-to-br from-honey/30 via-berry/20 to-mint/30">
                  {character.referenceImageUrl ? (
                    <img
                      alt={`${character.name} 参考图`}
                      className="h-full w-full object-cover"
                      src={character.referenceImageUrl}
                    />
                  ) : null}
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-ink shadow-soft">
                    {relationLabels[character.relation]}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-ink">{character.name}</h2>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        更新于 {formatDate(character.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
                    {character.appearance}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => void generateReference(character)}
                      disabled={generatingId === character.id}
                    >
                      {generatingId === character.id ? "生成中..." : "模拟生成参考图"}
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => startEdit(character)}>
                      编辑
                    </button>
                    <button className="btn-danger" type="button" onClick={() => setDeleteTarget(character)}>
                      删除
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="card h-fit">
          <h2 className="text-lg font-black text-ink">{editingId ? "编辑角色" : "创建角色"}</h2>
          <p className="mt-1 text-sm text-slate-500">每个固定角色只维护一张主参考图。</p>
          <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">名字</span>
              <input
                required
                className="field"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="宝宝"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">关系</span>
              <select
                className="field"
                value={draft.relation}
                onChange={(event) =>
                  setDraft({ ...draft, relation: event.target.value as Character["relation"] })
                }
              >
                {Object.entries(relationLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">外貌描述</span>
              <textarea
                required
                className="field min-h-36"
                value={draft.appearance}
                onChange={(event) => setDraft({ ...draft, appearance: event.target.value })}
                placeholder="圆脸、好奇、穿黄色背带裤..."
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">参考图 URL</span>
              <input
                className="field"
                value={draft.referenceImageUrl}
                onChange={(event) => setDraft({ ...draft, referenceImageUrl: event.target.value })}
                placeholder="/mock/ref-baby.png"
              />
            </label>
            <div className="flex gap-3">
              <button className="btn-primary flex-1" disabled={saving} type="submit">
                {saving ? "保存中..." : "保存角色"}
              </button>
              <button className="btn-secondary" type="button" onClick={resetForm}>
                重置
              </button>
            </div>
          </form>
        </aside>
      </div>

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
