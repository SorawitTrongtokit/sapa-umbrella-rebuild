"use client";

import { useMemo, useState } from "react";
import { Eye, KeyRound, Save, Search, ShieldAlert } from "lucide-react";
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
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
      <aside className="space-y-4 xl:sticky xl:top-5">
        <section className="app-surface rounded-[8px] p-4">
          <label className="block text-sm font-medium text-slate-700">
            ค้นหาผู้ใช้
            <span className="relative mt-2 block">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
              <input
                className="focus-ring field-control min-h-11 w-full rounded-[8px] py-2 pl-9 pr-3 text-sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
          </label>
          <div className="mt-4 max-h-[520px] space-y-2 overflow-auto pr-1">
            {filteredUsers.map((user) => (
              <button
                className={`focus-ring w-full cursor-pointer rounded-[8px] border p-3 text-left text-sm shadow-sm transition-colors ${
                  selectedUser?.id === user.id
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white/80 hover:bg-indigo-50/70"
                }`}
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
              >
                <span className="block font-medium text-slate-950">{user.display_name || user.email}</span>
                <span className="mt-1 block text-slate-600">
                  {user.class_level ?? "-"} เลขที่ {user.student_number ?? "-"} | {user.role}
                </span>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="space-y-5">
        {message ? (
          <p className="rounded-[8px] border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-900" role="status">{message}</p>
        ) : null}

        {selectedUser ? (
          <section className="app-surface rounded-[8px] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{selectedUser.display_name || selectedUser.email}</h2>
                <p className="mt-1 text-sm text-slate-600">{selectedUser.email}</p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  selectedUser.status === "active"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-rose-100 bg-rose-50 text-rose-800"
                }`}
              >
                {selectedUser.status}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                ชื่อที่แสดง
                <input
                  className="focus-ring field-control mt-1.5 min-h-11 w-full rounded-[8px] px-3 py-2 text-sm"
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
              <label className="block text-sm font-medium text-slate-700">
                ชั้น
                <input
                  className="focus-ring field-control mt-1.5 min-h-11 w-full rounded-[8px] px-3 py-2 text-sm"
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
              <label className="block text-sm font-medium text-slate-700">
                เลขที่
                <input
                  className="focus-ring field-control mt-1.5 min-h-11 w-full rounded-[8px] px-3 py-2 text-sm"
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
                <label className="block text-sm font-medium text-slate-700">
                  สิทธิ์
                  <select
                    className="focus-ring field-control mt-1.5 min-h-11 w-full rounded-[8px] px-3 py-2 text-sm"
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
                <label className="block text-sm font-medium text-slate-700">
                  สถานะ
                  <select
                    className="focus-ring field-control mt-1.5 min-h-11 w-full rounded-[8px] px-3 py-2 text-sm"
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
              className="focus-ring mt-4 flex min-h-11 cursor-pointer items-center gap-2 rounded-[8px] bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800"
              type="button"
              onClick={() => updateUser(selectedUser)}
            >
              <Save aria-hidden="true" size={16} />
              บันทึกผู้ใช้
            </button>
          </section>
        ) : null}

        {selectedUser ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="app-surface rounded-[8px] p-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <KeyRound aria-hidden="true" size={18} />
                แก้ไขรหัสผ่าน
              </h2>
              <form className="mt-4 space-y-3" onSubmit={changePassword}>
                <input
                  className="focus-ring field-control min-h-11 w-full rounded-[8px] px-3 py-2 text-sm"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="รหัสผ่านใหม่"
                  required
                />
                <button className="focus-ring min-h-11 w-full cursor-pointer rounded-[8px] bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">
                  เปลี่ยนรหัสผ่าน
                </button>
              </form>
            </section>

            <section className="rounded-[8px] border border-rose-200 bg-white/88 p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <Eye aria-hidden="true" size={18} />
                ดูรหัสผ่าน
              </h2>
              <form className="mt-4 space-y-3" onSubmit={revealPassword}>
                <input
                  className="focus-ring field-control min-h-11 w-full rounded-[8px] px-3 py-2 text-sm"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="เหตุผลในการดูรหัสผ่าน"
                  required
                />
                <button className="focus-ring min-h-11 w-full cursor-pointer rounded-[8px] bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700">
                  แสดงรหัสผ่าน
                </button>
              </form>
              {revealedPassword ? (
                <p className="mt-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-sm text-rose-900">
                  {revealedPassword}
                </p>
              ) : null}
            </section>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="app-surface rounded-[8px] p-4">
            <h2 className="text-base font-semibold text-slate-950">คำติชมทั้งหมด</h2>
            <div className="mt-4 max-h-80 space-y-3 overflow-auto">
              {feedback.map((item) => {
                const user = userList.find((profile) => profile.id === item.user_id);
                return (
                  <article className="rounded-[8px] border border-slate-200 bg-white/70 p-3 text-sm shadow-sm" key={item.id}>
                    <p className="font-medium text-slate-950">{user?.display_name || user?.email || "ไม่ทราบผู้ใช้"}</p>
                    <p className="mt-2 leading-6 text-slate-700">{item.message}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="app-surface rounded-[8px] p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <ShieldAlert aria-hidden="true" size={18} />
              Audit logs
            </h2>
            <div className="mt-4 max-h-80 space-y-3 overflow-auto">
              {auditLogs.map((log) => (
                <article className="rounded-[8px] border border-slate-200 bg-white/70 p-3 text-sm shadow-sm" key={log.id}>
                  <p className="font-medium text-slate-950">{log.action}</p>
                  <p className="mt-1 text-slate-600">
                    {log.entity_type} {log.entity_id ?? ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(log.created_at).toLocaleString("th-TH")}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
