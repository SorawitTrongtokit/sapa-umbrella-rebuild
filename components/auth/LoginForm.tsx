"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { getAuthClient } from "@/lib/auth-client";
import { Notice, type NoticeTone } from "@/components/ui/Notice";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ tone: NoticeTone; text: string } | null>(() => {
    const initial = searchParams.get("message");
    return initial ? { tone: "info", text: initial } : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  async function handleEmailLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const authClient = getAuthClient();
    const { error } = await authClient.signIn.email({ email, password });

    if (error) {
      const legacyResponse = await fetch("/api/auth/legacy-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const legacyPayload = (await legacyResponse.json()) as { ok: boolean; error?: string };
      setIsLoading(false);

      if (!legacyPayload.ok) {
        setMessage({ tone: "error", text: legacyPayload.error ?? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        return;
      }
    } else {
      setIsLoading(false);
    }

    router.replace("/dashboard");
  }

  async function handleGoogleLogin() {
    setMessage(null);
    const authClient = getAuthClient();
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/auth/callback`
    });
  }

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={handleEmailLogin}>
        <label className="label">
          อีเมล
          <input
            className="field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@email.com"
            required
          />
        </label>
        <div>
          <label className="label">
            รหัสผ่าน
            <input
              className="field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          <div className="mt-2 text-right">
            <Link className="text-sm font-medium text-accent-strong hover:underline" href={"/auth/forgot-password" as Route}>
              ลืมรหัสผ่าน?
            </Link>
          </div>
        </div>

        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

        <button className="btn btn-primary w-full" disabled={isLoading} type="submit">
          <LogIn aria-hidden="true" size={18} />
          {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        หรือ
        <span className="h-px flex-1 bg-line" />
      </div>

      <button className="btn btn-secondary w-full" type="button" onClick={handleGoogleLogin}>
        <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24">
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
        เข้าสู่ระบบด้วย Google
      </button>
    </div>
  );
}
