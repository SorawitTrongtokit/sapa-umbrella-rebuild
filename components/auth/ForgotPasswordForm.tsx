"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { getAuthClient } from "@/lib/auth-client";
import { Notice, type NoticeTone } from "@/components/ui/Notice";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ tone: NoticeTone; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const authClient = getAuthClient();
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/auth/update-password`
    });

    setIsLoading(false);

    if (error) {
      setMessage({ tone: "error", text: "ส่งลิงก์รีเซ็ตรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
      return;
    }

    setMessage({ tone: "success", text: "ถ้าอีเมลนี้มีอยู่ในระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้" });
  }

  return (
    <div>
      <form className="space-y-4" onSubmit={handleSubmit}>
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

        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

        <button
          className="btn btn-primary w-full"
          disabled={isLoading}
          type="submit"
        >
          <Mail aria-hidden="true" size={18} />
          {isLoading ? "กำลังส่งลิงก์..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
        </button>
      </form>

    </div>
  );
}
