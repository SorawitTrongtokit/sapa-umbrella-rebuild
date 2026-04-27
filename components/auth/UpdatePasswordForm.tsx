"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setIsLoading(true);
    const response = await fetch("/api/auth/update-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    setIsLoading(false);

    if (!payload.ok) {
      setMessage(payload.error ?? "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
      return;
    }

    router.replace("/auth/login?message=ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบอีกครั้ง");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
        รหัสผ่านใหม่
        <input
          className="focus-ring field-control mt-2 min-h-12 w-full rounded-2xl px-4 py-3 text-base text-slate-950"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
        ยืนยันรหัสผ่านใหม่
        <input
          className="focus-ring field-control mt-2 min-h-12 w-full rounded-2xl px-4 py-3 text-base text-slate-950"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </label>
      {message ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800" role="alert">
          {message}
        </p>
      ) : null}
      <button
        className="btn-primary focus-ring flex w-full cursor-pointer items-center justify-center gap-2 px-4 py-4 text-lg disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
        disabled={isLoading}
        type="submit"
      >
        <KeyRound aria-hidden="true" size={18} />
        {isLoading ? "กำลังบันทึก" : "ตั้งรหัสผ่านใหม่"}
      </button>
    </form>
  );
}
