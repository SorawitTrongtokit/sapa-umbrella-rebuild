"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, MessageSquare, Save, Umbrella as UmbrellaIcon, X, XCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { groupUmbrellas, statusLabel } from "@/lib/umbrella";
import type { BorrowTransaction, Location, Profile, Umbrella, UmbrellaStatus } from "@/lib/types";

type DashboardClientProps = {
  profile: Profile;
  locations: Location[];
  initialUmbrellas: Umbrella[];
  activeBorrows: BorrowTransaction[];
};

const badgeStyles: Record<UmbrellaStatus, string> = {
  available: "border-emerald-200 bg-emerald-100 text-emerald-700",
  borrowed: "border-blue-200 bg-blue-100 text-blue-700",
  disabled: "border-slate-200 bg-slate-100 text-slate-500"
};

const tileStyles: Record<UmbrellaStatus, string> = {
  available: "bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600",
  borrowed: "bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600",
  disabled: "bg-slate-300 text-white shadow-none"
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
  const [message, setMessage] = useState("");
  const [busyUmbrella, setBusyUmbrella] = useState<number | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("public:umbrellas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "umbrellas" },
        (payload) => {
          const next = payload.new as Umbrella;
          if (!next?.id) return;
          setUmbrellas((current) =>
            current.map((umbrella) => (umbrella.id === next.id ? { ...umbrella, ...next } : umbrella))
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const groups = useMemo(() => groupUmbrellas(umbrellas, locations), [umbrellas, locations]);
  const locationNameById = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name_th])),
    [locations]
  );
  const activeBorrowIds = useMemo(() => new Set(activeBorrows.map((item) => item.umbrella_id)), [activeBorrows]);
  const activeUmbrella = useMemo(
    () => umbrellas.find((umbrella) => umbrella.borrowed_by === profile.id) ?? umbrellas.find((umbrella) => activeBorrowIds.has(umbrella.id)),
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
    setBusyUmbrella(umbrella.id);
    setMessage("");
    const isMine = umbrella.borrowed_by === profile.id || activeBorrowIds.has(umbrella.id);
    const endpoint = isMine ? "return" : "borrow";
    const response = await fetch(`/api/umbrellas/${umbrella.id}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isMine ? { returnLocationId: umbrella.location_id } : {})
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setBusyUmbrella(null);
    setSelectedUmbrella(null);
    setMessage(payload.ok ? (isMine ? "คืนร่มเรียบร้อย" : "ยืมร่มเรียบร้อย") : payload.error ?? "ทำรายการไม่สำเร็จ");
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profileDraft)
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setIsSavingProfile(false);
    setMessage(payload.ok ? "บันทึกข้อมูลส่วนตัวแล้ว" : payload.error ?? "บันทึกไม่สำเร็จ");
  }

  async function sendFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSendingFeedback(true);
    setMessage("");
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: feedback })
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setIsSendingFeedback(false);
    if (payload.ok) setFeedback("");
    setMessage(payload.ok ? "ส่งคำติชมแล้ว ขอบคุณครับ/ค่ะ" : payload.error ?? "ส่งคำติชมไม่สำเร็จ");
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-full space-y-6 lg:col-span-3">
        <section className="glass-card rounded-[32px] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500">
            <span className="size-2 rounded-full bg-blue-500" />
            สถานะปัจจุบันของคุณ
          </h2>
          <div className="relative overflow-hidden rounded-2xl bg-blue-600 p-6 text-white shadow-xl shadow-blue-200">
            <div className="relative z-10">
              <p className="mb-1 text-xs font-medium opacity-80">
                {activeUmbrella ? "กำลังยืมร่มหมายเลข" : "ยังไม่มีร่มที่กำลังยืม"}
              </p>
              <p className="mb-3 text-4xl font-black">{activeUmbrella ? String(activeUmbrella.id).padStart(2, "0") : "--"}</p>
              <div className="flex w-fit items-center gap-2 rounded-full bg-sky-400/30 px-2 py-1 text-[10px] font-bold">
                <AlertCircle size={12} />
                {activeUmbrella ? `จุดที่ต้องคืน: ${locationNameById.get(activeUmbrella.location_id) ?? "-"}` : "เลือกช่องสีเขียวเพื่อเริ่มยืม"}
              </div>
            </div>
            <UmbrellaIcon className="absolute -bottom-4 -right-4 size-24 -rotate-12 text-white/10" />
          </div>
          <button
            className="btn-secondary focus-ring mt-4 w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!activeUmbrella || busyUmbrella === activeUmbrella.id}
            type="button"
            onClick={() => activeUmbrella && setSelectedUmbrella(activeUmbrella)}
          >
            ทำรายการคืนร่ม
          </button>
        </section>

        <section className="glass-card rounded-[32px] p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-500">สรุปการใช้งาน</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">ร่มที่พร้อมใช้งาน</span>
              <span className="text-lg font-black tracking-normal text-emerald-500">
                {counts.available}/{umbrellas.length}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                style={{ width: `${umbrellas.length ? (counts.available / umbrellas.length) * 100 : 0}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SummaryBox label="ว่าง" value={counts.available} tone="success" />
              <SummaryBox label="ถูกยืม" value={counts.borrowed} tone="danger" />
            </div>
            <SummaryBox label="ปิดใช้งาน / ชำรุด" value={counts.disabled} tone="neutral" />
          </div>
        </section>

        <section className="glass-card rounded-[32px] p-6">
          <h2 className="text-base font-black text-blue-950">ข้อมูลส่วนตัว</h2>
          <form className="mt-4 space-y-3" onSubmit={saveProfile}>
            <input
              className="focus-ring field-control min-h-11 w-full rounded-2xl px-4 py-2.5 text-sm"
              aria-label="ชื่อที่แสดง"
              value={profileDraft.displayName}
              onChange={(event) => setProfileDraft((draft) => ({ ...draft, displayName: event.target.value }))}
              placeholder="ชื่อที่แสดง"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="focus-ring field-control min-h-11 w-full rounded-2xl px-4 py-2.5 text-sm"
                aria-label="ชั้น"
                value={profileDraft.classLevel}
                onChange={(event) => setProfileDraft((draft) => ({ ...draft, classLevel: event.target.value }))}
                placeholder="ชั้น"
              />
              <input
                className="focus-ring field-control min-h-11 w-full rounded-2xl px-4 py-2.5 text-sm"
                aria-label="เลขที่"
                inputMode="numeric"
                value={profileDraft.studentNumber}
                onChange={(event) => setProfileDraft((draft) => ({ ...draft, studentNumber: event.target.value }))}
                placeholder="เลขที่"
              />
            </div>
            <button
              className="btn-primary focus-ring flex w-full cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              disabled={isSavingProfile}
              type="submit"
            >
              <Save aria-hidden="true" size={16} />
              {isSavingProfile ? "กำลังบันทึก" : "บันทึกข้อมูล"}
            </button>
          </form>
        </section>

        <section className="glass-card rounded-[32px] p-6">
          <h2 className="text-base font-black text-blue-950">ส่งคำติชม</h2>
          <form className="mt-4 space-y-3" onSubmit={sendFeedback}>
            <textarea
              className="focus-ring field-control min-h-28 w-full resize-y rounded-2xl px-4 py-3 text-sm"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="แจ้งปัญหา หรือเสนอแนะการใช้งาน"
              required
            />
            <button
              className="focus-ring flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-black text-sky-800 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              disabled={isSendingFeedback}
              type="submit"
            >
              <MessageSquare aria-hidden="true" size={16} />
              {isSendingFeedback ? "กำลังส่ง" : "ส่งคำติชม"}
            </button>
          </form>
        </section>
      </aside>

      <section className="col-span-full space-y-6 lg:col-span-9">
        {message ? (
          <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900" role="status">
            {message}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {groups.map((group, index) => (
            <section className="glass-card rounded-[32px] p-5 shadow-xl shadow-blue-900/5" key={group.location.id}>
              <header className="mb-6 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white shadow-lg ${
                      index === 0
                        ? "bg-orange-400 shadow-orange-100"
                        : index === 1
                          ? "bg-blue-400 shadow-blue-100"
                          : "bg-purple-400 shadow-purple-100"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <h2 className="truncate text-xl font-black tracking-normal text-blue-950">{group.location.name_th}</h2>
                </div>
                <span className="shrink-0 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-normal text-slate-400">
                  {group.umbrellas.length} คัน
                </span>
              </header>

              <div className="grid grid-cols-2 gap-4">
                {group.umbrellas.map((umbrella) => {
                  const isMine = umbrella.borrowed_by === profile.id || activeBorrowIds.has(umbrella.id);
                  const canAct = umbrella.status === "available" || isMine;
                  return (
                    <button
                      className={`focus-ring relative min-h-32 overflow-hidden rounded-[24px] p-5 text-left shadow-lg transition-all hover:-translate-y-1 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 ${tileStyles[umbrella.status]}`}
                      disabled={!canAct || busyUmbrella === umbrella.id}
                      key={umbrella.id}
                      type="button"
                      onClick={() => setSelectedUmbrella(umbrella)}
                    >
                      <span className="relative z-10 block text-2xl font-black">{String(umbrella.id).padStart(2, "0")}</span>
                      <span className="relative z-10 mt-1 block text-[10px] font-black uppercase tracking-wider opacity-90">
                        {busyUmbrella === umbrella.id ? "กำลังทำรายการ" : isMine ? "ร่มของคุณ" : statusLabel[umbrella.status]}
                      </span>
                      <span className="absolute -bottom-2 -right-2 size-12 rounded-full bg-white/10" />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      {selectedUmbrella ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <button
            className="absolute inset-0 bg-blue-950/40 backdrop-blur-md"
            type="button"
            aria-label="ปิดหน้าต่าง"
            onClick={() => setSelectedUmbrella(null)}
          />
          <section className="relative w-full max-w-sm rounded-[40px] border-4 border-white bg-white p-8 shadow-2xl sm:p-10">
            <button
              className="focus-ring absolute right-5 top-5 flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              type="button"
              aria-label="ปิด"
              onClick={() => setSelectedUmbrella(null)}
            >
              <X size={18} />
            </button>
            <div className="space-y-4 text-center">
              <div
                className={`mx-auto flex size-24 items-center justify-center rounded-[32px] text-white shadow-2xl ${
                  selectedUmbrella.status === "available" ? "bg-emerald-500 shadow-emerald-200" : "bg-rose-500 shadow-rose-200"
                }`}
              >
                <UmbrellaIcon size={48} />
              </div>
              <div>
                <h3 className="text-4xl font-black text-slate-800">ร่ม #{selectedUmbrella.id}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-blue-500">
                  {locationNameById.get(selectedUmbrella.location_id) ?? selectedUmbrella.location_id}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4 rounded-3xl border-2 border-slate-100 bg-slate-50 p-6">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-slate-400">สถานะ</span>
                <StatusBadge status={selectedUmbrella.status} />
              </div>
              <p className="text-sm font-medium leading-6 text-slate-600">
                {selectedUmbrella.borrowed_by === profile.id || activeBorrowIds.has(selectedUmbrella.id)
                  ? "กดยืนยันเพื่อคืนร่มที่จุดเดิม"
                  : "กดยืนยันเพื่อยืมร่มคันนี้"}
              </p>
            </div>

            <button
              className="btn-primary focus-ring mt-8 w-full px-4 py-5 text-xl disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              disabled={busyUmbrella === selectedUmbrella.id}
              type="button"
              onClick={() => actOnUmbrella(selectedUmbrella)}
            >
              {selectedUmbrella.borrowed_by === profile.id || activeBorrowIds.has(selectedUmbrella.id) ? "ยืนยันการคืน" : "ยืนยันการยืม"}
            </button>
            <button
              className="focus-ring mt-4 w-full rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
              type="button"
              onClick={() => setSelectedUmbrella(null)}
            >
              ยกเลิกรายการ
            </button>
          </section>
        </div>
      ) : null}
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

function SummaryBox({ label, value, tone }: { label: string; value: number; tone: "success" | "danger" | "neutral" }) {
  const Icon = tone === "success" ? Check : XCircle;
  const colors = {
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
    danger: "border-rose-100 bg-rose-50 text-rose-700",
    neutral: "border-slate-100 bg-slate-50 text-slate-500"
  };

  return (
    <div className={`rounded-2xl border p-4 ${colors[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wider">{label}</p>
        <Icon aria-hidden="true" size={16} />
      </div>
      <p className="mt-1 text-2xl font-black tracking-normal">{value}</p>
    </div>
  );
}
