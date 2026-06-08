## 新增需求

### 需求:Monorepo 可启动开发环境

系统必须使用 pnpm workspace 组织 `apps/web`、`apps/server`、`packages/scene-schema`，并提供根级 `dev` 脚本同时启动前端与 mock 后端。

#### 场景:开发者启动项目

- **当** 开发者在仓库根目录执行 `pnpm install` 后执行 `pnpm dev`
- **那么** 前端开发服务器与 mock API 服务必须均可访问，且控制台无启动致命错误

### 需求:共享类型包可被前后端引用

系统必须在 `packages/scene-schema` 中导出 Project、Character、ArtStyle、ProviderConfig、SceneGraph 等核心 TypeScript 类型，且 `apps/web` 与 `apps/server` 必须能正确引用该包。

#### 场景:类型包被应用引用

- **当** 应用代码从 `scene-schema` 导入类型并编译
- **那么** TypeScript 编译必须通过，不得出现模块解析失败

### 需求:应用具备基础路由与布局壳

前端必须提供带侧栏导航的应用布局，并包含指向项目列表、角色库、设置页的可达路由。

#### 场景:用户浏览主导航

- **当** 用户打开应用根路径
- **那么** 系统必须展示项目列表页或重定向至项目列表，且侧栏必须可导航至角色库与设置页
