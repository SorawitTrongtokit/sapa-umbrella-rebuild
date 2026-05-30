"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Filter,
  History,
  LayoutDashboard,
  MessageSquare,
  RotateCcw,
  Search,
  Users,
  X,
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
  umbrellas: Umbrella[];
  action: "enable" | "disable" | "mark_available";
};

const badgeStyles: Record<UmbrellaStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm",
  borrowed: "border-blue-200 bg-blue-50 text-blue-700 shadow-sm",
  disabled: "border-slate-200 bg-slate-50 text-slate-500"
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin:umbrellas")
      .on("postgres_changes", { event: "*", schema: "public", table: "umbrellas" }, (payload: { new: Record<string, unknown> }) => {
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

  const filteredUmbrellas = useMemo(() => {
    return umbrellas.filter((u) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        String(u.id) === searchQuery.trim() ||
        u.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = filterLocation === "all" || u.location_id === filterLocation;
      const matchesStatus = filterStatus === "all" || u.status === filterStatus;
      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [umbrellas, searchQuery, filterLocation, filterStatus]);

  function toggleSelectAll() {
    if (selectedIds.size === filteredUmbrellas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUmbrellas.map((u) => u.id)));
    }
  }

  function toggleSelect(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  async function submitAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingAction || pendingAction.umbrellas.length === 0) return;
    setIsSaving(true);
    setMessage("");

    let successCount = 0;
    let failCount = 0;

    const promises = pendingAction.umbrellas.map(async (u) => {
      try {
        const response = await fetch(`/api/admin/umbrellas/${u.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: pendingAction.action, reason })
        });
        const payload = (await response.json()) as { ok: boolean; error?: string };
        if (payload.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    });

    await Promise.all(promises);
    setIsSaving(false);
    setPendingAction(null);
    setReason("");
    setSelectedIds(new Set());

    if (failCount === 0) {
      setMessage(`ทำรายการสำเร็จสำหรับร่มทั้ง ${successCount} คันเรียบร้อยแล้ว`);
    } else {
      setMessage(`ทำรายการสำเร็จ ${successCount} คัน, ล้มเหลว ${failCount} คัน`);
    }
  }

  return (
    <div className="animate-page grid grid-cols-12 gap-5 lg:gap-6">
      
      {/* Sidebar Controls */}
      <aside className="col-span-full space-y-5 lg:col-span-3">
        <section className="glass-card rounded-[28px] p-5">
          <h2 className="mb-3 px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">เมนูจัดการ</h2>
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
            <AdminNavButton
              active={activeTab === "dashboard"}
              icon={LayoutDashboard}
              label="แผงควบคุม"
              onClick={() => setActiveTab("dashboard")}
            />
            <AdminNavButton
              active={activeTab === "history"}
              icon={History}
              label="ประวัติการยืม"
              onClick={() => setActiveTab("history")}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-amber-800">โปรดทราบ</h3>
          <p className="text-xs font-medium leading-relaxed text-amber-700">
            การปรับสถานะร่มจะถูกบันทึกในประวัติระบบ (Audit Log) ทุกครั้ง กรุณาตรวจสอบร่มจริงก่อนดำเนินการ
          </p>
        </section>
      </aside>

      {/* Main Console Area */}
      <section className="col-span-full space-y-5 lg:col-span-9">
        {message ? (
          <p className="rounded-2xl border border-indigo-200/50 bg-indigo-50/50 px-4 py-3.5 text-xs sm:text-sm font-bold text-indigo-900 animate-pop" role="status">
            {message}
          </p>
        ) : null}

        {/* Location Count Widgets */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {groups.map((group, index) => (
            <section
              className="glass-card rounded-2xl p-4.5"
              key={group.location.id}
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-9 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm ${
                    index === 0
                      ? "premium-gradient-2"
                      : index === 1
                        ? "premium-gradient-1"
                        : "premium-gradient-4"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-slate-800">{group.location.name_th}</h3>
                  <p className="text-[10px] font-bold text-slate-400">{group.umbrellas.length} คัน</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        {activeTab === "dashboard" ? (
          <>
            {/* Inventory control sheet */}
            <section className="overflow-hidden glass-card rounded-[28px]">
              
              <div className="flex flex-col gap-2 border-b border-indigo-50/50 bg-indigo-50/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-800">รายการร่มทั้งหมด</h2>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">พบอุปกรณ์ {umbrellas.length} คัน</p>
                </div>
              </div>

              {/* Filters Panel */}
              <div className="grid grid-cols-1 gap-3 bg-slate-50/40 p-5 sm:grid-cols-3 border-b border-indigo-50/50">
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" size={14} />
                  <input
                    className="focus-ring field-control w-full py-1.5 pl-10 pr-3.5 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาตามรหัส หรือชื่อร่ม..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="focus-ring field-control w-full px-3.5 py-1.5 text-sm"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                  >
                    <option value="all">ทุกสถานที่</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name_th}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="focus-ring field-control w-full px-3.5 py-1.5 text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">ทุกสถานะ</option>
                    <option value="available">ว่าง</option>
                    <option value="borrowed">ถูกยืม</option>
                    <option value="disabled">ปิดใช้งาน</option>
                  </select>
                </div>
              </div>

              {/* Table rendering on desktop / card items list on mobile */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/70 text-[9px] font-black uppercase tracking-wider text-slate-500/80">
                    <tr>
                      <th className="px-5 py-4 w-12">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4 cursor-pointer"
                          checked={filteredUmbrellas.length > 0 && selectedIds.size === filteredUmbrellas.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-5 py-4">รหัสร่ม</th>
                      <th className="px-5 py-4">สถานที่</th>
                      <th className="px-5 py-4">สถานะ</th>
                      <th className="px-5 py-4">ผู้ยืมล่าสุด</th>
                      <th className="px-5 py-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold">
                    {filteredUmbrellas.map((umbrella) => {
                      const borrower = umbrella.borrowed_by ? usersById.get(umbrella.borrowed_by) : null;
                      return (
                        <tr className="transition-colors hover:bg-slate-50/50" key={umbrella.id}>
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4 cursor-pointer"
                              checked={selectedIds.has(umbrella.id)}
                              onChange={() => toggleSelect(umbrella.id)}
                            />
                          </td>
                          <td className="px-5 py-4 text-slate-800">ร่ม #{umbrella.id}</td>
                          <td className="px-5 py-4 font-medium text-slate-500">
                            {locationNameById.get(umbrella.location_id) ?? umbrella.location_id}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={umbrella.status} />
                          </td>
                          <td className="px-5 py-4 font-mono text-[10px] text-slate-500">
                            {borrower?.display_name || borrower?.email || "-"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <IconAction
                                icon={CheckCircle2}
                                label="เปิดใช้งาน"
                                tone="success"
                                disabled={umbrella.status !== "disabled"}
                                onClick={() => setPendingAction({ umbrellas: [umbrella], action: "enable" })}
                              />
                              <IconAction
                                icon={RotateCcw}
                                label="ปรับเป็นว่าง"
                                tone="neutral"
                                onClick={() => setPendingAction({ umbrellas: [umbrella], action: "mark_available" })}
                              />
                              <IconAction
                                icon={Ban}
                                label="ปิดใช้งาน"
                                tone="danger"
                                onClick={() => setPendingAction({ umbrellas: [umbrella], action: "disable" })}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUmbrellas.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-medium">
                          ไม่พบร่มที่ตรงตามเงื่อนไข
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile optimized stack view (Comfortable touch grid) */}
              <div className="sm:hidden divide-y divide-slate-100 p-4 space-y-3.5">
                {filteredUmbrellas.map((umbrella) => {
                  const borrower = umbrella.borrowed_by ? usersById.get(umbrella.borrowed_by) : null;
                  const isChecked = selectedIds.has(umbrella.id);
                  return (
                    <article 
                      className={`rounded-2xl border p-4 transition-all ${
                        isChecked ? "border-indigo-200 bg-indigo-50/20" : "border-slate-100 bg-white/50"
                      }`}
                      key={umbrella.id}
                      onClick={() => toggleSelect(umbrella.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-5 cursor-pointer"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelect(umbrella.id);
                            }}
                          />
                          <span className="text-base font-extrabold text-slate-800">ร่ม #{umbrella.id}</span>
                        </div>
                        <StatusBadge status={umbrella.status} />
                      </div>

                      <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs border-t border-slate-100/50 pt-2.5">
                        <div>
                          <span className="block text-[8px] font-black text-slate-400 uppercase">สถานที่</span>
                          <span className="font-bold text-slate-600">{locationNameById.get(umbrella.location_id) ?? umbrella.location_id}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-black text-slate-400 uppercase">ผู้ยืมล่าสุด</span>
                          <span className="font-bold text-slate-600 truncate block max-w-full">{borrower?.display_name || borrower?.email || "-"}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 bg-white/80 active:scale-95"
                          type="button"
                          onClick={() => setPendingAction({ umbrellas: [umbrella], action: "mark_available" })}
                        >
                          <RotateCcw size={14} />
                          <span>ปรับเป็นว่าง</span>
                        </button>
                        {umbrella.status === "disabled" ? (
                          <button
                            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 active:scale-95"
                            type="button"
                            onClick={() => setPendingAction({ umbrellas: [umbrella], action: "enable" })}
                          >
                            <CheckCircle2 size={14} />
                            <span>เปิดใช้งาน</span>
                          </button>
                        ) : (
                          <button
                            className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 active:scale-95"
                            type="button"
                            onClick={() => setPendingAction({ umbrellas: [umbrella], action: "disable" })}
                          >
                            <Ban size={14} />
                            <span>ปิดใช้งาน</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {filteredUmbrellas.length === 0 && (
                  <p className="text-center py-6 text-slate-400 text-sm font-medium">ไม่พบร่มที่ต้องการ</p>
                )}
              </div>
            </section>

            {/* Float selection action panel at bottom of the screen */}
            {selectedIds.size > 0 && (
              <div className="fixed bottom-4 inset-x-4 z-40 animate-pop sm:relative sm:inset-x-auto sm:bottom-auto">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200/80 bg-white/90 p-4 shadow-xl backdrop-blur-md">
                  <span className="text-xs sm:text-sm font-extrabold text-indigo-950">เลือกอยู่ {selectedIds.size} คัน</span>
                  <div className="flex gap-2 w-full xs:w-auto">
                    <button
                      className="btn-secondary focus-ring flex-1 xs:flex-none px-3.5 py-2 text-xs"
                      type="button"
                      onClick={() => {
                        const selected = umbrellas.filter((u) => selectedIds.has(u.id));
                        setPendingAction({ umbrellas: selected, action: "mark_available" });
                      }}
                    >
                      ปรับว่างทั้งหมด
                    </button>
                    <button
                      className="focus-ring flex-1 xs:flex-none px-3.5 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold active:scale-95"
                      type="button"
                      onClick={() => {
                        const selected = umbrellas.filter((u) => selectedIds.has(u.id));
                        setPendingAction({ umbrellas: selected, action: "disable" });
                      }}
                    >
                      ปิดใช้งานทั้งหมด
                    </button>
                    <button
                      className="focus-ring flex-1 xs:flex-none px-3.5 py-2 text-xs border border-slate-200 bg-white rounded-xl font-bold active:scale-95 text-slate-500"
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section className="glass-card rounded-[28px] p-5">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">ประวัติล่าสุด (Dashboard)</h2>
              <div className="mt-3.5 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                {recentTransactions.slice(0, 9).map((transaction) => {
                  const user = usersById.get(transaction.borrower_id);
                  return (
                    <article className="rounded-xl border border-slate-100 bg-white/40 p-4 text-xs font-bold" key={transaction.id}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-800">ร่ม #{transaction.umbrella_id}</span>
                        <span className="text-[10px] text-slate-400">{transaction.status}</span>
                      </div>
                      <p className="mt-1.5 truncate font-medium text-slate-500">{user?.display_name || user?.email || "ไม่ทราบผู้ใช้"}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <section className="glass-card rounded-[28px] p-5">
            <h2 className="text-lg font-black text-slate-800">ประวัติยืม-คืนร่มทั้งหมด</h2>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ประวัติธุรกรรมล่าสุด 40 รายการ</p>
            <div className="mt-4 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {recentTransactions.map((transaction) => {
                const user = usersById.get(transaction.borrower_id);
                return (
                  <article className="rounded-xl border border-slate-100 bg-white/40 p-4 text-xs font-bold" key={transaction.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-800">ร่ม #{transaction.umbrella_id}</span>
                      <span className="text-[10px] text-slate-400">{transaction.status}</span>
                    </div>
                    <p className="mt-1 truncate font-medium text-slate-500">{user?.display_name || user?.email || "ไม่ทราบผู้ใช้"}</p>
                    <p className="mt-1.5 text-[9px] font-bold text-slate-400">
                      {new Date(transaction.borrowed_at).toLocaleString("th-TH")}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </section>

      {/* Admin action drawer sheet / popup overlay */}
      {pendingAction ? (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/20 backdrop-blur-md p-0 sm:p-4">
          <button
            className="absolute inset-0 bg-transparent cursor-default"
            type="button"
            aria-label="ปิดหน้าต่าง"
            onClick={() => setPendingAction(null)}
          />
          <section className="mobile-bottom-sheet relative w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] border-t sm:border border-white bg-white/95 backdrop-blur-xl p-6 shadow-2xl pb-10 sm:pb-6 animate-pop">
            
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            <button
              className="focus-ring absolute right-5 top-5 flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 sm:flex hidden"
              type="button"
              aria-label="ปิด"
              onClick={() => setPendingAction(null)}
            >
              <X size={15} />
            </button>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800">
                {actionLabel[pendingAction.action]} ({pendingAction.umbrellas.length} คัน)
              </h3>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                ร่มที่ดำเนินการ: {pendingAction.umbrellas.map((u) => `#${u.id}`).join(", ")}
              </p>
            </div>

            <form className="mt-5 space-y-4" onSubmit={submitAction}>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                ระบุเหตุผล (อย่างน้อย 3 ตัวอักษร)
                <textarea
                  className="focus-ring field-control mt-2 min-h-24 w-full px-3.5 py-2.5 text-sm"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="เช่น ร่มส่งซ่อมชำรุดเสียหาย, ปรับปรุงข้อมูล..."
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  className="btn-secondary focus-ring py-2.5 text-xs rounded-xl"
                  type="button"
                  onClick={() => setPendingAction(null)}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn-primary focus-ring py-2.5 text-xs rounded-xl text-white font-bold"
                  disabled={isSaving || reason.trim().length < 3}
                  type="submit"
                >
                  {isSaving ? "กำลังบันทึก..." : "ยืนยันการตั้งค่า"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: UmbrellaStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badgeStyles[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

function AdminNavButton({
  active = false,
  icon: Icon,
  label,
  onClick
}: {
  active?: boolean;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={`flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-bold transition-all duration-200 ${
        active ? "premium-gradient-1 text-white shadow-md shadow-indigo-500/20" : "text-slate-500 hover:bg-indigo-50/50 hover:text-indigo-700"
      }`}
      type="button"
      onClick={onClick}
    >
      <Icon aria-hidden={true} size={16} />
      <span>{label}</span>
    </button>
  );
}

function IconAction({
  icon: Icon,
  label,
  tone,
  disabled = false,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  tone: "success" | "danger" | "neutral";
  disabled?: boolean;
  onClick: () => void;
}) {
  const colors = {
    success: "hover:bg-emerald-100 hover:text-emerald-700",
    danger: "hover:bg-rose-100 hover:text-rose-700",
    neutral: "hover:bg-indigo-100 hover:text-indigo-700"
  };

  return (
    <button
      className={`focus-ring flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${colors[tone]}`}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden="true" size={15} />
    </button>
  );
}
