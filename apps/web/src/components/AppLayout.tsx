import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "项目", description: "绘本工作台", icon: "📖" },
  { to: "/characters", label: "角色库", description: "家庭主角", icon: "🎭" },
  { to: "/settings", label: "设置", description: "模型与画风", icon: "⚙️" }
];

export function AppLayout() {
  return (
    <div className="studio-bg relative min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-white/60 bg-white/50 p-5 backdrop-blur-xl">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-honey/30 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-mint/25 blur-xl"
          />
          <p className="eyebrow relative text-honey-light">Story Maker</p>
          <h1 className="font-display relative mt-3 text-[1.65rem] font-black leading-snug tracking-tight">
            AI 互动绘本
            <span className="mt-0.5 block text-honey-light">制作工坊</span>
          </h1>
        </div>

        <nav className="mt-7 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                [
                  "group relative block rounded-2xl px-4 py-3.5 transition duration-200",
                  isActive
                    ? "bg-honey text-ink shadow-soft"
                    : "text-ink-soft hover:bg-white/70 hover:text-ink"
                ].join(" ")
              }
              end={item.to === "/"}
              to={item.to}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute inset-y-2 -left-0.5 w-1 rounded-full bg-ink/20"
                    />
                  ) : null}
                  <span className="flex items-center gap-3">
                    <span className="text-lg leading-none opacity-80" aria-hidden>
                      {item.icon}
                    </span>
                    <span>
                      <span className="font-display block text-base font-black">{item.label}</span>
                      <span className="mt-0.5 block text-xs font-semibold opacity-65">
                        {item.description}
                      </span>
                    </span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-dashed border-paper-deep/80 bg-paper/60 p-4 text-xs leading-relaxed text-ink-soft">
          <span className="font-display font-black text-ink">本地创作</span>
          <p className="mt-1.5">
            前端通过 <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px] text-ink">/api</code>{" "}
            连接服务，数据保存在当前会话。
          </p>
        </div>
      </aside>

      <main className="relative z-10 ml-72 min-h-screen p-8 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}
