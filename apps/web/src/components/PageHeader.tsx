import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-enter mb-8 flex items-start justify-between gap-6">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className="font-display text-[2.1rem] font-black leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="page-enter-delay-1 shrink-0 pt-1">{actions}</div> : null}
    </header>
  );
}
