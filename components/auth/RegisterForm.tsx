"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getAuthClient } from "@/lib/auth-client";
import { Notice } from "@/components/ui/Notice";

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

    const authClient = getAuthClient();
    const { error } = await authClient.signIn.email({ email, password });
    setIsLoading(false);

    if (error) {
      router.replace("/auth/login?message=สมัครสำเร็จ กรุณาเข้าสู่ระบบ");
      return;
    }

    router.replace("/dashboard");
  }

  return (
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

      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          ชั้น
          <input
            className="field"
            value={classLevel}
            onChange={(event) => setClassLevel(event.target.value)}
            placeholder="ม.5/1"
            required
          />
        </label>
        <label className="label">
          เลขที่
          <input
            className="field"
            inputMode="numeric"
            value={studentNumber}
            onChange={(event) => setStudentNumber(event.target.value)}
            placeholder="1"
            required
          />
        </label>
      </div>

      <label className="label">
        รหัสผ่าน
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
          required
        />
      </label>

      {message ? (
        <Notice tone="error">{message}</Notice>
      ) : null}

      <button
        className="btn btn-primary w-full"
        disabled={isLoading}
        type="submit"
      >
        <UserPlus aria-hidden="true" size={18} />
        {isLoading ? "กำลังสมัครบัญชี..." : "สมัครบัญชี"}
      </button>
    </form>
  );
}
