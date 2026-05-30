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
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
        อีเมล
        <input
          className="focus-ring field-control mt-2 w-full px-4 py-3 text-slate-900 placeholder:text-slate-400"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="example@email.com"
          required
        />
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
          ชั้น
          <input
            className="focus-ring field-control mt-2 w-full px-4 py-3 text-slate-900 placeholder:text-slate-400"
            value={classLevel}
            onChange={(event) => setClassLevel(event.target.value)}
            placeholder="ม.5/1"
            required
          />
        </label>
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
          เลขที่
          <input
            className="focus-ring field-control mt-2 w-full px-4 py-3 text-slate-900 placeholder:text-slate-400"
            inputMode="numeric"
            value={studentNumber}
            onChange={(event) => setStudentNumber(event.target.value)}
            placeholder="1"
            required
          />
        </label>
      </div>
      
      <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
        รหัสผ่าน
        <input
          className="focus-ring field-control mt-2 w-full px-4 py-3 text-slate-900 placeholder:text-slate-400"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
          required
        />
      </label>

      {message ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3.5 text-xs font-bold transition-all animate-pop" role="alert">
          {message}
        </p>
      ) : null}

      <button
        className="btn-primary focus-ring flex w-full cursor-pointer items-center justify-center gap-2 text-base disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
        disabled={isLoading}
        type="submit"
      >
        <UserPlus aria-hidden="true" size={18} />
        {isLoading ? "กำลังสมัครบัญชี..." : "สมัครบัญชี"}
      </button>
    </form>
  );
}
