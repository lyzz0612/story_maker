interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  danger = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-[1.75rem] border border-white/80 bg-paper p-7 shadow-lift"
        role="alertdialog"
        aria-modal="true"
      >
        <h2 className="font-display text-xl font-black text-ink">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{description}</p>
        <div className="mt-7 flex justify-end gap-3">
          <button className="btn-secondary" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={danger ? "btn-danger" : "btn-primary"}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
