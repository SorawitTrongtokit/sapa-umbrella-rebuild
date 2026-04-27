"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  History,
  LayoutDashboard,
  MessageSquare,
  RotateCcw,
  Users,
  type LucideIcon
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { groupUmbrellas, statusLabel } from "@/lib/umbrella";
import type { BorrowTransaction, Location, Profile, Umbrella, UmbrellaStatus } from "@/lib/types";

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

const badgeStyles: Record<UmbrellaStatus, string> = {
  available: "border-emerald-200 bg-emerald-100 text-emerald-700",
  borrowed: "border-blue-200 bg-blue-100 text-blue-700",
  disabled: "border-slate-200 bg-slate-100 text-slate-500"
};

const actionLabel: Record<PendingAction["action"], string> = {
  enable: "เปิดใช้งาน",
  disable: "ปิดใช้งาน",
  mark_available: "ปรับเป็นว่าง"
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
  const locationNameById = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name_th])),
    [locations]
  );

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
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-full space-y-6 lg:col-span-3">
        <section className="glass-card rounded-[32px] p-6">
          <h2 className="mb-4 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">เมนูจัดการ</h2>
          <div className="space-y-2">
            <AdminNavButton active icon={LayoutDashboard} label="แผงควบคุม" />
            <AdminNavButton icon={History} label="ประวัติการยืม" />
            <AdminNavButton icon={Users} label="จัดการผู้ใช้" />
            <AdminNavButton icon={MessageSquare} label="คำติชม" />
          </div>
        </section>

        <section className="rounded-3xl border border-orange-100 bg-orange-50 p-6">
          <h3 className="mb-2 text-sm font-black uppercase text-orange-700">คำเตือน</h3>
          <p className="text-xs font-medium leading-6 text-orange-600">
            การแก้ไขสถานะร่มจะถูกบันทึกใน audit log ทุกครั้ง โปรดตรวจสอบร่มจริงก่อนดำเนินการ
          </p>
        </section>

        <section className="glass-card rounded-[32px] p-6">
          <h2 className="text-base font-black text-blue-950">ทำรายการผู้ดูแล</h2>
          {pendingAction ? (
            <form className="mt-4 space-y-3" onSubmit={submitAction}>
              <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-slate-700">
                ร่ม #{pendingAction.umbrella.id} • {actionLabel[pendingAction.action]}
              </p>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                เหตุผล
                <textarea
                  className="focus-ring field-control mt-2 min-h-28 w-full rounded-2xl px-4 py-3 text-sm"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="focus-ring min-h-11 cursor-pointer rounded-2xl border-2 border-slate-100 bg-white px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-50"
                  type="button"
                  onClick={() => setPendingAction(null)}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn-primary focus-ring cursor-pointer px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "กำลังบันทึก" : "ยืนยัน"}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
              เลือกปุ่มคำสั่งในตารางเพื่อเปิด ปิด หรือ override สถานะร่ม
            </p>
          )}
        </section>
      </aside>

      <section className="col-span-full space-y-6 lg:col-span-9">
        {message ? (
          <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900" role="status">
            {message}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {groups.map((group, index) => (
            <section className="glass-card rounded-[28px] p-5" key={group.location.id}>
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-10 items-center justify-center rounded-2xl text-sm font-black text-white shadow-lg ${
                    index === 0
                      ? "bg-orange-400 shadow-orange-100"
                      : index === 1
                        ? "bg-blue-400 shadow-blue-100"
                        : "bg-purple-400 shadow-purple-100"
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-black text-blue-950">{group.location.name_th}</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{group.umbrellas.length} Items</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="overflow-hidden rounded-[32px] border border-sky-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-sky-50 bg-slate-50/40 p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8">
            <div>
              <h2 className="text-2xl font-black tracking-normal text-blue-950">รายการร่มทั้งหมด</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{umbrellas.length} Items Found</p>
            </div>
            <button className="btn-secondary focus-ring px-4 py-2 text-sm" type="button">
              ดาวน์โหลดรายงาน
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-5">รหัสร่ม</th>
                  <th className="px-6 py-5">สถานที่</th>
                  <th className="px-6 py-5">สถานะ</th>
                  <th className="px-6 py-5">ผู้ยืมล่าสุด</th>
                  <th className="px-6 py-5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50 text-sm font-bold">
                {umbrellas.map((umbrella) => {
                  const borrower = umbrella.borrowed_by ? usersById.get(umbrella.borrowed_by) : null;
                  return (
                    <tr className="transition-colors hover:bg-sky-50/40" key={umbrella.id}>
                      <td className="px-6 py-5 text-blue-950">ร่ม #{umbrella.id}</td>
                      <td className="px-6 py-5 font-medium text-slate-500">
                        {locationNameById.get(umbrella.location_id) ?? umbrella.location_id}
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={umbrella.status} />
                      </td>
                      <td className="px-6 py-5 font-mono text-xs text-slate-500">
                        {borrower?.display_name || borrower?.email || "-"}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <IconAction
                            icon={CheckCircle2}
                            label="เปิดใช้งาน"
                            tone="success"
                            onClick={() => setPendingAction({ umbrella, action: "enable" })}
                          />
                          <IconAction
                            icon={RotateCcw}
                            label="ปรับเป็นว่าง"
                            tone="neutral"
                            onClick={() => setPendingAction({ umbrella, action: "mark_available" })}
                          />
                          <IconAction
                            icon={Ban}
                            label="ปิดใช้งาน"
                            tone="danger"
                            onClick={() => setPendingAction({ umbrella, action: "disable" })}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-card rounded-[32px] p-6">
          <h2 className="text-base font-black text-blue-950">ประวัติล่าสุด</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentTransactions.slice(0, 12).map((transaction) => {
              const user = usersById.get(transaction.borrower_id);
              return (
                <article className="rounded-2xl border border-slate-100 bg-white/80 p-4 text-sm shadow-sm" key={transaction.id}>
                  <p className="font-black text-slate-900">ร่ม #{transaction.umbrella_id}</p>
                  <p className="mt-1 truncate font-medium text-slate-600">{user?.display_name || user?.email || "ไม่ทราบผู้ใช้"}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">{transaction.status}</p>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: UmbrellaStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeStyles[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

function AdminNavButton({ active = false, icon: Icon, label }: { active?: boolean; icon: LucideIcon; label: string }) {
  return (
    <button
      className={`flex min-h-12 w-full items-center gap-3 rounded-2xl p-4 text-left text-sm font-bold transition-colors ${
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-600 hover:bg-sky-50"
      }`}
      type="button"
    >
      <Icon aria-hidden="true" size={20} />
      {label}
    </button>
  );
}

function IconAction({
  icon: Icon,
  label,
  tone,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  tone: "success" | "danger" | "neutral";
  onClick: () => void;
}) {
  const colors = {
    success: "hover:bg-emerald-100 hover:text-emerald-700",
    danger: "hover:bg-rose-100 hover:text-rose-700",
    neutral: "hover:bg-blue-100 hover:text-blue-700"
  };

  return (
    <button
      className={`focus-ring flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-colors ${colors[tone]}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon aria-hidden="true" size={18} />
    </button>
  );
}
