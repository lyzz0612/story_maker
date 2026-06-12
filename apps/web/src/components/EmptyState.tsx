import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: string;
}

export function EmptyState({ title, description, action, icon = "✦" }: EmptyStateProps) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-paper-deep bg-white/50 p-12 text-center">
      <div
        aria-hidden
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-honey/25 via-berry/15 to-mint/20 text-2xl"
        style={{ animation: "gentle-float 3s ease-in-out infinite" }}
      >
        {icon}
      </div>
      <h2 className="font-display text-xl font-black text-ink">{title}</h2>
      <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-ink-soft">{description}</p>
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}
