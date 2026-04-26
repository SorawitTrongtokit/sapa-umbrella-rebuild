"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, classLevel, studentNumber, password })
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };

    if (!payload.ok) {
      setIsLoading(false);
      setMessage(payload.error ?? "สมัครบัญชีไม่สำเร็จ");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (error) {
      router.replace("/auth/login?message=สมัครสำเร็จ กรุณาเข้าสู่ระบบ");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        อีเมล
        <input
          className="focus-ring field-control mt-2 min-h-11 w-full rounded-[8px] px-3 py-2.5 text-slate-950"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700">
          ชั้น
          <input
            className="focus-ring field-control mt-2 min-h-11 w-full rounded-[8px] px-3 py-2.5 text-slate-950"
            value={classLevel}
            onChange={(event) => setClassLevel(event.target.value)}
            placeholder="เช่น ม.5/1"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          เลขที่
          <input
            className="focus-ring field-control mt-2 min-h-11 w-full rounded-[8px] px-3 py-2.5 text-slate-950"
            inputMode="numeric"
            value={studentNumber}
            onChange={(event) => setStudentNumber(event.target.value)}
            required
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        รหัสผ่าน
        <input
          className="focus-ring field-control mt-2 min-h-11 w-full rounded-[8px] px-3 py-2.5 text-slate-950"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {message ? (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-800" role="alert">{message}</p>
      ) : null}
      <button
        className="focus-ring flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
        disabled={isLoading}
        type="submit"
      >
        <UserPlus aria-hidden="true" size={18} />
        {isLoading ? "กำลังสมัคร" : "สมัครบัญชี"}
      </button>
    </form>
  );
}
