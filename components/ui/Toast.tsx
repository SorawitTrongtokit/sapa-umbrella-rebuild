"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info";
type ToastState = { id: number; tone: ToastTone; text: string } | null;

const toneStyles: Record<ToastTone, { icon: typeof Info; color: string }> = {
  success: { icon: CheckCircle2, color: "text-ok" },
  error: { icon: CircleAlert, color: "text-danger" },
  info: { icon: Info, color: "text-accent" }
};

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const nextId = useRef(0);
  const notify = useCallback((tone: ToastTone, text: string) => {
    nextId.current += 1;
    setToast({ id: nextId.current, tone, text });
  }, []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, notify, dismiss };
}

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const { icon: Icon, color } = toneStyles[toast.tone];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4 lg:top-6 lg:pl-64">
      <div
        className="pointer-events-auto flex max-w-md animate-drop items-start gap-3 rounded-2xl border border-line bg-surface py-3 pl-4 pr-2 shadow-lift"
        key={toast.id}
        role={toast.tone === "error" ? "alert" : "status"}
      >
        <Icon aria-hidden="true" className={`mt-0.5 shrink-0 ${color}`} size={20} />
        <p className="min-w-0 flex-1 text-sm font-medium text-ink">{toast.text}</p>
        <button className="btn btn-ghost btn-sm w-8 min-h-8 shrink-0 px-0" type="button" aria-label="ปิดข้อความ" onClick={onDismiss}>
          <X aria-hidden="true" size={16} />
        </button>
      </div>
    </div>
  );
}
