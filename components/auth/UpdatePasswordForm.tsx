"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Notice } from "@/components/ui/Notice";

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
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="label">
        รหัสผ่านใหม่
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="อย่างน้อย 6 ตัวอักษร"
          required
        />
      </label>
      <label className="label">
        ยืนยันรหัสผ่านใหม่
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="ยืนยันรหัสผ่านอีกครั้ง"
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
        <KeyRound aria-hidden="true" size={18} />
        {isLoading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
      </button>
    </form>
  );
}
