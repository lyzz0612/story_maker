import type { ReactNode } from "react";

interface FormDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function FormDialog({ open, title, onClose, children }: FormDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-white/80 bg-paper p-7 shadow-lift"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-dialog-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="form-dialog-title" className="font-display text-xl font-black text-ink">
            {title}
          </h2>
          <button
            aria-label="关闭"
            className="rounded-xl px-2 py-1 text-lg leading-none text-ink-soft transition hover:bg-white hover:text-ink"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
