"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, History, Info, LayoutGrid, MapPin, RotateCcw, Search, type LucideIcon } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Toast, useToast } from "@/components/ui/Toast";
import { borrowStatusLabel } from "@/lib/labels";
import { groupUmbrellas } from "@/lib/umbrella";
import type { BorrowTransaction, Location, Profile, Umbrella } from "@/lib/types";

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

const actionLabel: Record<PendingAction["action"], string> = {
  enable: "เปิดใช้งาน",
  disable: "ปิดใช้งาน",
  mark_available: "ปรับเป็นว่าง"
};

export function AdminClient({ locations, initialUmbrellas, recentTransactions, users }: AdminClientProps) {
  const [umbrellas, setUmbrellas] = useState(initialUmbrellas);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const { toast, notify, dismiss } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Poll umbrella statuses every 10s (no realtime provider on Neon).
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/umbrellas", { cache: "no-store" });
        const payload = (await response.json()) as { ok: boolean; data?: Umbrella[] };
        if (payload.ok && Array.isArray(payload.data)) {
          setUmbrellas(payload.data);
        }
      } catch {
        // Keep current state on transient failures.
      }
    }, 10000);

    return () => {
      clearInterval(interval);
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

  function selectedUmbrellas() {
    return umbrellas.filter((u) => selectedIds.has(u.id));
  }

  async function submitAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingAction || pendingAction.umbrellas.length === 0) return;
    setIsSaving(true);
    dismiss();

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
      notify("success", `ทำรายการสำเร็จสำหรับร่มทั้ง ${successCount} คันเรียบร้อยแล้ว`);
    } else {
      notify("error", `ทำรายการสำเร็จ ${successCount} คัน, ล้มเหลว ${failCount} คัน`);
    }
  }

  function borrowerName(umbrella: Umbrella) {
    const borrower = umbrella.borrowed_by ? usersById.get(umbrella.borrowed_by) : null;
    return borrower?.display_name || borrower?.email || "-";
  }

  return (
    <div className="space-y-5">
      <Toast toast={toast} onDismiss={dismiss} />

      <div className="flex animate-rise flex-wrap items-center justify-between gap-3">
        <Segmented
          label="เมนูจัดการ"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "dashboard", label: "แผงควบคุม", icon: LayoutGrid },
            { value: "history", label: "ประวัติการยืม", icon: History }
          ]}
        />
        <p className="flex items-start gap-2 rounded-2xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn">
          <Info aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
          การปรับสถานะร่มจะถูกบันทึกใน Audit Log ทุกครั้ง กรุณาตรวจสอบร่มจริงก่อนดำเนินการ
        </p>
      </div>

      {/* Per-location counts */}
      <div className="grid gap-3 sm:grid-cols-3">
        {groups.map((group, index) => (
          <section
            className="card flex animate-rise items-center gap-3 p-4"
            key={group.location.id}
            style={{ animationDelay: `${60 + index * 60}ms` }}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
              <MapPin aria-hidden="true" size={19} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-ink">{group.location.name_th}</h3>
              <p className="text-sm text-muted">
                {group.umbrellas.length} คัน · ว่าง {group.umbrellas.filter((u) => u.status === "available").length}
              </p>
            </div>
          </section>
        ))}
      </div>

      {activeTab === "dashboard" ? (
        <>
          <section className="card animate-rise overflow-hidden [animation-delay:200ms]">
            <div className="p-5">
              <h2 className="text-lg font-semibold text-ink">รายการร่มทั้งหมด</h2>
              <p className="text-sm text-muted">
                แสดง {filteredUmbrellas.length} จาก {umbrellas.length} คัน
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
                  <input
                    aria-label="ค้นหาร่ม"
                    className="field pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาตามรหัส หรือชื่อร่ม..."
                  />
                </div>
                <select
                  aria-label="กรองตามสถานที่"
                  className="field"
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
                <select
                  aria-label="กรองตามสถานะ"
                  className="field"
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

            {/* Desktop table */}
            <div className="hidden overflow-x-auto border-t border-line sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-canvas text-muted">
                  <tr>
                    <th className="w-12 px-5 py-3">
                      <input
                        aria-label="เลือกทั้งหมด"
                        type="checkbox"
                        className="size-4 cursor-pointer accent-accent"
                        checked={filteredUmbrellas.length > 0 && selectedIds.size === filteredUmbrellas.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">รหัสร่ม</th>
                    <th className="px-3 py-3 font-medium">สถานที่</th>
                    <th className="px-3 py-3 font-medium">สถานะ</th>
                    <th className="px-3 py-3 font-medium">ผู้ยืมล่าสุด</th>
                    <th className="px-5 py-3 text-right font-medium">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredUmbrellas.map((umbrella) => (
                    <tr
                      className={`transition-colors duration-150 ${selectedIds.has(umbrella.id) ? "bg-accent-soft/60" : "hover:bg-canvas"}`}
                      key={umbrella.id}
                    >
                      <td className="px-5 py-3">
                        <input
                          aria-label={`เลือกร่ม #${umbrella.id}`}
                          type="checkbox"
                          className="size-4 cursor-pointer accent-accent"
                          checked={selectedIds.has(umbrella.id)}
                          onChange={() => toggleSelect(umbrella.id)}
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold text-ink">ร่ม #{umbrella.id}</td>
                      <td className="px-3 py-3 text-ink-soft">
                        {locationNameById.get(umbrella.location_id) ?? umbrella.location_id}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={umbrella.status} />
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{borrowerName(umbrella)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <IconAction
                            icon={CheckCircle2}
                            label="เปิดใช้งาน"
                            hover="hover:bg-ok-soft hover:text-ok"
                            disabled={umbrella.status !== "disabled"}
                            onClick={() => setPendingAction({ umbrellas: [umbrella], action: "enable" })}
                          />
                          <IconAction
                            icon={RotateCcw}
                            label="ปรับเป็นว่าง"
                            hover="hover:bg-accent-soft hover:text-accent-strong"
                            onClick={() => setPendingAction({ umbrellas: [umbrella], action: "mark_available" })}
                          />
                          <IconAction
                            icon={Ban}
                            label="ปิดใช้งาน"
                            hover="hover:bg-danger-soft hover:text-danger"
                            onClick={() => setPendingAction({ umbrellas: [umbrella], action: "disable" })}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUmbrellas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted">
                        ไม่พบร่มที่ตรงตามเงื่อนไข
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 border-t border-line p-4 sm:hidden">
              {filteredUmbrellas.map((umbrella) => {
                const isChecked = selectedIds.has(umbrella.id);
                return (
                  <article
                    className={`rounded-2xl border p-4 transition-colors duration-150 ${
                      isChecked ? "border-accent bg-accent-soft/60" : "border-line"
                    }`}
                    key={umbrella.id}
                    onClick={() => toggleSelect(umbrella.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          aria-label={`เลือกร่ม #${umbrella.id}`}
                          type="checkbox"
                          className="size-5 cursor-pointer accent-accent"
                          checked={isChecked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelect(umbrella.id)}
                        />
                        <span className="font-semibold text-ink">ร่ม #{umbrella.id}</span>
                      </div>
                      <StatusBadge status={umbrella.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-xs text-muted">สถานที่</p>
                        <p className="truncate text-ink-soft">{locationNameById.get(umbrella.location_id) ?? umbrella.location_id}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted">ผู้ยืมล่าสุด</p>
                        <p className="truncate text-ink-soft">{borrowerName(umbrella)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => setPendingAction({ umbrellas: [umbrella], action: "mark_available" })}
                      >
                        <RotateCcw aria-hidden="true" size={15} />
                        ปรับเป็นว่าง
                      </button>
                      {umbrella.status === "disabled" ? (
                        <button
                          className="btn btn-sm bg-ok-soft text-ok"
                          type="button"
                          onClick={() => setPendingAction({ umbrellas: [umbrella], action: "enable" })}
                        >
                          <CheckCircle2 aria-hidden="true" size={15} />
                          เปิดใช้งาน
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm bg-danger-soft text-danger"
                          type="button"
                          onClick={() => setPendingAction({ umbrellas: [umbrella], action: "disable" })}
                        >
                          <Ban aria-hidden="true" size={15} />
                          ปิดใช้งาน
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {filteredUmbrellas.length === 0 && <p className="py-8 text-center text-muted">ไม่พบร่มที่ต้องการ</p>}
            </div>
          </section>

          <section className="card animate-rise p-5 [animation-delay:260ms]">
            <h2 className="text-lg font-semibold text-ink">ประวัติล่าสุด</h2>
            <TransactionGrid transactions={recentTransactions.slice(0, 9)} usersById={usersById} />
          </section>
        </>
      ) : (
        <section className="card animate-rise p-5">
          <h2 className="text-lg font-semibold text-ink">ประวัติยืม-คืนร่มทั้งหมด</h2>
          <p className="text-sm text-muted">ประวัติธุรกรรมล่าสุด 40 รายการ</p>
          <TransactionGrid transactions={recentTransactions} usersById={usersById} />
        </section>
      )}

      {/* Floating bulk action bar */}
      {activeTab === "dashboard" && selectedIds.size > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6 lg:pl-64">
          <div className="pointer-events-auto flex animate-pop flex-wrap items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-2.5 pl-4 shadow-lift">
            <span className="mr-1 text-sm font-semibold text-ink">เลือกอยู่ {selectedIds.size} คัน</span>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => setPendingAction({ umbrellas: selectedUmbrellas(), action: "mark_available" })}
            >
              ปรับว่างทั้งหมด
            </button>
            <button
              className="btn btn-danger btn-sm"
              type="button"
              onClick={() => setPendingAction({ umbrellas: selectedUmbrellas(), action: "disable" })}
            >
              ปิดใช้งานทั้งหมด
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setSelectedIds(new Set())}>
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}

      {/* Reason dialog */}
      <Sheet label="ยืนยันการปรับสถานะร่ม" open={pendingAction !== null} onClose={() => setPendingAction(null)}>
        {pendingAction ? (
          <>
            <h3 className="pr-10 text-xl font-bold text-ink">
              {actionLabel[pendingAction.action]} ({pendingAction.umbrellas.length} คัน)
            </h3>
            <p className="mt-1 text-sm text-muted">
              ร่มที่ดำเนินการ: {pendingAction.umbrellas.map((u) => `#${u.id}`).join(", ")}
            </p>

            <form className="mt-5 space-y-4" onSubmit={submitAction}>
              <label className="label">
                ระบุเหตุผล (อย่างน้อย 3 ตัวอักษร)
                <textarea
                  className="field min-h-24"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="เช่น ร่มส่งซ่อมชำรุดเสียหาย, ปรับปรุงข้อมูล..."
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button className="btn btn-secondary" type="button" onClick={() => setPendingAction(null)}>
                  ยกเลิก
                </button>
                <button className="btn btn-primary" disabled={isSaving || reason.trim().length < 3} type="submit">
                  {isSaving ? "กำลังบันทึก..." : "ยืนยันการตั้งค่า"}
                </button>
              </div>
            </form>
          </>
        ) : null}
      </Sheet>
    </div>
  );
}

function TransactionGrid({
  transactions,
  usersById
}: {
  transactions: BorrowTransaction[];
  usersById: Map<string, Profile>;
}) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-muted">ยังไม่มีประวัติการยืม</p>;
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {transactions.map((transaction) => {
        const user = usersById.get(transaction.borrower_id);
        return (
          <article className="rounded-2xl border border-line p-4" key={transaction.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink">ร่ม #{transaction.umbrella_id}</span>
              <span className={`badge ${transaction.status === "active" ? "badge-warn" : transaction.status === "returned" ? "badge-ok" : ""}`}>
                {borrowStatusLabel[transaction.status]}
              </span>
            </div>
            <p className="mt-1.5 truncate text-sm text-ink-soft">{user?.display_name || user?.email || "ไม่ทราบผู้ใช้"}</p>
            <p className="mt-0.5 text-xs text-muted">{new Date(transaction.borrowed_at).toLocaleString("th-TH")}</p>
          </article>
        );
      })}
    </div>
  );
}

function IconAction({
  icon: Icon,
  label,
  hover,
  disabled = false,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  hover: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex size-9 cursor-pointer items-center justify-center rounded-xl text-muted transition duration-150 enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 ${
        disabled ? "" : hover
      }`}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden="true" size={17} />
    </button>
  );
}
