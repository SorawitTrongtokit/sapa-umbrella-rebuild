"use client";

import { useMemo, useState } from "react";
import { Eye, KeyRound, MessageSquare, Save, Search, ShieldAlert, UserCog, Users } from "lucide-react";
import type { AuditLog, Feedback, Profile } from "@/lib/types";

type OwnerClientProps = {
  users: Profile[];
  feedback: Feedback[];
  auditLogs: AuditLog[];
};

export function OwnerClient({ users, feedback, auditLogs }: OwnerClientProps) {
  const [userList, setUserList] = useState(users);
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [revealedPassword, setRevealedPassword] = useState("");
  const [message, setMessage] = useState("");
  const selectedUser = userList.find((user) => user.id === selectedUserId) ?? userList[0];

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

  async function updateUser(patch: Partial<Profile>) {
    if (!selectedUser) return;
    setMessage("");
    const response = await fetch(`/api/owner/users/${selectedUser.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: patch.display_name,
        classLevel: patch.class_level,
        studentNumber: patch.student_number,
        role: patch.role,
        status: patch.status
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
      setMessage("แสดงรหัสผ่านแล้ว และบันทึก audit log แล้ว");
    } else {
      setMessage(payload.error ?? "ไม่สามารถแสดงรหัสผ่านได้");
    }
  }

  return (
    <div className="animate-page grid grid-cols-12 gap-6">
      <aside className="col-span-full space-y-6 lg:col-span-3 lg:sticky lg:top-6 lg:self-start">
        <section className="glass-card animate-rise rounded-[32px] p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-blue-950">ผู้ใช้ทั้งหมด</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{filteredUsers.length} results</p>
            </div>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
              <Users aria-hidden="true" size={21} />
            </span>
          </div>

          <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
            ค้นหาผู้ใช้
            <span className="relative mt-2 block">
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={17} />
              <input
                className="focus-ring field-control min-h-12 w-full rounded-2xl py-3 pl-11 pr-4 text-sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ชื่อ อีเมล ชั้น หรือเลขที่"
              />
            </span>
          </label>

          <div className="mt-5 max-h-[560px] space-y-2 overflow-auto pr-1">
            {filteredUsers.map((user) => (
              <button
                className={`focus-ring w-full cursor-pointer rounded-2xl border p-4 text-left text-sm shadow-sm transition-colors ${
                  selectedUser?.id === user.id
                    ? "border-blue-200 bg-blue-50 text-blue-950"
                    : "border-slate-100 bg-white/80 text-slate-700 hover:bg-sky-50"
                }`}
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
              >
                <span className="block truncate font-black">{user.display_name || user.email}</span>
                <span className="mt-1 block truncate text-xs font-bold text-slate-500">
                  {user.class_level ?? "-"} เลขที่ {user.student_number ?? "-"} • {user.role}
                </span>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="col-span-full space-y-6 lg:col-span-9">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard label="ผู้ใช้ทั้งหมด" value={totals.users} tone="blue" delay={0} />
          <MetricCard label="บัญชี active" value={totals.active} tone="green" delay={45} />
          <MetricCard label="ผู้ดูแลระบบ" value={totals.admins} tone="orange" delay={90} />
        </div>

        {message ? (
          <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900" role="status">
            {message}
          </p>
        ) : null}

        {selectedUser ? (
          <section className="glass-card animate-rise rounded-[32px] p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-md shadow-orange-100 sm:hidden">
                  <UserCog aria-hidden="true" size={26} />
                </div>
                <h2 className="truncate text-2xl font-black tracking-normal text-blue-950">
                  {selectedUser.display_name || selectedUser.email}
                </h2>
                <p className="mt-1 truncate text-sm font-medium text-slate-500">{selectedUser.email}</p>
              </div>
              <span
                className={`w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${
                  selectedUser.status === "active"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-rose-100 bg-rose-50 text-rose-700"
                }`}
              >
                {selectedUser.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                ชื่อที่แสดง
                <input
                  className="focus-ring field-control mt-2 min-h-12 w-full rounded-2xl px-4 py-3 text-sm"
                  value={selectedUser.display_name ?? ""}
                  onChange={(event) =>
                    setUserList((current) =>
                      current.map((user) =>
                        user.id === selectedUser.id ? { ...user, display_name: event.target.value } : user
                      )
                    )
                  }
                />
              </label>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                ชั้น
                <input
                  className="focus-ring field-control mt-2 min-h-12 w-full rounded-2xl px-4 py-3 text-sm"
                  value={selectedUser.class_level ?? ""}
                  onChange={(event) =>
                    setUserList((current) =>
                      current.map((user) =>
                        user.id === selectedUser.id ? { ...user, class_level: event.target.value } : user
                      )
                    )
                  }
                />
              </label>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                เลขที่
                <input
                  className="focus-ring field-control mt-2 min-h-12 w-full rounded-2xl px-4 py-3 text-sm"
                  inputMode="numeric"
                  value={selectedUser.student_number ?? ""}
                  onChange={(event) =>
                    setUserList((current) =>
                      current.map((user) =>
                        user.id === selectedUser.id
                          ? { ...user, student_number: Number(event.target.value || 0) }
                          : user
                      )
                    )
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                  สิทธิ์
                  <select
                    className="focus-ring field-control mt-2 min-h-12 w-full rounded-2xl px-4 py-3 text-sm"
                    value={selectedUser.role}
                    onChange={(event) =>
                      setUserList((current) =>
                        current.map((user) =>
                          user.id === selectedUser.id
                            ? { ...user, role: event.target.value as Profile["role"] }
                            : user
                        )
                      )
                    }
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="owner">owner</option>
                  </select>
                </label>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                  สถานะ
                  <select
                    className="focus-ring field-control mt-2 min-h-12 w-full rounded-2xl px-4 py-3 text-sm"
                    value={selectedUser.status}
                    onChange={(event) =>
                      setUserList((current) =>
                        current.map((user) =>
                          user.id === selectedUser.id
                            ? { ...user, status: event.target.value as Profile["status"] }
                            : user
                        )
                      )
                    }
                  >
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                  </select>
                </label>
              </div>
            </div>

            <button
              className="btn-primary focus-ring mt-6 flex cursor-pointer items-center gap-2 px-5 py-3 text-sm"
              type="button"
              onClick={() => updateUser(selectedUser)}
            >
              <Save aria-hidden="true" size={16} />
              บันทึกผู้ใช้
            </button>
          </section>
        ) : null}

        {selectedUser ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="glass-card animate-rise rounded-[32px] p-6">
              <h2 className="flex items-center gap-2 text-base font-black text-blue-950">
                <KeyRound aria-hidden="true" size={18} />
                แก้ไขรหัสผ่าน
              </h2>
              <form className="mt-4 space-y-3" onSubmit={changePassword}>
                <input
                  className="focus-ring field-control min-h-12 w-full rounded-2xl px-4 py-3 text-sm"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="รหัสผ่านใหม่"
                  required
                />
                <button className="btn-primary focus-ring w-full cursor-pointer px-4 py-3 text-sm">
                  เปลี่ยนรหัสผ่าน
                </button>
              </form>
            </section>

            <section className="animate-rise rounded-[32px] border border-rose-100 bg-white/88 p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-black text-blue-950">
                <Eye aria-hidden="true" size={18} />
                ดูรหัสผ่าน
              </h2>
              <form className="mt-4 space-y-3" onSubmit={revealPassword}>
                <input
                  className="focus-ring field-control min-h-12 w-full rounded-2xl px-4 py-3 text-sm"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="เหตุผลในการดูรหัสผ่าน"
                  required
                />
                <button className="focus-ring min-h-11 w-full cursor-pointer rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-rose-200 transition-colors hover:bg-rose-700">
                  แสดงรหัสผ่าน
                </button>
              </form>
              {revealedPassword ? (
                <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-mono text-sm font-bold text-rose-900">
                  {revealedPassword}
                </p>
              ) : null}
            </section>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="glass-card animate-rise rounded-[32px] p-6">
            <h2 className="flex items-center gap-2 text-base font-black text-blue-950">
              <MessageSquare aria-hidden="true" size={18} />
              คำติชมทั้งหมด
            </h2>
            <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
              {feedback.map((item) => {
                const user = userList.find((profile) => profile.id === item.user_id);
                return (
                  <article className="rounded-2xl border border-slate-100 bg-white/75 p-4 text-sm shadow-sm" key={item.id}>
                    <p className="truncate font-black text-slate-950">{user?.display_name || user?.email || "ไม่ทราบผู้ใช้"}</p>
                    <p className="mt-2 leading-6 text-slate-600">{item.message}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="glass-card animate-rise rounded-[32px] p-6">
            <h2 className="flex items-center gap-2 text-base font-black text-blue-950">
              <ShieldAlert aria-hidden="true" size={18} />
              Audit logs
            </h2>
            <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
              {auditLogs.map((log) => (
                <article className="rounded-2xl border border-slate-100 bg-white/75 p-4 text-sm shadow-sm" key={log.id}>
                  <p className="truncate font-black text-slate-950">{log.action}</p>
                  <p className="mt-1 text-slate-600">
                    {log.entity_type} {log.entity_id ?? ""}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {new Date(log.created_at).toLocaleString("th-TH")}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
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
  tone: "blue" | "green" | "orange";
  delay: number;
}) {
  const colors = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700"
  };

  return (
    <section className={`animate-rise rounded-[28px] border p-5 shadow-sm ${colors[tone]}`} style={{ animationDelay: `${delay}ms` }}>
      <p className="text-xs font-black uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-normal">{value}</p>
    </section>
  );
}
