import { useEffect, useMemo, useState } from "react";

const STAGE_MESSAGES = [
  "正在理解提示词…",
  "模型构图与上色中…",
  "细化角色与背景…",
  "最后润色，即将完成…"
];

function formatElapsed(seconds: number) {
  if (seconds < 60) {
    return `${seconds} 秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} 分 ${rest} 秒`;
}

export function AssetGenerateProgress({
  startedAt,
  compact = false
}: {
  startedAt: string;
  compact?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedMs = Date.parse(startedAt);
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const stageMessage = useMemo(
    () => STAGE_MESSAGES[Math.min(STAGE_MESSAGES.length - 1, Math.floor(elapsed / 3))],
    [elapsed]
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="badge badge-honey">后台生图</span>
        <span className="font-semibold text-ink">{stageMessage}</span>
        <span className="text-ink-soft">已等待 {formatElapsed(elapsed)}</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[320px] flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-br from-honey/20 via-paper-deep to-mint/20 px-8 text-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2s ease-in-out infinite"
        }}
      />

      <span
        aria-hidden
        className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 text-2xl shadow-soft"
        style={{ animation: "gentle-float 1.8s ease-in-out infinite" }}
      >
        ✨
      </span>

      <div className="relative z-10 space-y-2">
        <p className="font-display text-lg font-black text-ink">AI 正在后台绘制图集</p>
        <p className="text-sm font-semibold text-ink-soft">{stageMessage}</p>
        <p className="text-xs text-ink-soft/80">已等待 {formatElapsed(elapsed)} · 可先关闭弹窗，完成后会提醒</p>
      </div>

      <div className="relative z-10 h-1.5 w-48 overflow-hidden rounded-full bg-white/50">
        <div
          className="h-full rounded-full bg-honey"
          style={{
            width: `${Math.min(92, 18 + elapsed * 6)}%`,
            transition: "width 1s ease"
          }}
        />
      </div>

      <div className="relative z-10 flex gap-1.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-honey"
            style={{
              animation: "gentle-float 1.2s ease-in-out infinite",
              animationDelay: `${dot * 0.2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}
