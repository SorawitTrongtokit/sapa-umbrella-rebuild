"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Eye, Filter, KeyRound, MessageSquare, Save, Search, ShieldAlert, UserCog, Users } from "lucide-react";
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
  const [message, setMessage] = useState("");
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
        setMessage("รหัสผ่านถูกซ่อนอัตโนมัติหลังจาก 15 วินาทีเพื่อความปลอดภัย");
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [revealedPassword]);

  const [editForm, setEditForm] = useState({
    displayName: "",
    classLevel: "",
    studentNumber: "",
    role: "user" as Profile["role"],
    status: "active" as Profile["status"]
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
    setMessage("");
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
      setMessage("บันทึกข้อมูลผู้ใช้แล้ว");
    } else {
      setMessage(payload.error ?? "บันทึกไม่สำเร็จ");
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    setMessage("");
    const response = await fetch(`/api/owner/users/${selectedUser.id}/password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    if (payload.ok) {
      setPassword("");
      setMessage("เปลี่ยนรหัสผ่านแล้ว");
    } else {
      setMessage(payload.error ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    }
  }

  async function revealPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    setMessage("");
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
      setMessage("แสดงรหัสผ่านแล้ว และบันทึก audit log แล้ว");
    } else {
      setMessage(payload.error ?? "ไม่สามารถแสดงรหัสผ่านได้");
    }
  }

  function copyPasswordToClipboard() {
    if (!revealedPassword) return;
    navigator.clipboard.writeText(revealedPassword);
    setMessage("คัดลอกรหัสผ่านไปยังคลิปบอร์ดแล้ว");
  }

  async function updateFeedbackStatus(id: string, newStatus: "new" | "reviewed" | "archived") {
    setMessage("");
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
        setMessage("อัปเดตสถานะฟีดแบคสำเร็จ");
      } else {
        setMessage(payload.error ?? "ไม่สามารถอัปเดตสถานะฟีดแบคได้");
      }
    } catch {
      setMessage("เชื่อมต่อระบบไม่สำเร็จ");
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

  return (
    <div className="animate-page flex flex-col gap-5 lg:gap-6">
      
      {/* Top Level Metric Summaries */}
      <div className="grid grid-cols-3 gap-3.5 sm:gap-5">
        <MetricCard label="ผู้ใช้ทั้งหมด" value={totals.users} tone="indigo" delay={0} />
        <MetricCard label="บัญชีใช้งาน" value={totals.active} tone="green" delay={45} />
        <MetricCard label="ผู้ดูแลระบบ" value={totals.admins} tone="orange" delay={90} />
      </div>

      {message ? (
        <p className="rounded-2xl border border-indigo-200/50 bg-indigo-50/50 px-4 py-3 text-xs sm:text-sm font-bold text-indigo-900 animate-pop" role="status">
          {message}
        </p>
      ) : null}

      {/* Tabs navigation panel for compact responsive workspace */}
      <div className="flex border-b border-slate-200/60 pb-px gap-2 scrollbar-none overflow-x-auto text-sm font-bold">
        <button
          onClick={() => setConsoleTab("users")}
          className={`flex items-center gap-2 pb-3.5 px-1 border-b-2 transition-all cursor-pointer ${
            consoleTab === "users" ? "border-indigo-600 text-indigo-950" : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <UserCog size={16} />
          <span>จัดการผู้ใช้งาน</span>
        </button>
        <button
          onClick={() => setConsoleTab("feedback")}
          className={`flex items-center gap-2 pb-3.5 px-1 border-b-2 transition-all cursor-pointer ${
            consoleTab === "feedback" ? "border-indigo-600 text-indigo-950" : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <MessageSquare size={16} />
          <span>คำติชม ({filteredFeedbacks.length})</span>
        </button>
        <button
          onClick={() => setConsoleTab("audit")}
          className={`flex items-center gap-2 pb-3.5 px-1 border-b-2 transition-all cursor-pointer ${
            consoleTab === "audit" ? "border-indigo-600 text-indigo-950" : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <ShieldAlert size={16} />
          <span>ประวัติระบบ (Audit Logs)</span>
        </button>
      </div>

      {/* Tab contents */}
      <div className="grid grid-cols-12 gap-5 lg:gap-6 items-start">
        
        {/* Tab 1: Users Manager */}
        {consoleTab === "users" && (
          <>
            {/* Sidebar list on desktop, inline grid on mobile */}
            <aside className="col-span-full lg:col-span-4 space-y-4">
              <section className="glass-card rounded-[24px] p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-slate-800">ค้นหาสมาชิก</h2>
                    <p className="text-[10px] font-bold text-slate-400">{filteredUsers.length} รายการที่พบ</p>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-xl premium-gradient-1 text-white shadow-sm">
                    <Users aria-hidden="true" size={16} />
                  </span>
                </div>

                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={15} />
                  <input
                    className="focus-ring field-control w-full min-h-10 px-3.5 pl-9 py-1 text-sm rounded-xl"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ชื่อ, อีเมล, ชั้น หรือเลขที่..."
                  />
                </div>

                {/* Users Buttons selection area */}
                <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                  {filteredUsers.map((user) => (
                    <button
                      className={`focus-ring w-full cursor-pointer rounded-xl border p-3 text-left text-xs font-bold transition-all ${
                        selectedUser?.id === user.id
                          ? "border-indigo-200 bg-indigo-50/50 text-indigo-950"
                          : "border-slate-100 bg-white/70 text-slate-700 hover:bg-indigo-50/20"
                      }`}
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <span className="block truncate font-black text-sm">{user.display_name || user.email}</span>
                      <span className="mt-1 block truncate text-[10px] font-bold text-slate-400">
                        {user.class_level ?? "-"} เลขที่ {user.student_number ?? "-"} • {user.role}
                      </span>
                    </button>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-center py-6 text-slate-400 font-medium">ไม่พบบัญชีที่ค้นหา</p>
                  )}
                </div>
              </section>
            </aside>

            {/* Profile editor panel */}
            <div className="col-span-full lg:col-span-8 space-y-5">
              {selectedUser ? (
                <>
                  <section className="glass-card rounded-[28px] p-5 sm:p-6 space-y-5 animate-rise">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-extrabold text-slate-800">
                          {selectedUser.display_name || selectedUser.email}
                        </h2>
                        <p className="truncate text-xs font-bold text-slate-400 mt-0.5">{selectedUser.email}</p>
                      </div>
                      <span
                        className={`w-fit rounded-lg border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          selectedUser.status === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
                            : "border-rose-200 bg-rose-50/80 text-rose-700 shadow-sm"
                        }`}
                      >
                        {selectedUser.status}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                        ชื่อที่แสดง
                        <input
                          className="focus-ring field-control mt-2 w-full px-3.5 py-2 text-sm"
                          value={editForm.displayName}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, displayName: event.target.value }))
                          }
                        />
                      </label>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                        ชั้น
                        <input
                          className="focus-ring field-control mt-2 w-full px-3.5 py-2 text-sm"
                          value={editForm.classLevel}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, classLevel: event.target.value }))
                          }
                        />
                      </label>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                        เลขที่
                        <input
                          className="focus-ring field-control mt-2 w-full px-3.5 py-2 text-sm"
                          inputMode="numeric"
                          value={editForm.studentNumber}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, studentNumber: event.target.value }))
                          }
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3.5">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                          สิทธิ์การใช้งาน
                          <select
                            className="focus-ring field-control mt-2 w-full px-3.5 py-2 text-sm"
                            value={editForm.role}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, role: event.target.value as Profile["role"] }))
                            }
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="owner">owner</option>
                          </select>
                        </label>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                          สถานะบัญชี
                          <select
                            className="focus-ring field-control mt-2 w-full px-3.5 py-2 text-sm"
                            value={editForm.status}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, status: event.target.value as Profile["status"] }))
                            }
                          >
                            <option value="active">active</option>
                            <option value="suspended">suspended</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <button
                      className="btn-primary focus-ring flex cursor-pointer items-center gap-1.5 px-4.5 py-2.5 text-sm"
                      type="button"
                      onClick={updateUser}
                    >
                      <Save aria-hidden="true" size={15} />
                      <span>บันทึกการเปลี่ยนแปลง</span>
                    </button>
                  </section>

                  {/* Settings section cards */}
                  <div className="grid gap-5 sm:grid-cols-2 animate-rise">
                    <section className="glass-card rounded-[24px] p-5">
                      <h2 className="flex items-center gap-2 text-sm font-black text-slate-700">
                        <KeyRound aria-hidden="true" size={16} />
                        เปลี่ยนรหัสผ่าน
                      </h2>
                      <form className="mt-3.5 space-y-3" onSubmit={changePassword}>
                        <input
                          className="focus-ring field-control w-full px-3.5 py-2.5 text-sm"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="รหัสผ่านใหม่..."
                          required
                        />
                        {password.length > 0 && password.length < 8 && (
                          <p className="text-[10px] font-bold text-rose-600 animate-rise">
                            * รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร
                          </p>
                        )}
                        <button
                          className="btn-primary focus-ring w-full cursor-pointer py-2.5 text-sm disabled:bg-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
                          disabled={password.length < 8}
                        >
                          เปลี่ยนรหัสผ่าน
                        </button>
                      </form>
                    </section>

                    <section className="glass-card rounded-[24px] border border-rose-200/50 bg-rose-50/5 p-5">
                      <h2 className="flex items-center gap-2 text-sm font-black text-slate-700">
                        <Eye aria-hidden="true" size={16} />
                        แสดงรหัสผ่านผู้ใช้
                      </h2>
                      <form className="mt-3.5 space-y-3" onSubmit={revealPassword}>
                        <input
                          className="focus-ring field-control w-full px-3.5 py-2.5 text-sm"
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="ระบุเหตุผลการตรวจสอบ..."
                          required
                        />
                        {reason.length > 0 && reason.trim().length < 3 && (
                          <p className="text-[10px] font-bold text-rose-600 animate-rise">
                            * กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร
                          </p>
                        )}
                        <button
                          className="focus-ring w-full cursor-pointer py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-sm active:scale-95 text-sm disabled:bg-slate-400 disabled:shadow-none"
                          disabled={reason.trim().length < 3}
                        >
                          แสดงรหัสผ่าน
                        </button>
                      </form>

                      {revealedPassword ? (
                        <div className="mt-3.5 animate-pop">
                          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 font-mono text-xs font-bold text-rose-800">
                            <span className="truncate">{showRevealedPassword ? revealedPassword : "•".repeat(revealedPassword.length)}</span>
                            <div className="flex gap-2.5 shrink-0 ml-2">
                              <button
                                type="button"
                                className="text-[10px] text-rose-700 hover:text-rose-950 underline font-black"
                                onClick={() => setShowRevealedPassword(!showRevealedPassword)}
                              >
                                {showRevealedPassword ? "ซ่อน" : "แสดง"}
                              </button>
                              <button
                                type="button"
                                className="text-[10px] text-rose-700 hover:text-rose-950 underline font-black"
                                onClick={copyPasswordToClipboard}
                              >
                                คัดลอก
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  </div>
                </>
              ) : (
                <p className="text-center py-10 text-slate-400 font-bold">กรุณาเลือกผู้ใช้งานจากแถบค้นหาเพื่อเริ่มจัดการ</p>
              )}
            </div>
          </>
        )}

        {/* Tab 2: Feedbacks Management */}
        {consoleTab === "feedback" && (
          <section className="col-span-full glass-card rounded-[28px] p-5 sm:p-6 space-y-4 animate-rise">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-800">คำติชมจากผู้ใช้งาน</h2>
                <p className="text-[10px] font-bold text-slate-400">กรองและจัดการสถานะการตอบรับปัญหา</p>
              </div>

              {/* Feedbacks filtering pill tabs */}
              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/80 p-1 text-xs font-bold w-fit">
                <button
                  type="button"
                  onClick={() => setFeedbackFilter("all")}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    feedbackFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackFilter("new")}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    feedbackFilter === "new" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ใหม่
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackFilter("reviewed")}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    feedbackFilter === "reviewed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  อ่านแล้ว
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackFilter("archived")}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    feedbackFilter === "archived" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  เก็บถาวร
                </button>
              </div>
            </div>

            {/* List scroll container */}
            <div className="max-h-[500px] space-y-3.5 overflow-y-auto pr-1">
              {filteredFeedbacks.map((item) => {
                const user = userList.find((profile) => profile.id === item.user_id);
                const badgeColors = {
                  new: "border-rose-200 bg-rose-50 text-rose-700",
                  reviewed: "border-indigo-200 bg-indigo-50 text-indigo-700",
                  archived: "border-slate-200 bg-slate-50 text-slate-500"
                };
                return (
                  <article className="rounded-2xl border border-slate-100 bg-white/40 p-4.5 text-sm shadow-sm transition-all" key={item.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-extrabold text-slate-800">{user?.display_name || user?.email || "ไม่ทราบผู้ใช้"}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badgeColors[item.status as keyof typeof badgeColors]}`}>
                        {item.status === "new" ? "ใหม่" : item.status === "reviewed" ? "อ่านแล้ว" : "เก็บถาวร"}
                      </span>
                    </div>
                    <p className="mt-2.5 leading-relaxed text-slate-600 break-words font-medium">{item.message}</p>
                    <div className="mt-4 flex gap-3 justify-end border-t border-slate-100/50 pt-3">
                      {item.status !== "reviewed" && (
                        <button
                          type="button"
                          className="text-xs text-indigo-600 hover:text-indigo-800 underline font-black cursor-pointer"
                          onClick={() => updateFeedbackStatus(item.id, "reviewed")}
                        >
                          ทำเครื่องหมายอ่านแล้ว
                        </button>
                      )}
                      {item.status !== "archived" && (
                        <button
                          type="button"
                          className="text-xs text-slate-400 hover:text-slate-600 underline font-black cursor-pointer"
                          onClick={() => updateFeedbackStatus(item.id, "archived")}
                        >
                          เก็บถาวร
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {filteredFeedbacks.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-bold">ไม่มีรายการติชมในหมวดหมู่นี้</p>
              )}
            </div>
          </section>
        )}

        {/* Tab 3: System Audit Logs */}
        {consoleTab === "audit" && (
          <section className="col-span-full glass-card rounded-[28px] p-5 sm:p-6 space-y-4 animate-rise">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <ShieldAlert size={18} />
              <span>ประวัติการทำงาน (Audit logs)</span>
            </h2>

            {/* Filters panel */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 border-b border-slate-100 pb-4">
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={14} />
                <input
                  className="focus-ring field-control w-full min-h-9 pl-9 pr-3.5 py-1 text-xs rounded-xl"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="ค้นหา Action, ผู้ทำ หรือ Target ID..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select
                  className="focus-ring field-control w-full min-h-9 px-3.5 py-1 text-xs rounded-xl"
                  value={auditTypeFilter}
                  onChange={(e) => setAuditTypeFilter(e.target.value)}
                >
                  <option value="all">ทุกโมดูลระบบ</option>
                  <option value="user">ผู้ใช้ (user)</option>
                  <option value="umbrella">ร่ม (umbrella)</option>
                  <option value="feedback">ฟีดแบค (feedback)</option>
                </select>
              </div>
            </div>

            {/* Logs timeline list */}
            <div className="max-h-[500px] space-y-3.5 overflow-y-auto pr-1">
              {filteredAuditLogs.map((log) => (
                <article className="rounded-2xl border border-slate-100 bg-white/40 p-4 text-xs font-bold shadow-sm" key={log.id}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-extrabold text-slate-800">{log.action}</p>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                      {log.entity_type}
                    </span>
                  </div>
                  <p className="mt-1.5 text-slate-500 font-medium leading-relaxed">
                    <span className="font-extrabold">ผู้ทำ:</span> {log.actorName}
                    {log.targetName && (
                      <> • <span className="font-extrabold">เป้าหมาย:</span> {log.targetName}</>
                    )}
                    {log.entity_id && (
                      <> • <span className="font-extrabold">ID:</span> <code className="font-mono text-[9px] bg-slate-100 px-1 py-0.5 rounded">{log.entity_id}</code></>
                    )}
                  </p>
                  <p className="mt-2 text-[9px] text-slate-400">
                    {new Date(log.created_at).toLocaleString("th-TH")}
                  </p>
                </article>
              ))}
              {filteredAuditLogs.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-bold">ไม่พบประวัติการทำรายการตามตัวกรอง</p>
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  delay
}: {
  label: string;
  value: number;
  tone: "indigo" | "green" | "orange";
  delay: number;
}) {
  const colors = {
    indigo: "border-indigo-150 bg-indigo-50/50 text-indigo-700",
    green: "border-emerald-150 bg-emerald-50/50 text-emerald-750",
    orange: "border-orange-150 bg-orange-50/50 text-orange-700"
  };

  return (
    <section className={`glass-card rounded-2xl p-4.5 ${colors[tone]}`} style={{ animationDelay: `${delay}ms` } as React.CSSProperties}>
      <p className="text-[9px] sm:text-xs font-black uppercase tracking-wider opacity-85">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </section>
  );
}
