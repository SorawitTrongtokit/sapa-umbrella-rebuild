"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`
    });

    setIsLoading(false);

    if (error) {
      setMessage("ส่งลิงก์รีเซ็ตรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      return;
    }

    setMessage("ถ้าอีเมลนี้มีอยู่ในระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้");
  }

  return (
    <div className="space-y-6">
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

        {message ? (
          <p
            className={`rounded-2xl border px-4 py-3.5 text-xs font-bold transition-all animate-pop ${
              message.includes("เราจะส่งลิงก์")
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm"
                : "border-rose-200 bg-rose-50 text-rose-800 shadow-sm"
            }`}
            role="status"
          >
            {message}
          </p>
        ) : null}

        <button
          className="btn-primary focus-ring flex w-full cursor-pointer items-center justify-center gap-2 text-base disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          disabled={isLoading}
          type="submit"
        >
          <Mail aria-hidden="true" size={18} />
          {isLoading ? "กำลังส่งลิงก์..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
        </button>
      </form>

      <p className="text-center text-sm font-bold text-slate-400">
        จำรหัสผ่านได้แล้ว?{" "}
        <Link className="font-black text-indigo-600 hover:text-indigo-800 transition-colors hover:underline" href="/auth/login">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
