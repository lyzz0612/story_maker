interface LoadingProps {
  label?: string;
}

export function Loading({ label = "加载中..." }: LoadingProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-[1.75rem] border border-dashed border-paper-deep bg-white/50">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2.5 w-2.5 rounded-full bg-honey"
            style={{
              animation: "gentle-float 1.2s ease-in-out infinite",
              animationDelay: `${index * 0.15}s`
            }}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-ink-soft">{label}</span>
    </div>
  );
}
