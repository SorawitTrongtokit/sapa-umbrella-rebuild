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
    <div className="space-y-5">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
          อีเมล
          <input
            className="focus-ring field-control mt-2 min-h-12 w-full rounded-2xl px-4 py-3 text-base text-slate-950 placeholder:text-slate-400"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        {message ? (
          <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900" role="status">
            {message}
          </p>
        ) : null}
        <button
          className="btn-primary focus-ring flex w-full cursor-pointer items-center justify-center gap-2 px-4 py-4 text-lg disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          disabled={isLoading}
          type="submit"
        >
          <Mail aria-hidden="true" size={18} />
          {isLoading ? "กำลังส่งลิงก์" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
        </button>
      </form>

      <p className="text-center text-sm font-bold text-slate-400">
        จำรหัสผ่านได้แล้ว?{" "}
        <Link className="font-black text-blue-600 hover:underline" href="/auth/login">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
