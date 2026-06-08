import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "项目", description: "绘本工作台" },
  { to: "/characters", label: "角色库", description: "家庭主角" },
  { to: "/settings", label: "设置", description: "模型与画风" }
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffe9bd,transparent_32rem),linear-gradient(135deg,#fff9ef,#eef8f4)]">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-white/70 bg-white/70 p-5 shadow-soft backdrop-blur">
        <div className="rounded-3xl bg-ink p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-honey">Story Maker</p>
          <h1 className="mt-3 text-2xl font-black leading-tight">AI 互动绘本制作端</h1>
        </div>

        <nav className="mt-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                [
                  "block rounded-3xl px-4 py-3 transition",
                  isActive
                    ? "bg-honey text-ink shadow-soft"
                    : "text-slate-600 hover:bg-white hover:text-ink"
                ].join(" ")
              }
              end={item.to === "/"}
              to={item.to}
            >
              <span className="block text-base font-black">{item.label}</span>
              <span className="mt-1 block text-xs font-semibold opacity-70">{item.description}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-3xl border border-dashed border-slate-200 bg-paper p-4 text-xs leading-5 text-slate-500">
          本阶段全部为 mock 数据链路。前端通过 <span className="font-bold text-ink">/api</span>{" "}
          代理到本地服务，不触发真实 AI 请求。
        </div>
      </aside>

      <main className="ml-72 min-h-screen p-8">
        <Outlet />
      </main>
    </div>
  );
}
