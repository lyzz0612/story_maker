## 1. Monorepo 与共享类型

- [x] 1.1 初始化 pnpm workspace：`apps/web`、`apps/server`、`packages/scene-schema`，配置根 `package.json` 与 `pnpm-workspace.yaml`
- [x] 1.2 在 `scene-schema` 定义 Character、ArtStyle、LlmProviderConfig、ImageProviderConfig、Project、OutlinePage、AssetSheet、SceneGraph 类型并导出
- [ ] 1.3 配置 TypeScript 工程引用（web/server 均依赖 scene-schema）
- [ ] 1.4 添加根脚本 `pnpm dev` 并行启动 Vite（5173）与 Fastify（3000），配置 web 代理 `/api` → server
- [x] 1.5 添加 ESLint + Prettier 基础配置与 `.env.example`

## 2. Mock 后端

- [ ] 2.1 搭建 Fastify 应用骨架，启用 CORS，统一 `/api` 前缀
- [ ] 2.2 实现内存 store 模块与 `seed.ts`（3 家庭角色、3+ 画风、2 模型配置、1 只三只小猪示例项目）
- [ ] 2.3 实现 `/api/settings/llm` 与 `/api/settings/image` GET/PUT（含默认项互斥逻辑）
- [ ] 2.4 实现 `/api/art-styles` CRUD
- [ ] 2.5 实现 `/api/characters` CRUD（含模拟生成参考图端点）
- [ ] 2.6 实现 `/api/projects` 列表/创建（简略梗概 → mock 大纲生成）
- [ ] 2.7 实现 `/api/projects/:id` 详情、outline PATCH、`/chat` mock（关键词 patch 第 N 页）
- [ ] 2.8 实现 `/api/projects/:id/pages/:n` 读写、`mock-generate`、`asset-sheet` 读写

## 3. 前端壳与路由

- [ ] 3.1 初始化 Vite + React + TypeScript + Tailwind
- [ ] 3.2 实现 AppLayout（侧栏：项目、角色库、设置）与 React Router 路由表
- [ ] 3.3 配置 Zustand 或等价方案封装 API client 与加载状态
- [ ] 3.4 实现通用 UI 组件：PageHeader、Loading、EmptyState、ConfirmDialog

## 4. 设置页

- [ ] 4.1 实现「模型」Tab：LLM 列表、表单增删改、设默认
- [ ] 4.2 实现「模型」Tab：生图模型列表、表单增删改、设默认、删除保护
- [ ] 4.3 实现「画风」Tab：画风列表、表单增删改、prompt 片段编辑、预览占位图

## 5. 家庭角色库

- [ ] 5.1 实现角色列表页（卡片：名字、关系、参考图缩略图）
- [ ] 5.2 实现角色创建/编辑表单（名字、关系、外貌描述）
- [ ] 5.3 实现「模拟生成参考图」按钮与参考图展示（一角色一图）
- [ ] 5.4 实现角色删除与空状态引导

## 6. 项目列表与新建向导

- [ ] 6.1 实现项目列表页（标题、页数、画风、更新时间）
- [ ] 6.2 实现新建向导 Step1：简略梗概输入 + 多选家庭主角
- [ ] 6.3 实现新建向导 Step2：选择画风、LLM、生图模型并提交创建
- [ ] 6.4 创建成功后跳转项目工作台

## 7. 故事工作台

- [ ] 7.1 实现工作台框架：顶栏（书名、锁定画风）、Tab（大纲 / 页面 / 资产 / 预览）
- [ ] 7.2 实现大纲 Tab：分页卡片列表（摘要、出场角色、页码），点击选中当前页
- [ ] 7.3 实现右侧对话面板：消息列表、输入框、发送调用 mock chat API
- [ ] 7.4 对话发送后刷新大纲/当前页，展示 mock AI 回复

## 8. 分页编辑

- [ ] 8.1 实现页面 Tab：当前页文案编辑与保存
- [ ] 8.2 展示页摘要、固定/临时角色标签、配图状态
- [ ] 8.3 实现「模拟生成配图」按钮与 generating → ready 状态 UI
- [ ] 8.4 mock 生成后关联占位图与 scene.json 路径

## 9. 资产区域编辑器

- [ ] 9.1 实现资产 Tab：加载 mock 图集（含小黑猪盖房占位图到 `public/mock/`）
- [ ] 9.2 实现画布矩形绘制/拖拽/调整，归一化坐标换算
- [ ] 9.3 实现区域属性面板：role（background / sprite_frame / preview_only）、sequenceId、frameIndex
- [ ] 9.4 实现帧序列分组编辑（fps、loop）与保存至 asset-sheet API
- [ ] 9.5 实现「模拟导出区域」反馈（逻辑文件名映射）

## 10. Pixi 预览引擎

- [ ] 10.1 集成 Pixi Application 挂载组件，随 Tab 切换正确 destroy/recreate
- [ ] 10.2 实现 scene.json 加载：background 层 + 多 sprite 层
- [ ] 10.3 实现 `stagger_pop_in` 模板与 tap 触发
- [ ] 10.4 实现 `sprite_sequence` L2 帧循环播放
- [ ] 10.5 实现翻页控件与页码指示，切换页时重载 scene
- [ ] 10.6 为三只小猪示例项目 seed 预置可演示的 intro（L1）与盖房（L2）scene.json

## 11. 收尾与验证

- [ ] 11.1 复制试验资产到 `apps/web/public/mock/`（小黑猪图集、角色 ref 占位）
- [x] 11.2 编写根目录 README：安装、启动、mock 流程说明
- [ ] 11.3 走通验收路径：设置 → 角色库 → 新建项目 → 对话改大纲 → 模拟配图 → 框选区域 → 预览翻页与点击交互
- [ ] 11.4 确认全程无真实外网 AI 请求
