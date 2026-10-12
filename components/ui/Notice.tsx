import { CheckCircle2, CircleAlert, Info } from "lucide-react";

export type NoticeTone = "success" | "error" | "info";

const toneStyles: Record<NoticeTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "bg-ok-soft text-ok" },
  error: { icon: CircleAlert, className: "bg-danger-soft text-danger" },
  info: { icon: Info, className: "bg-accent-soft text-accent-strong" }
};

export function Notice({ tone, children }: { tone: NoticeTone; children: React.ReactNode }) {
  const { icon: Icon, className } = toneStyles[tone];
  return (
    <p
      className={`flex animate-pop items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
