"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
};

export function Sheet({ open, onClose, label, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-label={label}
      className="sheet"
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // The padded inner panel covers the dialog, so a direct hit means the backdrop.
        if (event.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className="relative p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <button
            className="btn btn-ghost btn-sm absolute right-4 top-4 hidden w-9 px-0 sm:inline-flex"
            type="button"
            aria-label="ปิด"
            onClick={onClose}
          >
            <X aria-hidden="true" size={18} />
          </button>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
