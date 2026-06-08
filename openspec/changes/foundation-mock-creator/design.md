## 上下文

Story Maker 目标为个人 AI 互动绘本制作端。探索阶段已确认：家庭角色库、简略输入+对话改大纲、L1/L2 互动编排、页级资产手框编辑。L2 经小样试验**初步可行**。当前仓库无应用代码，需先以 **mock 数据** 搭建完整 UI 与 API 契约，对标 BookletAI（大纲+对话）与 ReadKidz（角色库+画风+分页）的工作台形态。

约束：单用户、本地 Web、不接真实 AI、不做导出与 SQLite（下一阶段替换 mock 层即可）。

## 目标 / 非目标

**目标：**

- pnpm monorepo 可 `pnpm dev` 同时启动 web + server
- 设置页管理 LLM / 生图模型 / 画风 prompt
- 家庭固定角色库完整 CRUD + 参考图占位
- 端到端创作流程 UI 可点击走通（全 mock）
- `packages/scene-schema` 定义 Project、Page、SceneGraph、Character、Settings 类型
- Pixi 预览演示翻页 + 至少一种 L1 模板 + L2 帧播放占位

**非目标：**

- 真实 OpenAI / Fal / Replicate 调用
- SQLite、文件系统资产、`.storypack` 导出
- 用户系统、云同步、Tauri 壳
- 自动切图、rembg、真实上传存储（可用 URL / 内置 placeholder）

## 决策

### 1. Monorepo 结构

```
story_maker/
  apps/web/          # React + Vite + Tailwind + Zustand
  apps/server/       # Fastify mock API
  packages/
    scene-schema/    # 共享 TS 类型 + zod schema（可选）
```

**理由**：与 `docs/tech-stack.md` 一致；前后端共享 Scene Graph 类型。  
**备选**：单仓仅前端 + MSW — 拒绝，因后续 Node 编排层确定需要。

### 2. Mock 数据策略

| 层 | 方案 |
|----|------|
| Server | 内存 Map + 启动时 `seed.ts` 注入样例（三只小猪项目、3 家庭角色、10 画风、2 模型配置） |
| 持久化 | `localStorage` 镜像 settings（可选）；server 重启丢失可接受，seed 可重建 |
| AI 行为 | 固定延迟（300–800ms）+ 规则化响应（关键词 patch 大纲第 N 页） |

**理由**：先验证 UX 与数据形状；替换时保留 REST 路径与 JSON 结构。  
**备选**：纯前端 mock — 拒绝，避免下一阶段拆 API 时大改。

### 3. 界面信息架构（参考竞品）

```
┌──────────┬────────────────────────────────┬──────────────┐
│ 侧栏导航  │  主工作区                       │  右面板       │
│          │                                │              │
│ 项目列表  │  [大纲模式] 分页卡片 / 时间线    │  对话 / 属性  │
│ 角色库    │  [编辑模式] 页面预览 + 区域框   │              │
│ 设置      │  [预览模式] Pixi 画布           │              │
└──────────┴────────────────────────────────┴──────────────┘
```

- **BookletAI 借鉴**：右栏对话 + 中央大纲/分页；简略输入在新建向导第一步。
- **ReadKidz 借鉴**：角色库独立入口；每书锁定画风；分页「一图一文」列表。
- **差异化露出**：页级「资产区域」Tab、Pixi 互动预览 Tab（竞品弱项）。

路由建议：

| 路径 | 页面 |
|------|------|
| `/` | 项目列表 |
| `/characters` | 家庭角色库 |
| `/settings` | 模型 + 画风 |
| `/projects/:id` | 工作台（子 tab：大纲 / 页面 / 资产 / 预览） |
| `/projects/new` | 新建向导 |

### 4. 设置与模型配置模型

```ts
interface LlmProviderConfig {
  id: string;
  name: string;
  provider: 'openai-compatible' | 'custom';
  baseUrl: string;
  apiKey: string;      // mock 阶段明文存 server 内存
  model: string;
  isDefault: boolean;
}

interface ImageProviderConfig {
  id: string;
  name: string;
  provider: 'fal' | 'replicate' | 'openai-compatible' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
  isDefault: boolean;
}

interface ArtStyle {
  id: string;
  name: string;
  description: string;
  promptSuffix: string;  // 画风 prompt 片段
  previewUrl?: string;   // placeholder 图
}
```

设置页两个 Tab：**模型**、**画风**。支持增删改、设默认；禁止删除当前默认项（须先切换默认）。

### 5. 固定角色库

```ts
interface Character {
  id: string;
  name: string;
  relation: 'baby' | 'dad' | 'mom' | 'other';
  appearance: string;       // 外貌描述文本
  referenceImageUrl: string; // 占位 URL 或 /mock/xxx.png
  createdAt: string;
  updatedAt: string;
}
```

- **一角色一图**；编辑页可「模拟生成参考图」替换 placeholder。
- 新建故事向导多选出场主角；写入 `project.castCharacterIds`。
- 临时角色（如小黑猪）出现在大纲 `page.temporaryCharacters`，不进全局库。

### 6. 故事工作台 Mock 流程

```
POST /projects          { brief, castCharacterIds, artStyleId, llmId, imageId }
  → 返回 project + 8 页 outline（固定模板或基于 brief 关键词）

POST /projects/:id/chat { message }
  → 解析简单指令（「第3页」「爸爸」「温馨」）→ patch outline + 回复文本

POST /projects/:id/pages/:n/mock-generate
  → 页状态 generating → ready，填充 placeholder 图 URL + mock scene.json
```

大纲页结构：

```ts
interface OutlinePage {
  pageNumber: number;
  summary: string;
  text: string;
  castCharacterIds: string[];
  temporaryCharacters: string[];
  status: 'draft' | 'generating' | 'ready';
}
```

### 7. 页级资产区域编辑器（UI 占位）

```ts
interface AssetRegion {
  id: string;
  role: 'background' | 'sprite_frame' | 'preview_only';
  rect: { x: number; y: number; w: number; h: number }; // 0-1 归一化
  sequenceId?: string;
  frameIndex?: number;
}

interface AssetSheet {
  sourceUrl: string;
  regions: AssetRegion[];
  sequences: Record<string, { frames: string[]; fps: number; loop: boolean }>;
}
```

- 导入使用内置 mock 图集 URL（含小黑猪试验图路径占位）。
- 画布上拖拽矩形；属性面板选 role / 序列。
- 裁剪导出本阶段 **mock**（仅更新 JSON，不实际写文件）。

### 8. Pixi 预览引擎

- 挂载于工作台「预览」Tab 全屏区域。
- 读取当前页 `scene.json`（mock 生成）。
- 实现模板：`stagger_pop_in`（三只猪依次弹出，用 colored placeholder sprites）。
- L2：`sprite_sequence` 按 `fps` 循环播放 mock 帧 URL 列表。
- 翻页：上一页 / 下一页按钮 + 页码指示。

依赖 `@pixi/react` 或 imperative `Application` 挂载到 div ref。

### 9. API 概览（Mock REST）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/PUT | `/api/settings/llm` | LLM 配置列表 |
| GET/PUT | `/api/settings/image` | 生图配置列表 |
| GET/POST/PUT/DELETE | `/api/art-styles` | 画风 CRUD |
| GET/POST/PUT/DELETE | `/api/characters` | 角色 CRUD |
| GET/POST | `/api/projects` | 项目列表 / 创建 |
| GET/PATCH | `/api/projects/:id` | 详情 / 更新 meta |
| GET/PATCH | `/api/projects/:id/outline` | 大纲 |
| POST | `/api/projects/:id/chat` | 对话 mock |
| GET/PATCH | `/api/projects/:id/pages/:n` | 单页 |
| POST | `/api/projects/:id/pages/:n/mock-generate` | 模拟配图 |
| GET/PATCH | `/api/projects/:id/pages/:n/asset-sheet` | 区域编辑 |

CORS 开放给 `localhost:5173`。

## 风险 / 权衡

| 风险 | 缓解 |
|------|------|
| Mock 与真实 AI 响应形状不一致 | scene-schema + OpenAPI 注释；下一阶段只换 service 实现 |
| Pixi + React 集成复杂度 | 预览 Tab 独立组件，unmount 时 destroy renderer |
| 界面范围大、任务过重 | tasks 分 2h 块；预览与区域编辑可后移但仍在本变更内 |
| API Key 明文 | mock 阶段仅本地；design 备注下一阶段加密/环境变量 |
| 竞品对齐主观 | 以 BookletAI/ReadKidz 公开 UI 的「大纲+对话」「角色+画风」为最低对齐，不复制视觉 |

## 迁移计划

1. 本变更交付 mock 全链路可演示版本
2. 下一变更 `real-ai-integration`：替换 chat / generate handler，接入 LLM adapter
3. 再下一变更 `local-persistence`：SQLite + `data/` 目录，mock seed 迁入迁移脚本

回滚：纯新增仓库内容，无生产部署。

## 待决问题

1. Mock 持久化是否默认开启 localStorage 同步 settings？（倾向：仅 settings 同步）
2. 新建向导一步还是多步？（倾向：2 步 — 梗概+选角 / 画风+模型）
3. 预览引擎是否第一版就接真实小黑猪试验图 assets？（倾向：是，放 `apps/web/public/mock/`）
