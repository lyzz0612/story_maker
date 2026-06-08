import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";

import type { ArtStyle, Character, OutlinePage, Project } from "@story-maker/scene-schema";

import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { api } from "@/lib/api";
import {
  formatDate,
  getCharactersById,
  pageStatusLabels,
  relationLabels
} from "@/lib/format";

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
  const [styles, setStyles] = useState<ArtStyle[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("outline");
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "我是 mock 创作助手。你可以说“第 3 页让爸爸出场”或“结尾不要太 scary”。"
    }
  ]);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [projectData, characterData, styleData] = await Promise.all([
        api.getProject(id),
        api.listCharacters(),
        api.listArtStyles()
      ]);
      setProject(projectData);
      setCharacters(characterData);
      setStyles(styleData);
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
  const lockedStyle = useMemo(
    () => styles.find((style) => style.id === project?.artStyleId),
    [project?.artStyleId, styles]
  );
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
    <div className="space-y-6">
      <header className="card flex items-start justify-between gap-6">
        <div>
          <Link className="text-sm font-bold text-berry" to="/">
            ← 返回项目
          </Link>
          <h1 className="mt-3 text-3xl font-black text-ink">{project.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{project.brief}</p>
          <p className="mt-3 text-xs font-semibold text-slate-400">
            更新于 {formatDate(project.updatedAt)}
          </p>
        </div>
        <div className="min-w-56 rounded-3xl bg-paper p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-berry">Locked Style</p>
          <p className="mt-2 text-lg font-black text-ink">{lockedStyle?.name ?? "未知画风"}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
            {lockedStyle?.description ?? "项目创建后锁定画风，避免无提示重绘。"}
          </p>
        </div>
      </header>

      {error ? <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-6">
        <section className="min-w-0">
          <div className="mb-5 flex gap-2 rounded-3xl bg-white/70 p-2 shadow-soft">
            {workspaceTabs.map((tab) => (
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

          {activeTab === "outline" ? (
            <OutlineTab
              characterMap={characterMap}
              currentPageNumber={currentPage?.pageNumber ?? 1}
              pages={getProjectPages(project)}
              onSelectPage={(pageNumber) => {
                setCurrentPageNumber(pageNumber);
                setActiveTab("pages");
              }}
            />
          ) : null}
          {activeTab === "pages" && currentPage ? (
            <PageEditor
              characterMap={characterMap}
              lockedStyle={lockedStyle}
              page={currentPage}
              project={project}
              onChangePage={setCurrentPageNumber}
              onPageUpdated={updatePage}
            />
          ) : null}
          {activeTab === "assets" ? <AssetPlaceholder page={currentPage} project={project} /> : null}
          {activeTab === "preview" ? (
            <PreviewPlaceholder
              currentPageNumber={currentPage?.pageNumber ?? 1}
              pages={getProjectPages(project)}
              onChangePage={setCurrentPageNumber}
            />
          ) : null}
        </section>

        <ChatPanel messages={messages} onSend={(message) => void sendChat(message)} />
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

function OutlineTab({ pages, currentPageNumber, characterMap, onSelectPage }: OutlineTabProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
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
  lockedStyle?: ArtStyle;
  characterMap: Map<string, Character>;
  onChangePage: (pageNumber: number) => void;
  onPageUpdated: (page: OutlinePage) => void;
}

function PageEditor({
  project,
  page,
  lockedStyle,
  characterMap,
  onChangePage,
  onPageUpdated
}: PageEditorProps) {
  const [text, setText] = useState(page.text);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(page.text);
  }, [page.pageNumber, page.text]);

  const fixedCharacters = page.castCharacterIds
    .map((characterId) => characterMap.get(characterId))
    .filter((character): character is Character => Boolean(character));

  async function saveText() {
    setSaving(true);
    setError(null);
    try {
      const saved = await api.updateProjectPage(project.id, page.pageNumber, { text });
      onPageUpdated(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存文案失败");
    } finally {
      setSaving(false);
    }
  }

  async function mockGenerate() {
    setGenerating(true);
    setError(null);
    onPageUpdated({ ...page, status: "generating" });
    try {
      const generated = await api.mockGeneratePage(project.id, page.pageNumber);
      onPageUpdated(generated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "模拟生成配图失败");
      onPageUpdated(page);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="card">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-berry">
            Page {page.pageNumber}
          </p>
          <h2 className="mt-2 text-2xl font-black text-ink">{page.summary}</h2>
        </div>
        <select
          className="field w-36"
          value={page.pageNumber}
          onChange={(event) => onChangePage(Number(event.target.value))}
        >
          {getProjectPages(project).map((item) => (
            <option key={item.pageNumber} value={item.pageNumber}>
              第 {item.pageNumber} 页
            </option>
          ))}
        </select>
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
                  一页一图占位区，点击下方按钮模拟生成。
                </span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                  {pageStatusLabels[generating ? "generating" : page.status]}
                </span>
                <span className="text-xs font-semibold text-slate-400">{lockedStyle?.name ?? "未知画风"}</span>
              </div>
              {page.sceneJsonPath ? (
                <p className="mt-3 break-all rounded-2xl bg-white p-3 text-xs text-slate-500">
                  scene.json: {page.sceneJsonPath}
                </p>
              ) : null}
            </div>
          </div>
          <button
            className="btn-primary w-full"
            disabled={generating}
            type="button"
            onClick={() => void mockGenerate()}
          >
            {generating ? "生成中..." : "模拟生成配图"}
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
            <textarea
              className="field min-h-64"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <button className="btn-primary" disabled={saving} type="button" onClick={() => void saveText()}>
            {saving ? "保存中..." : "保存文案"}
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message) {
      return;
    }
    onSend(message);
    setDraft("");
  }

  return (
    <aside className="card sticky top-8 h-[calc(100vh-4rem)] min-h-[620px]">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-berry">Mock Chat</p>
        <h2 className="mt-2 text-xl font-black text-ink">大纲助手</h2>
        <p className="mt-1 text-sm text-slate-500">发送后会刷新大纲或当前页数据。</p>
      </div>
      <div className="mt-5 flex h-[calc(100%-12rem)] flex-col gap-3 overflow-y-auto pr-1">
        {messages.map((message) => (
          <div
            key={message.id}
            className={[
              "rounded-3xl p-4 text-sm leading-6",
              message.role === "user" ? "ml-8 bg-ink text-white" : "mr-8 bg-paper text-slate-600"
            ].join(" ")}
          >
            {message.content}
          </div>
        ))}
      </div>
      <form className="mt-5 flex gap-2" onSubmit={submit}>
        <textarea
          className="field min-h-24 flex-1"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="例如：第 3 页让爸爸出场"
        />
        <button className="btn-primary self-end" type="submit">
          发送
        </button>
      </form>
    </aside>
  );
}

function AssetPlaceholder({ project, page }: { project: Project; page?: OutlinePage }) {
  return (
    <div className="card">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-berry">Assets</p>
      <h2 className="mt-2 text-2xl font-black text-ink">资产区域占位</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
        这里保留页级资产接口入口：后续可加载图集、绘制矩形区域、编辑 role / sequenceId /
        frameIndex，并保存到 <span className="font-bold text-ink">asset-sheet</span> API。
      </p>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-3xl bg-paper p-4">
          <p className="text-sm font-black text-ink">项目</p>
          <p className="mt-1 text-sm text-slate-500">{project.title}</p>
        </div>
        <div className="rounded-3xl bg-paper p-4">
          <p className="text-sm font-black text-ink">当前页</p>
          <p className="mt-1 text-sm text-slate-500">第 {page?.pageNumber ?? 1} 页</p>
        </div>
        <div className="rounded-3xl bg-paper p-4">
          <p className="text-sm font-black text-ink">接口</p>
          <p className="mt-1 text-xs text-slate-500">/projects/:id/pages/:n/asset-sheet</p>
        </div>
      </div>
    </div>
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
