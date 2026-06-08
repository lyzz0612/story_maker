interface LoadingProps {
  label?: string;
}

export function Loading({ label = "加载中..." }: LoadingProps) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/70 text-sm font-semibold text-slate-500">
      <span className="mr-3 h-3 w-3 animate-ping rounded-full bg-honey" />
      {label}
    </div>
  );
}
