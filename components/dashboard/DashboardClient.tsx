"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, ChevronDown, ChevronUp, Coffee, Dumbbell, Home, MapPin, MessageSquare, Save, Umbrella as UmbrellaIcon, Utensils, X, XCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { findActiveUmbrella, groupUmbrellas, isBorrowedByUser, statusLabel } from "@/lib/umbrella";
import type { BorrowTransaction, Location, Profile, Umbrella, UmbrellaStatus } from "@/lib/types";

type DashboardClientProps = {
  profile: Profile;
  locations: Location[];
  initialUmbrellas: Umbrella[];
  activeBorrows: BorrowTransaction[];
};

const badgeStyles: Record<UmbrellaStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/5",
  borrowed: "border-rose-200 bg-rose-50 text-rose-700 shadow-sm shadow-rose-500/5",
  disabled: "border-slate-200 bg-slate-50 text-slate-500"
};

const locationConfigs: Record<string, { icon: typeof Home; gradient: string; tint: string }> = {
  dome: { icon: Home, gradient: "premium-gradient-2", tint: "shadow-rose-100 bg-rose-50/50" },
  sports_center: { icon: Dumbbell, gradient: "premium-gradient-1", tint: "shadow-indigo-100 bg-indigo-50/50" },
  cafeteria: { icon: Utensils, gradient: "premium-gradient-3", tint: "shadow-emerald-100 bg-emerald-50/50" }
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
  const [activeBorrowIds, setActiveBorrowIds] = useState<Set<number>>(
    () => new Set(activeBorrows.map((item) => item.umbrella_id))
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false);

  useEffect(() => {
    function handleHashChange() {
      if (window.location.hash === "#profile") {
        setIsProfileExpanded(true);
      } else if (window.location.hash === "#feedback") {
        setIsFeedbackExpanded(true);
      }
    }
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("public:umbrellas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "umbrellas" },
        (payload: { new: Record<string, unknown> }) => {
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
    setMessage(isMine ? "กำลังคืนร่ม..." : "กำลังยืมร่ม...");
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
        setMessage(payload.error ?? "ทำรายการไม่สำเร็จ");
        return;
      }
      setActiveBorrowIds((current) => {
        const next = new Set(current);
        if (isMine) next.delete(umbrella.id);
        else next.add(umbrella.id);
        return next;
      });
      setMessage(isMine ? "คืนร่มเรียบร้อย" : "ยืมร่มเรียบร้อย");
    } catch {
      setUmbrellas(previousUmbrellas);
      setMessage("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusyUmbrella(null);
    }
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
    <div className="animate-page grid grid-cols-12 gap-5 lg:gap-6">
      
      {/* Sidebar Section */}
      <aside className="col-span-full space-y-5 lg:col-span-3">
        
        {/* User Status holographic glass card */}
        <section className="glass-card rounded-[28px] p-5">
          <h2 className="mb-3.5 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            <span className="status-pulse size-2 rounded-full bg-indigo-500" />
            สถานะของคุณ
          </h2>
          <div className="soft-shine relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-5 text-white shadow-md shadow-indigo-200/50">
            <div className="relative z-10">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider opacity-85">
                {activeUmbrella ? "กำลังยืมร่มหมายเลข" : "ยังไม่มีร่มที่กำลังยืม"}
              </p>
              <p className="mb-2 text-3xl font-black">{activeUmbrella ? String(activeUmbrella.id).padStart(2, "0") : "--"}</p>
              <div className="flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide">
                <AlertCircle size={11} />
                {activeUmbrella ? `คืนที่: ${locationNameById.get(activeUmbrella.location_id) ?? "-"}` : "แตะร่มสีเขียวเพื่อยืม"}
              </div>
            </div>
            <UmbrellaIcon className="absolute -bottom-3 -right-3 size-20 -rotate-12 text-white/10" />
          </div>
          <button
            className="btn-secondary focus-ring mt-3 w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!activeUmbrella || busyUmbrella === activeUmbrella.id}
            type="button"
            onClick={() => activeUmbrella && setSelectedUmbrella(activeUmbrella)}
          >
            ทำรายการคืนร่ม
          </button>
        </section>

        {/* Utilization summaries */}
        <section className="glass-card rounded-[28px] p-5">
          <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">สรุปภาพรวมร่ม</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">พร้อมใช้งาน</span>
              <span className="text-sm font-black text-emerald-600">
                {counts.available}/{umbrellas.length}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                style={{ width: `${umbrellas.length ? (counts.available / umbrellas.length) * 100 : 0}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SummaryBox label="ว่าง" value={counts.available} tone="success" />
              <SummaryBox label="ถูกยืม" value={counts.borrowed} tone="danger" />
            </div>
            <SummaryBox label="ชำรุด / ปิดใช้งาน" value={counts.disabled} tone="neutral" />
          </div>
        </section>

        {/* Profile Card */}
        <section id="profile" className="glass-card rounded-[28px] p-5">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left focus:outline-none"
            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
          >
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">ข้อมูลส่วนตัว</h2>
            {isProfileExpanded ? (
              <ChevronUp className="text-slate-400" size={16} />
            ) : (
              <ChevronDown className="text-slate-400" size={16} />
            )}
          </button>
          {isProfileExpanded && (
            <form className="mt-3.5 space-y-3 animate-pop" onSubmit={saveProfile}>
              <input
                className="focus-ring field-control w-full px-3.5 py-2 text-sm"
                aria-label="ชื่อที่แสดง"
                value={profileDraft.displayName}
                onChange={(event) => setProfileDraft((draft) => ({ ...draft, displayName: event.target.value }))}
                placeholder="ชื่อที่แสดง"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="focus-ring field-control w-full px-3.5 py-2 text-sm"
                  aria-label="ชั้น"
                  value={profileDraft.classLevel}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, classLevel: event.target.value }))}
                  placeholder="ชั้น"
                  required
                />
                <input
                  className="focus-ring field-control w-full px-3.5 py-2 text-sm"
                  aria-label="เลขที่"
                  inputMode="numeric"
                  value={profileDraft.studentNumber}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, studentNumber: event.target.value }))}
                  placeholder="เลขที่"
                  required
                />
              </div>
              <button
                className="btn-primary focus-ring flex w-full cursor-pointer items-center justify-center gap-1.5 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
                disabled={isSavingProfile}
                type="submit"
              >
                <Save aria-hidden="true" size={15} />
                {isSavingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </form>
          )}
        </section>

        {/* Feedback Card */}
        <section id="feedback" className="glass-card rounded-[28px] p-5">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left focus:outline-none"
            onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
          >
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">ส่งคำติชม</h2>
            {isFeedbackExpanded ? (
              <ChevronUp className="text-slate-400" size={16} />
            ) : (
              <ChevronDown className="text-slate-400" size={16} />
            )}
          </button>
          {isFeedbackExpanded && (
            <form className="mt-3.5 space-y-3 animate-pop" onSubmit={sendFeedback}>
              <textarea
                className="focus-ring field-control min-h-24 w-full resize-y px-3.5 py-2.5 text-sm"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="พิมพ์ข้อเสนอแนะหรือปัญหาที่พบที่นี่..."
                required
              />
              <button
                className="btn-secondary focus-ring flex w-full cursor-pointer items-center justify-center gap-1.5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSendingFeedback}
                type="submit"
              >
                <MessageSquare aria-hidden="true" size={15} />
                {isSendingFeedback ? "กำลังส่ง..." : "ส่งคำติชม"}
              </button>
            </form>
          )}
        </section>
      </aside>

      {/* Main Services / Locations View */}
      <section className="col-span-full space-y-5 lg:col-span-9">
        {message ? (
          <p className="rounded-2xl border border-indigo-200/50 bg-indigo-50/50 px-4 py-3 text-xs sm:text-sm font-bold text-indigo-900 animate-pop" role="status">
            {message}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {groups.map((group, index) => (
            <section
              className="glass-card animate-rise rounded-[28px] p-4.5 shadow-sm"
              key={group.location.id}
              style={{ animationDelay: `${index * 45}ms` } as React.CSSProperties}
            >
              <header className="mb-5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                      locationConfigs[group.location.id]?.gradient ?? "bg-blue-400 shadow-blue-100"
                    }`}
                  >
                    {(() => {
                      const Icon = locationConfigs[group.location.id]?.icon ?? MapPin;
                      return <Icon size={18} strokeWidth={2.5} />;
                    })()}
                  </span>
                  <div>
                    <h2 className="truncate text-base font-black tracking-normal text-slate-800">{group.location.name_th}</h2>
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">จุดบริการ</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg border border-slate-200/80 bg-white/70 px-2 py-1 text-[9px] font-black text-slate-400">
                  {group.umbrellas.length} คัน
                </span>
              </header>

              {/* Umbrella Grid Cards - 2 cols on mobile for large tapping area */}
              <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
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
          ))}
        </div>
      </section>

      {/* Confirmation Bottom Sheet Drawer / Modal popup */}
      <UmbrellaModal
        selectedUmbrella={selectedUmbrella}
        setSelectedUmbrella={setSelectedUmbrella}
        profileId={profile.id}
        activeBorrowIds={activeBorrowIds}
        locationNameById={locationNameById}
        busyUmbrella={busyUmbrella}
        actOnUmbrella={actOnUmbrella}
      />
    </div>
  );
}

// 3D Tilt button component for umbrellas
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
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    // 3D Tilt calculations on hover
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rotateX = -(y - yc) / 5; // max 6 degrees rotation
    const rotateY = (x - xc) / 5;
    setTilt({ x: rotateX, y: rotateY });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  let cardStyle = "";
  let dotColor = "";

  if (umbrella.status === "available") {
    cardStyle = "border-emerald-200/50 bg-emerald-500/5 text-emerald-950 hover:bg-emerald-500/10 hover:border-emerald-300 glow-success";
    dotColor = "bg-emerald-500 shadow-[0_0_8px_#10b981]";
  } else if (umbrella.status === "borrowed") {
    if (isMine) {
      cardStyle = "premium-gradient-self text-white border border-indigo-400/20 glow-self";
      dotColor = "bg-white shadow-[0_0_8px_#ffffff]";
    } else {
      cardStyle = "border-rose-200/40 bg-rose-500/5 text-rose-900/60 shadow-none";
      dotColor = "bg-rose-400";
    }
  } else {
    cardStyle = "border-slate-200/40 bg-slate-100/50 text-slate-400 shadow-none";
    dotColor = "bg-slate-300";
  }

  const isResetting = tilt.x === 0 && tilt.y === 0;

  return (
    <button
      className={`focus-ring relative flex min-h-24 flex-col justify-between overflow-hidden rounded-2xl p-4 text-left transition-all duration-75 mobile-active-feedback disabled:cursor-not-allowed disabled:opacity-50 ${cardStyle}`}
      style={{
        transform: `perspective(400px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: isResetting ? "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), background-color 200ms ease, border-color 200ms ease" : "background-color 200ms ease, border-color 200ms ease"
      }}
      disabled={!canAct || busy}
      type="button"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Glowing Status Dot */}
      <span className="absolute top-3.5 right-3.5 flex size-2">
        {umbrella.status !== "disabled" && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
        )}
        <span className={`relative inline-flex rounded-full size-2 ${dotColor}`} />
      </span>

      <span className="block text-xl font-extrabold">{String(umbrella.id).padStart(2, "0")}</span>
      
      <span className="block text-[8px] font-black uppercase tracking-wider opacity-85">
        {busy ? "กำลังทำรายการ" : isMine ? "ร่มของคุณ" : statusLabel[umbrella.status]}
      </span>
      <span className="absolute -bottom-1 -right-1 size-8 rounded-full bg-white/5" />
    </button>
  );
}

// Confirmation slide-up modal / bottom drawer component
function UmbrellaModal({
  selectedUmbrella,
  setSelectedUmbrella,
  profileId,
  activeBorrowIds,
  locationNameById,
  busyUmbrella,
  actOnUmbrella
}: {
  selectedUmbrella: Umbrella | null;
  setSelectedUmbrella: (u: Umbrella | null) => void;
  profileId: string;
  activeBorrowIds: Set<number>;
  locationNameById: Map<string, string>;
  busyUmbrella: number | null;
  actOnUmbrella: (u: Umbrella) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  if (!selectedUmbrella || !mounted) return null;

  const isMine = isBorrowedByUser(selectedUmbrella, profileId, activeBorrowIds);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/20 backdrop-blur-md p-0 sm:p-4 transition-all duration-300">
      <button
        className="absolute inset-0 bg-transparent cursor-default"
        type="button"
        aria-label="ปิดหน้าต่าง"
        onClick={() => setSelectedUmbrella(null)}
      />
      
      {/* Bottom Sheet Drawer */}
      <section className="mobile-bottom-sheet relative w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl border-t sm:border border-white bg-white/95 backdrop-blur-xl p-6 shadow-2xl pb-10 sm:pb-6">
        
        {/* Mobile Header indicator bar */}
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

        <button
          className="focus-ring absolute right-5 top-5 hidden sm:flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          type="button"
          aria-label="ปิด"
          onClick={() => setSelectedUmbrella(null)}
        >
          <X size={15} />
        </button>

        <div className="space-y-3.5 text-center">
          <div
            className={`mx-auto flex size-16 items-center justify-center rounded-2xl text-white shadow-md ${
              selectedUmbrella.status === "available" ? "bg-emerald-500 shadow-emerald-200" : "premium-gradient-self shadow-indigo-200"
            }`}
          >
            <UmbrellaIcon size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800">ร่ม #{selectedUmbrella.id}</h3>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-600">
              {locationNameById.get(selectedUmbrella.location_id) ?? selectedUmbrella.location_id}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">สถานะร่ม</span>
            <StatusBadge status={selectedUmbrella.status} />
          </div>
          <p className="text-xs font-medium leading-relaxed text-slate-600">
            {isMine
              ? "กดยืนยันเพื่อคืนร่มที่จุดบริการเดิมให้ถูกต้อง"
              : "กดยืนยันเพื่อบันทึกรายการยืมร่มคันนี้"}
          </p>
        </div>

        <button
          className="btn-primary focus-ring mt-5 w-full py-3.5 text-base font-bold disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={busyUmbrella === selectedUmbrella.id}
          type="button"
          onClick={() => actOnUmbrella(selectedUmbrella)}
        >
          {isMine ? "ยืนยันการคืนร่ม" : "ยืนยันการยืมร่ม"}
        </button>
        
        <button
          className="focus-ring mt-2 w-full py-2.5 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600"
          type="button"
          onClick={() => setSelectedUmbrella(null)}
        >
          ยกเลิกรายการ
        </button>
      </section>
    </div>,
    document.body
  );
}

function StatusBadge({ status }: { status: UmbrellaStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badgeStyles[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: number; tone: "success" | "danger" | "neutral" }) {
  const Icon = tone === "success" ? Check : XCircle;
  const colors = {
    success: "border-emerald-200/50 bg-emerald-500/5 text-emerald-800",
    danger: "border-rose-200/40 bg-rose-500/5 text-rose-800",
    neutral: "border-slate-200/55 bg-slate-100/50 text-slate-500"
  };

  return (
    <div className={`rounded-xl border p-3 ${colors[tone]}`}>
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[9px] font-black uppercase tracking-wider">{label}</p>
        <Icon aria-hidden="true" size={13} />
      </div>
      <p className="mt-0.5 text-xl font-black">{value}</p>
    </div>
  );
}
