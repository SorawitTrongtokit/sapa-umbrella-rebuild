"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, RotateCcw, Shield, type LucideIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { groupUmbrellas, statusLabel } from "@/lib/umbrella";
import type { BorrowTransaction, Location, Profile, Umbrella } from "@/lib/types";

type AdminClientProps = {
  locations: Location[];
  initialUmbrellas: Umbrella[];
  recentTransactions: BorrowTransaction[];
  users: Profile[];
};

type PendingAction = {
  umbrella: Umbrella;
  action: "enable" | "disable" | "mark_available";
};

export function AdminClient({ locations, initialUmbrellas, recentTransactions, users }: AdminClientProps) {
  const [umbrellas, setUmbrellas] = useState(initialUmbrellas);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin:umbrellas")
      .on("postgres_changes", { event: "*", schema: "public", table: "umbrellas" }, (payload) => {
        const next = payload.new as Umbrella;
        if (!next?.id) return;
        setUmbrellas((current) =>
          current.map((umbrella) => (umbrella.id === next.id ? { ...umbrella, ...next } : umbrella))
        );
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const groups = useMemo(() => groupUmbrellas(umbrellas, locations), [umbrellas, locations]);
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  async function submitAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingAction) return;
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/umbrellas/${pendingAction.umbrella.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: pendingAction.action, reason })
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setIsSaving(false);

    if (payload.ok) {
      setPendingAction(null);
      setReason("");
      setMessage("บันทึกการจัดการร่มแล้ว");
    } else {
      setMessage(payload.error ?? "ทำรายการไม่สำเร็จ");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        {message ? (
          <p className="rounded-[8px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</p>
        ) : null}
        {groups.map((group) => (
          <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm" key={group.location.id}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">{group.location.name_th}</h2>
              <span className="text-sm text-slate-600">{group.umbrellas.length} คัน</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.umbrellas.map((umbrella) => {
                const borrower = umbrella.borrowed_by ? usersById.get(umbrella.borrowed_by) : null;
                return (
                  <article className="rounded-[8px] border border-slate-200 bg-slate-50 p-4" key={umbrella.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-950">ร่ม #{umbrella.id}</h3>
                        <p className="mt-1 text-sm text-slate-600">{statusLabel[umbrella.status]}</p>
                      </div>
                      <Shield aria-hidden="true" className="text-slate-400" size={20} />
                    </div>
                    {borrower ? (
                      <p className="mt-3 rounded-[8px] bg-white px-3 py-2 text-sm text-slate-700">
                        ผู้ยืม: {borrower.display_name || borrower.email}
                      </p>
                    ) : null}
                    {umbrella.disabled_reason ? (
                      <p className="mt-3 text-sm text-red-700">เหตุผล: {umbrella.disabled_reason}</p>
                    ) : null}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <ActionButton
                        icon={CheckCircle2}
                        label="เปิด"
                        onClick={() => setPendingAction({ umbrella, action: "enable" })}
                      />
                      <ActionButton
                        icon={Ban}
                        label="ปิด"
                        onClick={() => setPendingAction({ umbrella, action: "disable" })}
                      />
                      <ActionButton
                        icon={RotateCcw}
                        label="ว่าง"
                        onClick={() => setPendingAction({ umbrella, action: "mark_available" })}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>

      <aside className="space-y-5">
        <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">ทำรายการผู้ดูแล</h2>
          {pendingAction ? (
            <form className="mt-4 space-y-3" onSubmit={submitAction}>
              <p className="text-sm text-slate-700">
                ร่ม #{pendingAction.umbrella.id} | {pendingAction.action}
              </p>
              <label className="block text-sm font-medium text-slate-700">
                เหตุผล
                <textarea
                  className="focus-ring mt-1.5 min-h-24 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="focus-ring cursor-pointer rounded-[8px] border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() => setPendingAction(null)}
                >
                  ยกเลิก
                </button>
                <button
                  className="focus-ring cursor-pointer rounded-[8px] bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "กำลังบันทึก" : "ยืนยัน"}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">เลือกคำสั่งบนการ์ดร่มเพื่อเปิด ปิด หรือปรับสถานะเป็นว่าง</p>
          )}
        </section>

        <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">ประวัติล่าสุด</h2>
          <div className="mt-4 space-y-3">
            {recentTransactions.slice(0, 12).map((transaction) => {
              const user = usersById.get(transaction.borrower_id);
              return (
                <div className="rounded-[8px] border border-slate-200 p-3 text-sm" key={transaction.id}>
                  <p className="font-medium text-slate-900">ร่ม #{transaction.umbrella_id}</p>
                  <p className="mt-1 text-slate-600">{user?.display_name || user?.email || "ไม่ทราบผู้ใช้"}</p>
                  <p className="mt-1 text-xs text-slate-500">{transaction.status}</p>
                </div>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="focus-ring flex cursor-pointer items-center justify-center gap-1 rounded-[8px] border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
      type="button"
      onClick={onClick}
    >
      <Icon aria-hidden={true} size={15} />
      {label}
    </button>
  );
}
