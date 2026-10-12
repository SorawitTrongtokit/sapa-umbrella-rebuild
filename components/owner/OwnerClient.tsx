"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Copy, Eye, EyeOff, KeyRound, MessageSquare, Save, Search, ShieldAlert, UserCog } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { Toast, useToast } from "@/components/ui/Toast";
import { accountStatusLabel, feedbackStatusLabel, roleLabel } from "@/lib/labels";
import type { AuditLog, Feedback, Profile } from "@/lib/types";

type OwnerClientProps = {
  users: Profile[];
  feedback: Feedback[];
  auditLogs: AuditLog[];
};

export function OwnerClient({ users, feedback, auditLogs }: OwnerClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [userList, setUserList] = useState(users);
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [query, setQuery] = useState(initialQ);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [revealedPassword, setRevealedPassword] = useState("");
  const { toast, notify, dismiss } = useToast();
  const selectedUser = userList.find((user) => user.id === selectedUserId) ?? userList[0];

  // QoL States
  const [showRevealedPassword, setShowRevealedPassword] = useState(true);
  const [feedbackList, setFeedbackList] = useState(feedback);
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "new" | "reviewed" | "archived">("new");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditTypeFilter, setAuditTypeFilter] = useState("all");
  
  // Custom View tabs for mobile / clean UI
  const [consoleTab, setConsoleTab] = useState<"users" | "feedback" | "audit">("users");

  // Keep feedbackList in sync when prop changes
  const [prevFeedback, setPrevFeedback] = useState(feedback);
  if (feedback !== prevFeedback) {
    setPrevFeedback(feedback);
    setFeedbackList(feedback);
  }

  // Auto-hide revealed password after 15 seconds
  useEffect(() => {
    if (revealedPassword) {
      const timer = setTimeout(() => {
        setRevealedPassword("");
        notify("info", "รหัสผ่านถูกซ่อนอัตโนมัติหลังจาก 15 วินาทีเพื่อความปลอดภัย");
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [revealedPassword, notify]);

  const [editForm, setEditForm] = useState({
    displayName: selectedUser?.display_name ?? "",
    classLevel: selectedUser?.class_level ?? "",
    studentNumber: String(selectedUser?.student_number ?? ""),
    role: selectedUser?.role ?? ("user" as Profile["role"]),
    status: selectedUser?.status ?? ("active" as Profile["status"])
  });

  const [prevUsers, setPrevUsers] = useState(users);
  if (users !== prevUsers) {
    setPrevUsers(users);
    setUserList(users);
    if (users.length > 0) {
      if (!users.some((u) => u.id === selectedUserId)) {
        setSelectedUserId(users[0].id);
      }
    } else {
      setSelectedUserId("");
    }
  }

  const [prevSelectedUser, setPrevSelectedUser] = useState(selectedUser);
  if (selectedUser !== prevSelectedUser) {
    setPrevSelectedUser(selectedUser);
    if (selectedUser) {
      setEditForm({
        displayName: selectedUser.display_name ?? "",
        classLevel: selectedUser.class_level ?? "",
        studentNumber: String(selectedUser.student_number ?? ""),
        role: selectedUser.role,
        status: selectedUser.status
      });
    } else {
      setEditForm({
        displayName: "",
        classLevel: "",
        studentNumber: "",
        role: "user",
        status: "active"
      });
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      router.replace(`${pathname}?${params.toString()}` as any);
    }, 400);

    return () => clearTimeout(handler);
  }, [query, router, pathname, searchParams]);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return userList;
    return userList.filter((user) =>
      [user.email, user.display_name, user.class_level, String(user.student_number ?? "")]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [query, userList]);

  const totals = useMemo(
    () => ({
      users: userList.length,
      active: userList.filter((user) => user.status === "active").length,
      admins: userList.filter((user) => user.role === "admin" || user.role === "owner").length
    }),
    [userList]
  );

  async function updateUser() {
    if (!selectedUser) return;
    dismiss();
    const response = await fetch(`/api/owner/users/${selectedUser.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: editForm.displayName,
        classLevel: editForm.classLevel,
        studentNumber: editForm.studentNumber,
        role: editForm.role,
        status: editForm.status
      })
    });
    const payload = (await response.json()) as { ok: boolean; data?: Profile; error?: string };
    if (payload.ok && payload.data) {
      setUserList((current) => current.map((user) => (user.id === payload.data!.id ? payload.data! : user)));
      notify("success", "บันทึกข้อมูลผู้ใช้แล้ว");
    } else {
      notify("error", payload.error ?? "บันทึกไม่สำเร็จ");
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    dismiss();
    const response = await fetch(`/api/owner/users/${selectedUser.id}/password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    if (payload.ok) {
      setPassword("");
      notify("success", "เปลี่ยนรหัสผ่านแล้ว");
    } else {
      notify("error", payload.error ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    }
  }

  async function revealPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    dismiss();
    setRevealedPassword("");
    const response = await fetch(`/api/owner/users/${selectedUser.id}/reveal-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason })
    });
    const payload = (await response.json()) as {
      ok: boolean;
      data?: { password: string; source: string; changedAt: string };
      error?: string;
    };
    if (payload.ok && payload.data) {
      setRevealedPassword(payload.data.password);
      setShowRevealedPassword(true);
      notify("success", "แสดงรหัสผ่านแล้ว และบันทึก audit log แล้ว");
    } else {
      notify("error", payload.error ?? "ไม่สามารถแสดงรหัสผ่านได้");
    }
  }

  function copyPasswordToClipboard() {
    if (!revealedPassword) return;
    navigator.clipboard.writeText(revealedPassword);
    notify("success", "คัดลอกรหัสผ่านไปยังคลิปบอร์ดแล้ว");
  }

  async function updateFeedbackStatus(id: string, newStatus: "new" | "reviewed" | "archived") {
    dismiss();
    try {
      const response = await fetch(`/api/owner/feedback/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const payload = (await response.json()) as { ok: boolean; data?: Feedback; error?: string };
      if (payload.ok && payload.data) {
        setFeedbackList((current) =>
          current.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
        notify("success", "อัปเดตสถานะฟีดแบคสำเร็จ");
      } else {
        notify("error", payload.error ?? "ไม่สามารถอัปเดตสถานะฟีดแบคได้");
      }
    } catch {
      notify("error", "เชื่อมต่อระบบไม่สำเร็จ");
    }
  }

  const filteredFeedbacks = useMemo(() => {
    if (feedbackFilter === "all") return feedbackList;
    return feedbackList.filter((item) => item.status === feedbackFilter);
  }, [feedbackList, feedbackFilter]);

  const resolvedAuditLogs = useMemo(() => {
    const usersMap = new Map(userList.map((u) => [u.id, u]));
    return auditLogs.map((log) => {
      const actor = log.actor_id ? usersMap.get(log.actor_id) : null;
      const target = log.target_user_id ? usersMap.get(log.target_user_id) : null;
      const actorName = actor ? (actor.display_name || actor.email) : "ระบบ / ภายนอก";
      const targetName = target ? (target.display_name || target.email) : "";
      return {
        ...log,
        actorName,
        targetName
      };
    });
  }, [auditLogs, userList]);

  const filteredAuditLogs = useMemo(() => {
    const search = auditSearch.trim().toLowerCase();
    return resolvedAuditLogs.filter((log) => {
      const matchesSearch =
        search === "" ||
        log.action.toLowerCase().includes(search) ||
        log.actorName.toLowerCase().includes(search) ||
        log.targetName.toLowerCase().includes(search) ||
        (log.entity_id && log.entity_id.toLowerCase().includes(search));
      const matchesType = auditTypeFilter === "all" || log.entity_type === auditTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [resolvedAuditLogs, auditSearch, auditTypeFilter]);

  const feedbackTone = { new: "badge-accent", reviewed: "badge-ok", archived: "" };

  return (
    <div className="space-y-5">
      <Toast toast={toast} onDismiss={dismiss} />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="ผู้ใช้ทั้งหมด" value={totals.users} delay={0} />
        <MetricCard label="บัญชีใช้งาน" value={totals.active} delay={60} />
        <MetricCard label="ผู้ดูแลระบบ" value={totals.admins} delay={120} />
      </div>

      <div className="animate-rise [animation-delay:160ms]">
        <Segmented
          label="ส่วนจัดการ"
          value={consoleTab}
          onChange={setConsoleTab}
          options={[
            { value: "users", label: "จัดการผู้ใช้งาน", icon: UserCog },
            { value: "feedback", label: `คำติชม (${filteredFeedbacks.length})`, icon: MessageSquare },
            { value: "audit", label: "ประวัติระบบ", icon: ShieldAlert }
          ]}
        />
      </div>

      {/* Tab 1: Users */}
      {consoleTab === "users" && (
        <div className="grid items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <section className="card animate-rise p-4">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 className="font-semibold text-ink">ค้นหาสมาชิก</h2>
              <p className="text-sm text-muted">{filteredUsers.length} รายการ</p>
            </div>

            <div className="relative mt-3">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <input
                aria-label="ค้นหาสมาชิก"
                className="field pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ชื่อ, อีเมล, ชั้น หรือเลขที่..."
              />
            </div>

            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto lg:max-h-[30rem]">
              {filteredUsers.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left transition-colors duration-150 ${
                      isSelected ? "bg-accent-soft" : "hover:bg-canvas"
                    }`}
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isSelected ? "bg-accent text-white" : "bg-sunken text-ink-soft"
                      }`}
                    >
                      {(user.display_name || user.email).slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{user.display_name || user.email}</span>
                      <span className="block truncate text-xs text-muted">
                        {user.class_level ?? "-"} เลขที่ {user.student_number ?? "-"} · {roleLabel[user.role]}
                      </span>
                    </span>
                  </button>
                );
              })}
              {filteredUsers.length === 0 && <p className="py-8 text-center text-muted">ไม่พบบัญชีที่ค้นหา</p>}
            </div>
          </section>

          {selectedUser ? (
            <div className="space-y-5" key={selectedUser.id}>
              <section className="card animate-rise p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-ink">{selectedUser.display_name || selectedUser.email}</h2>
                    <p className="truncate text-sm text-muted">{selectedUser.email}</p>
                  </div>
                  <span className={`badge ${selectedUser.status === "active" ? "badge-ok" : "badge-danger"}`}>
                    {accountStatusLabel[selectedUser.status]}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="label">
                    ชื่อที่แสดง
                    <input
                      className="field"
                      value={editForm.displayName}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, displayName: event.target.value }))}
                    />
                  </label>
                  <label className="label">
                    ชั้น
                    <input
                      className="field"
                      value={editForm.classLevel}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, classLevel: event.target.value }))}
                    />
                  </label>
                  <label className="label">
                    เลขที่
                    <input
                      className="field"
                      inputMode="numeric"
                      value={editForm.studentNumber}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, studentNumber: event.target.value }))}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="label">
                      สิทธิ์การใช้งาน
                      <select
                        className="field"
                        value={editForm.role}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value as Profile["role"] }))}
                      >
                        <option value="user">{roleLabel.user}</option>
                        <option value="admin">{roleLabel.admin}</option>
                        <option value="owner">{roleLabel.owner}</option>
                      </select>
                    </label>
                    <label className="label">
                      สถานะบัญชี
                      <select
                        className="field"
                        value={editForm.status}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as Profile["status"] }))}
                      >
                        <option value="active">{accountStatusLabel.active}</option>
                        <option value="suspended">{accountStatusLabel.suspended}</option>
                      </select>
                    </label>
                  </div>
                </div>

                <button className="btn btn-primary mt-5" type="button" onClick={updateUser}>
                  <Save aria-hidden="true" size={17} />
                  บันทึกการเปลี่ยนแปลง
                </button>
              </section>

              <div className="grid gap-5 sm:grid-cols-2">
                <section className="card animate-rise p-5 [animation-delay:70ms]">
                  <h2 className="flex items-center gap-2 font-semibold text-ink">
                    <KeyRound aria-hidden="true" size={18} />
                    เปลี่ยนรหัสผ่าน
                  </h2>
                  <form className="mt-3 space-y-3" onSubmit={changePassword}>
                    <input
                      aria-label="รหัสผ่านใหม่"
                      className="field"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="รหัสผ่านใหม่..."
                      required
                    />
                    {password.length > 0 && password.length < 8 && (
                      <p className="text-sm text-danger">รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร</p>
                    )}
                    <button className="btn btn-primary w-full" disabled={password.length < 8}>
                      เปลี่ยนรหัสผ่าน
                    </button>
                  </form>
                </section>

                <section className="card animate-rise border-danger/25 p-5 [animation-delay:140ms]">
                  <h2 className="flex items-center gap-2 font-semibold text-ink">
                    <Eye aria-hidden="true" size={18} />
                    แสดงรหัสผ่านผู้ใช้
                  </h2>
                  <form className="mt-3 space-y-3" onSubmit={revealPassword}>
                    <input
                      aria-label="เหตุผลการตรวจสอบ"
                      className="field"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="ระบุเหตุผลการตรวจสอบ..."
                      required
                    />
                    {reason.length > 0 && reason.trim().length < 3 && (
                      <p className="text-sm text-danger">กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร</p>
                    )}
                    <button className="btn btn-danger w-full" disabled={reason.trim().length < 3}>
                      แสดงรหัสผ่าน
                    </button>
                  </form>

                  {revealedPassword ? (
                    <div className="mt-3 flex animate-pop items-center gap-1 rounded-xl bg-danger-soft py-1.5 pl-3.5 pr-1.5">
                      <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-danger">
                        {showRevealedPassword ? revealedPassword : "•".repeat(revealedPassword.length)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm w-9 px-0 text-danger"
                        aria-label={showRevealedPassword ? "ซ่อน" : "แสดง"}
                        title={showRevealedPassword ? "ซ่อน" : "แสดง"}
                        onClick={() => setShowRevealedPassword(!showRevealedPassword)}
                      >
                        {showRevealedPassword ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm w-9 px-0 text-danger"
                        aria-label="คัดลอก"
                        title="คัดลอก"
                        onClick={copyPasswordToClipboard}
                      >
                        <Copy aria-hidden="true" size={16} />
                      </button>
                    </div>
                  ) : null}
                </section>
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-muted">กรุณาเลือกผู้ใช้งานจากแถบค้นหาเพื่อเริ่มจัดการ</p>
          )}
        </div>
      )}

      {/* Tab 2: Feedback */}
      {consoleTab === "feedback" && (
        <section className="card animate-rise p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">คำติชมจากผู้ใช้งาน</h2>
              <p className="text-sm text-muted">กรองและจัดการสถานะการตอบรับปัญหา</p>
            </div>
            <Segmented
              label="กรองคำติชม"
              value={feedbackFilter}
              onChange={setFeedbackFilter}
              options={[
                { value: "all", label: "ทั้งหมด" },
                { value: "new", label: feedbackStatusLabel.new },
                { value: "reviewed", label: feedbackStatusLabel.reviewed },
                { value: "archived", label: feedbackStatusLabel.archived }
              ]}
            />
          </div>

          <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto">
            {filteredFeedbacks.map((item) => {
              const user = userList.find((profile) => profile.id === item.user_id);
              return (
                <article className="rounded-2xl border border-line p-4" key={item.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-semibold text-ink">{user?.display_name || user?.email || "ไม่ทราบผู้ใช้"}</p>
                    <span className={`badge ${feedbackTone[item.status]}`}>{feedbackStatusLabel[item.status]}</span>
                  </div>
                  <p className="mt-2 text-[0.9375rem] text-ink-soft">{item.message}</p>
                  <div className="mt-3 flex justify-end gap-2">
                    {item.status !== "reviewed" && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateFeedbackStatus(item.id, "reviewed")}>
                        ทำเครื่องหมายอ่านแล้ว
                      </button>
                    )}
                    {item.status !== "archived" && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateFeedbackStatus(item.id, "archived")}>
                        เก็บถาวร
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {filteredFeedbacks.length === 0 && <p className="py-12 text-center text-muted">ไม่มีรายการติชมในหมวดหมู่นี้</p>}
          </div>
        </section>
      )}

      {/* Tab 3: Audit logs */}
      {consoleTab === "audit" && (
        <section className="card animate-rise p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">ประวัติการทำงาน (Audit logs)</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <input
                aria-label="ค้นหาประวัติ"
                className="field pl-10"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="ค้นหา Action, ผู้ทำ หรือ Target ID..."
              />
            </div>
            <select
              aria-label="กรองตามโมดูล"
              className="field"
              value={auditTypeFilter}
              onChange={(e) => setAuditTypeFilter(e.target.value)}
            >
              <option value="all">ทุกโมดูลระบบ</option>
              <option value="user">ผู้ใช้ (user)</option>
              <option value="umbrella">ร่ม (umbrella)</option>
              <option value="feedback">ฟีดแบค (feedback)</option>
            </select>
          </div>

          <div className="mt-4 max-h-[32rem] divide-y divide-line overflow-y-auto">
            {filteredAuditLogs.map((log) => (
              <article className="py-3.5" key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-sm font-semibold text-ink">{log.action}</p>
                  <span className="badge">{log.entity_type}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  <span className="text-muted">ผู้ทำ</span> {log.actorName}
                  {log.targetName && (
                    <>
                      {" · "}
                      <span className="text-muted">เป้าหมาย</span> {log.targetName}
                    </>
                  )}
                  {log.entity_id && (
                    <>
                      {" · "}
                      <span className="text-muted">ID</span>{" "}
                      <code className="rounded bg-sunken px-1 py-0.5 font-mono text-xs">{log.entity_id}</code>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted">{new Date(log.created_at).toLocaleString("th-TH")}</p>
              </article>
            ))}
            {filteredAuditLogs.length === 0 && <p className="py-12 text-center text-muted">ไม่พบประวัติการทำรายการตามตัวกรอง</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <section className="card animate-rise p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink sm:text-3xl">{value}</p>
    </section>
  );
}
