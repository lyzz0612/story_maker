import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent
} from "react";
import { Link, useParams } from "react-router-dom";

import type { AssetSheet, Character, OutlinePage, Project } from "@story-maker/scene-schema";

import { EmptyState } from "@/components/EmptyState";
import { ProjectAssetsPanel } from "@/features/assets/ProjectAssetsPanel";
import { Loading } from "@/components/Loading";
import { TabBar } from "@/components/TabBar";
import { api } from "@/lib/api";
import { getCharactersById, pageStatusLabels, relationLabels } from "@/lib/format";

type WorkspaceTab = "outline" | "pages" | "assets" | "preview";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const workspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "outline", label: "大纲" },
  { id: "pages", label: "页面" },
  { id: "assets", label: "资产" },
  { id: "preview", label: "预览" }
];

function getProjectPages(project: Project) {
  return project.pages ?? project.outline;
}

function replacePage(project: Project, nextPage: OutlinePage): Project {
  const pages = getProjectPages(project).map((page) =>
    page.pageNumber === nextPage.pageNumber ? nextPage : page
  );

  return {
    ...project,
    outline: pages,
    pages,
    updatedAt: new Date().toISOString()
  };
}

export function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("outline");
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "我是创作助手。你可以说“第 3 页让爸爸出场”或“结尾不要太 scary”。"
    }
  ]);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [projectData, characterData] = await Promise.all([api.getProject(id), api.listCharacters()]);
      setProject(projectData);
      setCharacters(characterData);
      setCurrentPageNumber(getProjectPages(projectData)[0]?.pageNumber ?? 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载项目失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const characterMap = useMemo(() => getCharactersById(characters), [characters]);
  const currentPage = useMemo(() => {
    if (!project) {
      return undefined;
    }
    return (
      getProjectPages(project).find((page) => page.pageNumber === currentPageNumber) ??
      getProjectPages(project)[0]
    );
  }, [currentPageNumber, project]);

  function updatePage(nextPage: OutlinePage) {
    setProject((current) => (current ? replacePage(current, nextPage) : current));
  }

  function updateAssetSheet(assetSheet: AssetSheet) {
    setProject((current) => (current ? { ...current, assetSheet, updatedAt: assetSheet.updatedAt } : current));
  }

  async function sendChat(message: string) {
    if (!id || !project || !message.trim()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message.trim()
    };
    setMessages((current) => [...current, userMessage]);
    setError(null);

    try {
      const response = await api.sendProjectChat(id, message.trim());
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.reply
        }
      ]);

      if (response.project) {
        setProject(response.project);
      } else if (response.outline) {
        setProject({
          ...project,
          outline: response.outline,
          pages: response.outline,
          updatedAt: new Date().toISOString()
        });
      } else {
        setProject(await api.getProject(id));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "发送对话失败");
    }
  }

  if (loading) {
    return <Loading label="加载工作台..." />;
  }

  if (!project) {
    return (
      <EmptyState
        title="项目不存在"
        description={error ?? "未找到该绘本项目，请返回项目列表重新选择。"}
        action={
          <Link className="btn-primary inline-flex" to="/">
            返回项目列表
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <header className="flex shrink-0 items-center gap-3">
        <Link className="shrink-0 text-sm font-bold text-berry" to="/">
          ← 返回
        </Link>
        <h1 className="truncate text-xl font-black text-ink">{project.title}</h1>
      </header>

      {error ? (
        <p className="shrink-0 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <TabBar
        activeTab={activeTab}
        className="shrink-0"
        tabs={workspaceTabs}
        onChange={setActiveTab}
      />

      <div className="min-h-0 flex-1">
        {activeTab === "outline" ? (
          <div className="grid h-full grid-cols-[360px_minmax(0,1fr)] gap-6">
            <ChatPanel messages={messages} onSend={(message) => void sendChat(message)} />
            <section className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto pr-1">
              <div className="shrink-0">
                <p className="eyebrow">Outline</p>
                <h2 className="font-display text-xl font-black text-ink">当前大纲</h2>
                <p className="mt-1 text-sm text-ink-soft">与助手对话调整分页；点击某一页可跳转到页面编辑。</p>
              </div>
              <OutlineTab
                characterMap={characterMap}
                currentPageNumber={currentPage?.pageNumber ?? 1}
                pages={getProjectPages(project)}
                onSelectPage={(pageNumber) => {
                  setCurrentPageNumber(pageNumber);
                  setActiveTab("pages");
                }}
              />
            </section>
          </div>
        ) : null}

        {activeTab === "pages" ? (
          <div className="grid h-full grid-cols-[280px_minmax(0,1fr)] gap-6">
            <PageListNav
              currentPageNumber={currentPage?.pageNumber ?? 1}
              pages={getProjectPages(project)}
              onSelectPage={setCurrentPageNumber}
            />
            <section className="min-h-0 min-w-0 overflow-y-auto pr-1">
              {currentPage ? (
                <PageEditor
                  characterMap={characterMap}
                  page={currentPage}
                  project={project}
                  onPageUpdated={updatePage}
                />
              ) : (
                <EmptyState
                  description="请先在「大纲」中与助手生成分页内容。"
                  icon="📄"
                  title="暂无页面"
                />
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "assets" ? (
          <ProjectAssetsPanel project={project} onAssetSheetUpdated={updateAssetSheet} />
        ) : null}

        {activeTab === "preview" ? (
          <section className="h-full overflow-y-auto pr-1">
            <PreviewPlaceholder
              currentPageNumber={currentPage?.pageNumber ?? 1}
              pages={getProjectPages(project)}
              onChangePage={setCurrentPageNumber}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}

interface OutlineTabProps {
  pages: OutlinePage[];
  currentPageNumber: number;
  characterMap: Map<string, Character>;
  onSelectPage: (pageNumber: number) => void;
}

function PageListNav({
  pages,
  currentPageNumber,
  onSelectPage
}: {
  pages: OutlinePage[];
  currentPageNumber: number;
  onSelectPage: (pageNumber: number) => void;
}) {
  return (
    <nav className="card flex h-full min-h-0 flex-col p-0">
      <div className="shrink-0 border-b border-paper-deep/70 px-4 py-3.5">
        <p className="eyebrow">Pages</p>
        <h2 className="font-display text-lg font-black text-ink">分页列表</h2>
        <p className="mt-1 text-xs text-ink-soft">共 {pages.length} 页</p>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
        {pages.map((page) => {
          const selected = currentPageNumber === page.pageNumber;
          return (
            <li key={page.pageNumber}>
              <button
                className={[
                  "w-full rounded-2xl px-3 py-3 text-left transition",
                  selected
                    ? "bg-honey/25 ring-1 ring-honey/50"
                    : "hover:bg-paper/80"
                ].join(" ")}
                type="button"
                onClick={() => onSelectPage(page.pageNumber)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-black text-ink">第 {page.pageNumber} 页</span>
                  <span className="badge badge-mint text-[10px]">{pageStatusLabels[page.status]}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">{page.summary}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function OutlineTab({ pages, currentPageNumber, characterMap, onSelectPage }: OutlineTabProps) {
  return (
    <div className="grid grid-cols-2 gap-4 pb-2">
      {pages.map((page) => {
        const selected = currentPageNumber === page.pageNumber;
        const fixedCharacters = page.castCharacterIds
          .map((characterId) => characterMap.get(characterId)?.name)
          .filter((name): name is string => Boolean(name));

        return (
          <button
            key={page.pageNumber}
            className={[
              "card text-left transition hover:-translate-y-1",
              selected ? "border-honey bg-honey/10" : "hover:border-honey"
            ].join(" ")}
            type="button"
            onClick={() => onSelectPage(page.pageNumber)}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-black text-white">
                第 {page.pageNumber} 页
              </span>
              <span className="text-xs font-bold text-slate-400">{pageStatusLabels[page.status]}</span>
            </div>
            <h2 className="mt-4 text-lg font-black text-ink">{page.summary}</h2>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{page.text}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {fixedCharacters.map((name) => (
                <span key={name} className="rounded-full bg-mint/20 px-2 py-1 text-xs font-bold text-emerald-700">
                  {name}
                </span>
              ))}
              {page.temporaryCharacters.map((name) => (
                <span key={name} className="rounded-full bg-berry/10 px-2 py-1 text-xs font-bold text-rose-700">
                  {name}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface PageEditorProps {
  project: Project;
  page: OutlinePage;
  characterMap: Map<string, Character>;
  onPageUpdated: (page: OutlinePage) => void;
}

function PageEditor({ project, page, characterMap, onPageUpdated }: PageEditorProps) {
  const [text, setText] = useState(page.text);
  const [imagePrompt, setImagePrompt] = useState(page.imagePrompt ?? page.summary);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(page.text);
    setImagePrompt(page.imagePrompt ?? page.summary);
  }, [page.pageNumber, page.text, page.imagePrompt, page.summary]);

  const fixedCharacters = page.castCharacterIds
    .map((characterId) => characterMap.get(characterId))
    .filter((character): character is Character => Boolean(character));

  async function savePage() {
    setSaving(true);
    setError(null);
    try {
      const saved = await api.updateProjectPage(project.id, page.pageNumber, { text, imagePrompt });
      onPageUpdated(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存页面失败");
    } finally {
      setSaving(false);
    }
  }

  async function generateImage() {
    setGenerating(true);
    setError(null);
    onPageUpdated({ ...page, status: "generating" });
    try {
      const generated = await api.generatePageImage(project.id, page.pageNumber);
      onPageUpdated(generated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成配图失败");
      onPageUpdated(page);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="card">
      <div className="mb-5">
        <p className="eyebrow">Page {page.pageNumber}</p>
        <h2 className="font-display mt-2 text-2xl font-black text-ink">{page.summary}</h2>
        <p className="mt-1 text-sm text-ink-soft">在左侧列表切换其他分页。</p>
      </div>

      {error ? <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-paper">
            <div className="flex h-64 items-center justify-center bg-gradient-to-br from-honey/40 via-berry/20 to-mint/30">
              {page.imageUrl ? (
                <img alt={`第 ${page.pageNumber} 页配图`} className="h-full w-full object-cover" src={page.imageUrl} />
              ) : (
                <span className="px-8 text-center text-sm font-bold text-slate-500">
                  一页一图占位区，点击下方按钮生成配图。
                </span>
              )}
            </div>
            <div className="p-4">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                {pageStatusLabels[generating ? "generating" : page.status]}
              </span>
              {page.sceneJsonPath ? (
                <p className="mt-3 break-all rounded-2xl bg-white p-3 text-xs text-slate-500">
                  scene.json: {page.sceneJsonPath}
                </p>
              ) : null}
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-black text-ink">配图生成词</span>
            <textarea
              className="field min-h-32"
              value={imagePrompt}
              onChange={(event) => setImagePrompt(event.target.value)}
              placeholder="描述画面构图、角色动作、光线与画风，供生图模型使用"
            />
          </label>
          <button
            className="btn-primary w-full"
            disabled={generating}
            type="button"
            onClick={() => void generateImage()}
          >
            {generating ? "生成中..." : "生成配图"}
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-black text-ink">出场固定角色</h3>
            <div className="flex flex-wrap gap-2">
              {fixedCharacters.length > 0 ? (
                fixedCharacters.map((character) => (
                  <span
                    key={character.id}
                    className="rounded-full bg-mint/20 px-3 py-1 text-xs font-bold text-emerald-700"
                  >
                    {character.name} / {relationLabels[character.relation]}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">本页未标注固定角色</span>
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-black text-ink">临时角色</h3>
            <div className="flex flex-wrap gap-2">
              {page.temporaryCharacters.length > 0 ? (
                page.temporaryCharacters.map((name) => (
                  <span key={name} className="rounded-full bg-berry/10 px-3 py-1 text-xs font-bold text-rose-700">
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">本页没有临时角色</span>
              )}
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-black text-ink">页面文案</span>
            <p className="mb-2 text-xs text-slate-500">读者在绘本中看到的旁白或对白，与生图提示词分开维护。</p>
            <textarea
              className="field min-h-64"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <button className="btn-primary" disabled={saving} type="button" onClick={() => void savePage()}>
            {saving ? "保存中..." : "保存页面"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
}

function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState("");

  function submitMessage() {
    const message = draft.trim();
    if (!message) {
      return;
    }
    onSend(message);
    setDraft("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }

  const canSend = draft.trim().length > 0;

  return (
    <aside className="card flex h-full min-h-0 flex-col p-0">
      <div className="shrink-0 border-b border-paper-deep/70 px-5 py-4">
        <p className="eyebrow">对话</p>
        <h2 className="font-display mt-2 text-xl font-black text-ink">大纲助手</h2>
        <p className="mt-1 text-sm text-ink-soft">发送后会刷新大纲或当前页数据。</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={[
              "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              message.role === "user"
                ? "ml-auto bg-ink text-white shadow-soft"
                : "mr-auto border border-paper-deep/80 bg-paper/80 text-ink-soft"
            ].join(" ")}
          >
            {message.content}
          </div>
        ))}
      </div>

      <form className="shrink-0 border-t border-paper-deep/70 bg-paper/30 p-4" onSubmit={submit}>
        <div className="overflow-hidden rounded-2xl border border-paper-deep bg-white/95 transition focus-within:border-honey focus-within:ring-4 focus-within:ring-honey/15">
          <textarea
            className="block max-h-36 min-h-[5.25rem] w-full resize-none border-0 bg-transparent px-4 pb-2 pt-3.5 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-soft/45"
            value={draft}
            rows={3}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如：第 3 页让爸爸出场"
          />
          <div className="flex items-center justify-between gap-3 border-t border-paper-deep/50 bg-paper/50 px-3 py-2">
            <span className="text-[11px] font-medium text-ink-soft/55">
              Enter 发送 · Shift+Enter 换行
            </span>
            <button
              className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
              disabled={!canSend}
              type="submit"
            >
              <span aria-hidden className="text-xs opacity-90">
                ✦
              </span>
              发送
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
}

interface PreviewPlaceholderProps {
  pages: OutlinePage[];
  currentPageNumber: number;
  onChangePage: (pageNumber: number) => void;
}

function PreviewPlaceholder({ pages, currentPageNumber, onChangePage }: PreviewPlaceholderProps) {
  const currentPage = pages.find((page) => page.pageNumber === currentPageNumber) ?? pages[0];

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-berry">Preview</p>
          <h2 className="mt-2 text-2xl font-black text-ink">互动预览占位</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            预览 Tab 已保留路由和翻页接口。高级 Pixi 预览组件可在这里读取当前页 scene.json
            并替换占位画布。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            type="button"
            disabled={currentPageNumber <= 1}
            onClick={() => onChangePage(currentPageNumber - 1)}
          >
            上一页
          </button>
          <button
            className="btn-secondary"
            type="button"
            disabled={currentPageNumber >= pages.length}
            onClick={() => onChangePage(currentPageNumber + 1)}
          >
            下一页
          </button>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-100 bg-ink p-4">
        <div className="flex aspect-video items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-honey via-berry/60 to-mint text-center text-white">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em]">Page {currentPage?.pageNumber ?? 1}</p>
            <h3 className="mt-3 text-3xl font-black">{currentPage?.summary ?? "等待大纲"}</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 opacity-90">
              {currentPage?.sceneJsonPath
                ? `已关联 ${currentPage.sceneJsonPath}`
                : "生成配图后，这里可加载 scene.json 并播放 stagger_pop_in / sprite_sequence。"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
