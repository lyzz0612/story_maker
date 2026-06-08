## 为什么

Story Maker 目前仅有探索文档，尚无可运行的制作端。需要一次性搭建项目骨架与完整创作界面，用**模拟数据**跑通从角色库 → 新建故事 → 大纲对话 → 配图编排 → 预览的主流程，验证信息架构与交互是否符合 BookletAI / ReadKidz 类竞品的创作习惯，并为后续接入真实 AI 与本地存储打好契约基础。

## 变更内容

- **初始化 monorepo 工程**：`apps/web`（React + Vite + TS）、`apps/server`（Fastify）、`packages/scene-schema`（共享类型）；本地开发可一键启动。
- **设置与模型管理**：用户可配置故事 LLM、生图模型的名称、端点、API Key（本地保存）；画风预设的增删改查，每条含名称与 prompt 片段。
- **固定角色管理（家庭角色库）**：创建/编辑主角（名字、关系、外貌描述、参考图占位）；一角色一图；支持在新建故事时勾选出场。
- **完整创作流程 UI（全模拟）**：
  - 项目列表与新建
  - 简略梗概输入 → 模拟生成分页大纲
  - 大纲面板 + 对话侧栏联动（模拟 AI 回复与大纲 patch）
  - 画风 / 模型选择
  - 分页编辑（每页文案 + 配图占位 / 模拟生成状态）
  - 页级资产区域框选 UI（占位，可手框矩形）
  - Pixi 预览：翻页 + L1 模板演示（`stagger_pop_in`）+ L2 帧序列占位播放
- **数据层全部 Mock**：不接真实 LLM / 生图 API；内存或 localStorage 持久化可选；接口形状与将来真实实现对齐。
- **参考竞品布局**：多面板工作台（左导航 / 中大画布 / 右属性或对话），而非单页向导。

**非目标（本变更不做）**

- 真实 AI 调用、SQLite 落盘、导出 `.storypack`
- 多用户、账号、云同步
- 自由画布、视频时间轴、真实抠图/裁剪流水线

## 功能 (Capabilities)

### 新增功能

- `project-scaffold`: monorepo 初始化、开发脚本、共享类型包、基础路由与布局壳
- `settings-models`: 故事 LLM / 生图模型自定义配置（名称、provider、endpoint、apiKey 等）
- `settings-art-styles`: 画风预设管理（名称、描述、prompt 片段、预览占位）
- `character-library`: 家庭固定角色 CRUD、参考图占位、跨故事复用契约
- `story-workbench`: 项目列表、简略输入、模拟大纲生成、大纲面板与对话联动
- `page-editor`: 分页视图、单页文案/配图/交互占位编辑
- `asset-region-editor`: 页级图集导入占位、手框区域、帧序列分组（UI + mock 数据）
- `preview-engine`: Pixi 翻页预览、L1 动效模板、L2 帧序列 mock 播放

### 修改功能

（无既有规范）

## 影响

- **新建**：整个应用代码库（`apps/*`、`packages/*`）、OpenSpec 功能规范 8 份
- **依赖**：React 19、Vite、TypeScript、Tailwind、Zustand、Fastify、Pixi.js、pnpm workspace
- **API**：`apps/server` 提供 REST mock（settings、characters、projects、pages、chat、preview assets）
- **数据**：初版 mock store；类型与 `packages/scene-schema` 对齐，便于下一阶段替换为 SQLite + 文件系统
