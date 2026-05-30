"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(searchParams.get("message") ?? "");
  const [isLoading, setIsLoading] = useState(false);

  async function handleEmailLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const legacyResponse = await fetch("/api/auth/legacy-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const legacyPayload = (await legacyResponse.json()) as { ok: boolean; error?: string };
      setIsLoading(false);

      if (!legacyPayload.ok) {
        setMessage(legacyPayload.error ?? "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }
    } else {
      setIsLoading(false);
    }

    router.replace("/dashboard");
  }

  async function handleGoogleLogin() {
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }

  return (
    <div className="space-y-6">
      <form className="space-y-5" onSubmit={handleEmailLogin}>
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
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
          รหัสผ่าน
          <input
            className="focus-ring field-control mt-2 w-full px-4 py-3 text-slate-900 placeholder:text-slate-400"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
        </label>
        
        <div className="text-right">
          <Link className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors hover:underline" href={"/auth/forgot-password" as Route}>
            ลืมรหัสผ่าน?
          </Link>
        </div>

        {message ? (
          <p
            className={`rounded-2xl border px-4 py-3.5 text-xs font-bold transition-all animate-pop ${
              message.includes("สำเร็จ") || message.includes("เรียบร้อย")
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm"
                : "border-rose-200 bg-rose-50/80 text-rose-800 shadow-sm"
            }`}
            role="alert"
          >
            {message}
          </p>
        ) : null}

        <button
          className="btn-primary focus-ring flex w-full cursor-pointer items-center justify-center gap-2 text-base disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          disabled={isLoading}
          type="submit"
        >
          <LogIn aria-hidden="true" size={18} />
          {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        หรือ
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        className="focus-ring group relative flex min-h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-100 hover:bg-indigo-50/20 hover:text-indigo-900 active:translate-y-0"
        type="button"
        onClick={handleGoogleLogin}
      >
        <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-400 to-pink-400 opacity-80" />
        <span className="mr-3 flex size-8 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm transition-transform group-hover:scale-105">
          <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            />
          </svg>
        </span>
        <span>เข้าสู่ระบบด้วย Google</span>
      </button>
    </div>
  );
}
