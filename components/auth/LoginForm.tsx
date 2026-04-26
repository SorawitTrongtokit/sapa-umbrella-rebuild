"use client";

import { useState } from "react";
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
    router.refresh();
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
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={handleEmailLogin}>
        <label className="block text-sm font-medium text-slate-700">
          อีเมล
          <input
            className="focus-ring mt-2 w-full rounded-[8px] border border-slate-300 px-3 py-2.5 text-slate-950 placeholder:text-slate-400"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          รหัสผ่าน
          <input
            className="focus-ring mt-2 w-full rounded-[8px] border border-slate-300 px-3 py-2.5 text-slate-950 placeholder:text-slate-400"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {message ? (
          <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {message}
          </p>
        ) : null}
        <button
          className="focus-ring flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-blue-700 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isLoading}
          type="submit"
        >
          <LogIn aria-hidden="true" size={18} />
          {isLoading ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-200" />
        หรือ
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        className="focus-ring w-full cursor-pointer rounded-[8px] border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 transition-colors hover:bg-slate-50"
        type="button"
        onClick={handleGoogleLogin}
      >
        เข้าสู่ระบบด้วย Google
      </button>
    </div>
  );
}
