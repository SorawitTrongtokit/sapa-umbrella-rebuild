"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, MessageSquare, Save, Umbrella as UmbrellaIcon, XCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { groupUmbrellas, statusLabel } from "@/lib/umbrella";
import type { BorrowTransaction, Location, Profile, Umbrella } from "@/lib/types";

type DashboardClientProps = {
  profile: Profile;
  locations: Location[];
  initialUmbrellas: Umbrella[];
  activeBorrows: BorrowTransaction[];
};

export function DashboardClient({ profile, locations, initialUmbrellas, activeBorrows }: DashboardClientProps) {
  const [umbrellas, setUmbrellas] = useState(initialUmbrellas);
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
  const activeBorrowIds = new Set(activeBorrows.map((item) => item.umbrella_id));
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
    const isMine = umbrella.borrowed_by === profile.id;
    const endpoint = isMine ? "return" : "borrow";
    const response = await fetch(`/api/umbrellas/${umbrella.id}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isMine ? { returnLocationId: umbrella.location_id } : {})
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setBusyUmbrella(null);
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <section className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="พร้อมใช้งาน" value={counts.available} tone="success" />
          <SummaryCard label="ถูกยืมแล้ว" value={counts.borrowed} tone="warning" />
          <SummaryCard label="ปิดใช้งาน" value={counts.disabled} tone="danger" />
        </div>

        {message ? (
          <p className="rounded-[8px] border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-900" role="status">{message}</p>
        ) : null}

        <div className="space-y-4">
          {groups.map((group) => (
            <section className="app-surface rounded-[8px] p-4" key={group.location.id}>
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-slate-950">{group.location.name_th}</h2>
                <p className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">ยืมที่ไหน ต้องคืนที่นั่น</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-7">
                {group.umbrellas.map((umbrella) => {
                  const isMine = umbrella.borrowed_by === profile.id;
                  const canClick = umbrella.status === "available" || isMine;
                  return (
                    <button
                      className={`focus-ring min-h-32 cursor-pointer rounded-[8px] border p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                        umbrella.status === "available"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
                          : umbrella.status === "borrowed"
                            ? isMine
                              ? "border-indigo-200 bg-indigo-50 text-indigo-950 hover:bg-indigo-100"
                              : "border-amber-200 bg-amber-50 text-amber-950"
                            : "border-slate-200 bg-slate-100 text-slate-500 shadow-none"
                      }`}
                      disabled={!canClick || busyUmbrella === umbrella.id}
                      key={umbrella.id}
                      type="button"
                      onClick={() => actOnUmbrella(umbrella)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-2xl font-semibold">#{umbrella.id}</span>
                        <span className="flex size-8 items-center justify-center rounded-[8px] bg-white/70">
                          <UmbrellaIcon aria-hidden="true" size={19} />
                        </span>
                      </span>
                      <span className="mt-4 block text-sm font-semibold">{statusLabel[umbrella.status]}</span>
                      <span className="mt-2 block text-xs leading-5 text-slate-600">
                        {busyUmbrella === umbrella.id
                          ? "กำลังทำรายการ"
                          : isMine
                            ? "กดเพื่อคืนร่ม"
                            : umbrella.status === "available"
                              ? "กดเพื่อยืม"
                              : activeBorrowIds.has(umbrella.id)
                                ? "กำลังใช้งาน"
                                : "ไม่พร้อมใช้งาน"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <aside className="space-y-5 xl:sticky xl:top-5">
        <section className="app-surface rounded-[8px] p-4">
          <h2 className="text-base font-semibold text-slate-950">ข้อมูลส่วนตัว</h2>
          <form className="mt-4 space-y-3" onSubmit={saveProfile}>
            <label className="block text-sm font-medium text-slate-700">
              ชื่อที่แสดง
              <input
                className="focus-ring field-control mt-1.5 min-h-11 w-full rounded-[8px] px-3 py-2 text-sm"
                value={profileDraft.displayName}
                onChange={(event) => setProfileDraft((draft) => ({ ...draft, displayName: event.target.value }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-700">
                ชั้น
                <input
                  className="focus-ring field-control mt-1.5 min-h-11 w-full rounded-[8px] px-3 py-2 text-sm"
                  value={profileDraft.classLevel}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, classLevel: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                เลขที่
                <input
                  className="focus-ring field-control mt-1.5 min-h-11 w-full rounded-[8px] px-3 py-2 text-sm"
                  inputMode="numeric"
                  value={profileDraft.studentNumber}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, studentNumber: event.target.value }))}
                />
              </label>
            </div>
            <button
              className="focus-ring flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              disabled={isSavingProfile}
              type="submit"
            >
              <Save aria-hidden="true" size={16} />
              {isSavingProfile ? "กำลังบันทึก" : "บันทึกข้อมูล"}
            </button>
          </form>
        </section>

        <section className="app-surface rounded-[8px] p-4">
          <h2 className="text-base font-semibold text-slate-950">ส่งคำติชม</h2>
          <form className="mt-4 space-y-3" onSubmit={sendFeedback}>
            <textarea
              className="focus-ring field-control min-h-28 w-full resize-y rounded-[8px] px-3 py-2 text-sm"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="แจ้งปัญหา หรือเสนอแนะการใช้งาน"
              required
            />
            <button
              className="focus-ring flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              disabled={isSendingFeedback}
              type="submit"
            >
              <MessageSquare aria-hidden="true" size={16} />
              {isSendingFeedback ? "กำลังส่ง" : "ส่งคำติชม"}
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "danger" }) {
  const Icon = tone === "success" ? Check : tone === "warning" ? Clock : XCircle;
  const colors = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800"
  };

  return (
    <div className={`rounded-[8px] border p-4 shadow-sm ${colors[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-[8px] bg-white/70">
          <Icon aria-hidden="true" size={18} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}
