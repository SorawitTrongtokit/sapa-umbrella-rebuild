"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Dumbbell, Home, MapPin, MessageSquare, Save, Umbrella as UmbrellaIcon, Utensils, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Toast, useToast } from "@/components/ui/Toast";
import { findActiveUmbrella, groupUmbrellas, isBorrowedByUser, statusLabel } from "@/lib/umbrella";
import type { BorrowTransaction, Location, Profile, Umbrella } from "@/lib/types";

type DashboardClientProps = {
  profile: Profile;
  locations: Location[];
  initialUmbrellas: Umbrella[];
  activeBorrows: BorrowTransaction[];
};

const locationIcons: Record<string, LucideIcon> = {
  dome: Home,
  sports_center: Dumbbell,
  cafeteria: Utensils
};

export function DashboardClient({ profile, locations, initialUmbrellas, activeBorrows }: DashboardClientProps) {
  const [umbrellas, setUmbrellas] = useState(initialUmbrellas);
  const [selectedUmbrella, setSelectedUmbrella] = useState<Umbrella | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    displayName: profile.display_name ?? "",
    classLevel: profile.class_level ?? "",
    studentNumber: String(profile.student_number ?? "")
  });
  const [feedback, setFeedback] = useState("");
  const { toast, notify, dismiss } = useToast();
  const [busyUmbrella, setBusyUmbrella] = useState<number | null>(null);
  const [activeBorrowIds, setActiveBorrowIds] = useState<Set<number>>(
    () => new Set(activeBorrows.map((item) => item.umbrella_id))
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

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
  const locationNameById = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name_th])),
    [locations]
  );
  const activeUmbrella = useMemo(
    () => findActiveUmbrella(umbrellas, profile.id, activeBorrowIds),
    [activeBorrowIds, profile.id, umbrellas]
  );
  const counts = useMemo(
    () => ({
      available: umbrellas.filter((item) => item.status === "available").length,
      borrowed: umbrellas.filter((item) => item.status === "borrowed").length,
      disabled: umbrellas.filter((item) => item.status === "disabled").length
    }),
    [umbrellas]
  );

  async function actOnUmbrella(umbrella: Umbrella) {
    const previousUmbrellas = umbrellas;
    setBusyUmbrella(umbrella.id);
    const isMine = isBorrowedByUser(umbrella, profile.id, activeBorrowIds);
    const endpoint = isMine ? "return" : "borrow";
    setSelectedUmbrella(null);
    notify("info", isMine ? "กำลังคืนร่ม..." : "กำลังยืมร่ม...");
    setUmbrellas((current) =>
      current.map((item) =>
        item.id === umbrella.id
          ? {
              ...item,
              status: isMine ? "available" : "borrowed",
              borrowed_by: isMine ? null : profile.id,
              borrowed_transaction_id: isMine ? null : item.borrowed_transaction_id
            }
          : item
      )
    );

    try {
      const response = await fetch(`/api/umbrellas/${umbrella.id}/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isMine ? { returnLocationId: umbrella.location_id } : {})
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setUmbrellas(previousUmbrellas);
        notify("error", payload.error ?? "ทำรายการไม่สำเร็จ");
        return;
      }
      setActiveBorrowIds((current) => {
        const next = new Set(current);
        if (isMine) next.delete(umbrella.id);
        else next.add(umbrella.id);
        return next;
      });
      notify("success", isMine ? "คืนร่มเรียบร้อย" : "ยืมร่มเรียบร้อย");
    } catch {
      setUmbrellas(previousUmbrellas);
      notify("error", "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusyUmbrella(null);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    dismiss();
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profileDraft)
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setIsSavingProfile(false);
    if (payload.ok) notify("success", "บันทึกข้อมูลส่วนตัวแล้ว");
    else notify("error", payload.error ?? "บันทึกไม่สำเร็จ");
  }

  async function sendFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSendingFeedback(true);
    dismiss();
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: feedback })
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setIsSendingFeedback(false);
    if (payload.ok) {
      setFeedback("");
      notify("success", "ส่งคำติชมแล้ว ขอบคุณครับ/ค่ะ");
    } else {
      notify("error", payload.error ?? "ส่งคำติชมไม่สำเร็จ");
    }
  }

  const availablePercent = umbrellas.length ? (counts.available / umbrellas.length) * 100 : 0;
  const selectedIsMine = selectedUmbrella ? isBorrowedByUser(selectedUmbrella, profile.id, activeBorrowIds) : false;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <Toast toast={toast} onDismiss={dismiss} />

      <div className="min-w-0 space-y-5">
        {/* Your current borrow */}
        <section
          className={`card relative animate-rise overflow-hidden p-5 transition-colors duration-500 sm:p-6 ${
            activeUmbrella ? "border-transparent bg-accent text-white" : ""
          }`}
        >
          <UmbrellaIcon
            aria-hidden="true"
            className={`absolute -bottom-6 -right-4 size-32 -rotate-12 ${activeUmbrella ? "text-white/10" : "text-sunken"}`}
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={`text-sm font-medium ${activeUmbrella ? "text-white/80" : "text-muted"}`}>สถานะของคุณ</p>
              {activeUmbrella ? (
                <>
                  <p className="mt-1 text-xl font-bold">
                    กำลังยืมร่มหมายเลข{" "}
                    <span className="inline-block animate-pop text-3xl tabular-nums" key={activeUmbrella.id}>
                      {String(activeUmbrella.id).padStart(2, "0")}
                    </span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                    <MapPin aria-hidden="true" size={15} />
                    คืนที่ {locationNameById.get(activeUmbrella.location_id) ?? "-"}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xl font-bold text-ink">ยังไม่มีร่มที่กำลังยืม</p>
                  <p className="mt-1 text-sm text-muted">แตะร่มที่ว่างด้านล่างเพื่อยืม</p>
                </>
              )}
            </div>
            {activeUmbrella ? (
              <button
                className="btn bg-white text-accent-strong hover:bg-white/90"
                disabled={busyUmbrella === activeUmbrella.id}
                type="button"
                onClick={() => setSelectedUmbrella(activeUmbrella)}
              >
                ทำรายการคืนร่ม
              </button>
            ) : null}
          </div>
        </section>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 px-1 text-sm text-muted">
          <LegendItem className="bg-ok" label="ว่าง" />
          <LegendItem className="bg-warn" label="ถูกยืมแล้ว" />
          <LegendItem className="bg-accent" label="ร่มของคุณ" />
          <LegendItem className="border border-dashed border-muted" label="ปิดใช้งาน" />
        </div>

        {/* Locations */}
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {groups.map((group, index) => {
            const Icon = locationIcons[group.location.id] ?? MapPin;
            const free = group.umbrellas.filter((item) => item.status === "available").length;
            return (
              <section
                className="card animate-rise p-4 sm:p-5"
                key={group.location.id}
                style={{ animationDelay: `${80 + index * 70}ms` }}
              >
                <header className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                      <Icon aria-hidden="true" size={19} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-ink">{group.location.name_th}</h2>
                      <p className="text-sm text-muted">{group.umbrellas.length} คัน</p>
                    </div>
                  </div>
                  <span className={`badge ${free > 0 ? "badge-ok" : ""}`}>ว่าง {free}</span>
                </header>

                <div className="grid grid-cols-4 gap-2">
                  {group.umbrellas.map((umbrella) => {
                    const isMine = isBorrowedByUser(umbrella, profile.id, activeBorrowIds);
                    const canAct = isMine || (!activeUmbrella && umbrella.status === "available");
                    return (
                      <UmbrellaTile
                        key={umbrella.id}
                        umbrella={umbrella}
                        isMine={isMine}
                        canAct={canAct}
                        busy={busyUmbrella === umbrella.id}
                        onClick={() => setSelectedUmbrella(umbrella)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <aside className="space-y-5">
        {/* Overview */}
        <section className="card animate-rise p-5 [animation-delay:120ms]">
          <h2 className="font-semibold text-ink">สรุปภาพรวมร่ม</h2>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-sm text-muted">พร้อมใช้งาน</span>
            <span className="text-lg font-bold tabular-nums text-ok">
              {counts.available}
              <span className="text-sm font-medium text-muted">/{umbrellas.length}</span>
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-ok transition-[width] duration-700 ease-soft"
              style={{ width: `${availablePercent}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <SummaryStat label="ว่าง" value={counts.available} className="text-ok" />
            <SummaryStat label="ถูกยืม" value={counts.borrowed} className="text-warn" />
            <SummaryStat label="ปิดใช้งาน" value={counts.disabled} className="text-muted" />
          </div>
        </section>

        {/* Profile */}
        <section className="card animate-rise scroll-mt-20 p-5 [animation-delay:180ms]" id="profile">
          <h2 className="font-semibold text-ink">ข้อมูลส่วนตัว</h2>
          <form className="mt-3 space-y-3" onSubmit={saveProfile}>
            <label className="label">
              ชื่อที่แสดง
              <input
                className="field"
                value={profileDraft.displayName}
                onChange={(event) => setProfileDraft((draft) => ({ ...draft, displayName: event.target.value }))}
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">
                ชั้น
                <input
                  className="field"
                  value={profileDraft.classLevel}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, classLevel: event.target.value }))}
                  required
                />
              </label>
              <label className="label">
                เลขที่
                <input
                  className="field"
                  inputMode="numeric"
                  value={profileDraft.studentNumber}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, studentNumber: event.target.value }))}
                  required
                />
              </label>
            </div>
            <button className="btn btn-primary w-full" disabled={isSavingProfile} type="submit">
              <Save aria-hidden="true" size={17} />
              {isSavingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
          </form>
        </section>

        {/* Feedback */}
        <section className="card animate-rise scroll-mt-20 p-5 [animation-delay:240ms]" id="feedback">
          <h2 className="font-semibold text-ink">ส่งคำติชม</h2>
          <form className="mt-3 space-y-3" onSubmit={sendFeedback}>
            <textarea
              aria-label="คำติชม"
              className="field min-h-24 resize-y"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="พิมพ์ข้อเสนอแนะหรือปัญหาที่พบที่นี่..."
              required
            />
            <button className="btn btn-secondary w-full" disabled={isSendingFeedback} type="submit">
              <MessageSquare aria-hidden="true" size={17} />
              {isSendingFeedback ? "กำลังส่ง..." : "ส่งคำติชม"}
            </button>
          </form>
        </section>
      </aside>

      {/* Borrow / return confirmation */}
      <Sheet
        label="ยืนยันรายการ"
        open={selectedUmbrella !== null}
        onClose={() => setSelectedUmbrella(null)}
      >
        {selectedUmbrella ? (
          <>
            <div className="text-center">
              <div
                className={`mx-auto flex size-16 animate-pop items-center justify-center rounded-3xl ${
                  selectedIsMine ? "bg-accent text-white" : "bg-ok-soft text-ok"
                }`}
              >
                <UmbrellaIcon aria-hidden="true" size={30} />
              </div>
              <h3 className="mt-4 text-2xl font-bold text-ink">ร่ม #{selectedUmbrella.id}</h3>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted">
                <MapPin aria-hidden="true" size={15} />
                {locationNameById.get(selectedUmbrella.location_id) ?? selectedUmbrella.location_id}
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-canvas p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">สถานะร่ม</span>
                <StatusBadge status={selectedUmbrella.status} />
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                {selectedIsMine
                  ? "กดยืนยันเพื่อคืนร่มที่จุดบริการเดิมให้ถูกต้อง"
                  : "กดยืนยันเพื่อบันทึกรายการยืมร่มคันนี้"}
              </p>
            </div>

            <button
              className="btn btn-primary mt-5 min-h-12 w-full text-base"
              disabled={busyUmbrella === selectedUmbrella.id}
              type="button"
              onClick={() => actOnUmbrella(selectedUmbrella)}
            >
              {selectedIsMine ? "ยืนยันการคืนร่ม" : "ยืนยันการยืมร่ม"}
            </button>
            <button className="btn btn-ghost mt-2 w-full" type="button" onClick={() => setSelectedUmbrella(null)}>
              ยกเลิกรายการ
            </button>
          </>
        ) : null}
      </Sheet>
    </div>
  );
}

const tileStyles = {
  mine: "border-transparent bg-accent text-white shadow-[0_10px_20px_-10px_rgb(75_99_240/0.8)] hover:-translate-y-0.5",
  available:
    "border-line bg-surface text-ink enabled:hover:-translate-y-0.5 enabled:hover:border-ok enabled:hover:shadow-soft disabled:opacity-55",
  borrowed: "border-transparent bg-sunken text-muted",
  disabled: "border-dashed border-line text-muted/70"
};

function UmbrellaTile({
  umbrella,
  isMine,
  canAct,
  busy,
  onClick
}: {
  umbrella: Umbrella;
  isMine: boolean;
  canAct: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const label = busy ? "กำลังทำรายการ" : isMine ? "ร่มของคุณ" : statusLabel[umbrella.status];

  return (
    <button
      aria-label={`ร่มหมายเลข ${umbrella.id} ${label}`}
      className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border transition duration-200 ease-spring enabled:active:scale-95 disabled:cursor-not-allowed ${
        tileStyles[isMine ? "mine" : umbrella.status]
      } ${busy ? "animate-pulse" : isMine ? "animate-pop" : ""}`}
      disabled={!canAct || busy}
      title={label}
      type="button"
      onClick={onClick}
    >
      <span className={`text-lg font-semibold tabular-nums ${umbrella.status === "disabled" ? "line-through" : ""}`}>
        {String(umbrella.id).padStart(2, "0")}
      </span>
      {isMine ? (
        <UmbrellaIcon aria-hidden="true" size={13} />
      ) : umbrella.status === "disabled" ? (
        <Ban aria-hidden="true" size={13} />
      ) : (
        <span className={`size-1.5 rounded-full ${umbrella.status === "available" ? "bg-ok" : "bg-warn"}`} />
      )}
    </button>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function SummaryStat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-xl bg-canvas px-2 py-2.5">
      <p className={`text-xl font-bold tabular-nums ${className}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
