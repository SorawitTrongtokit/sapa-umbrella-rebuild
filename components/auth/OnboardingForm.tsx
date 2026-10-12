"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { getAuthClient } from "@/lib/auth-client";
import { Notice } from "@/components/ui/Notice";

type OnboardingFormProps = {
  defaultName: string;
};

export function OnboardingForm({ defaultName }: OnboardingFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaultName);
  const [classLevel, setClassLevel] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const response = await fetch("/api/profile/onboard-google", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName, classLevel, studentNumber, password })
    });
    const payload = (await response.json()) as { ok: boolean; data?: { email: string }; error?: string };

    if (!payload.ok) {
      setIsLoading(false);
      setMessage(payload.error ?? "บันทึกข้อมูลไม่สำเร็จ");
      return;
    }

    if (payload.data?.email) {
      const authClient = getAuthClient();
      const { error } = await authClient.signIn.email({
        email: payload.data.email,
        password
      });

      if (error) {
        setIsLoading(false);
        setMessage(error.message ?? "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
    }

    setIsLoading(false);
    router.replace("/dashboard");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="label">
        ชื่อที่แสดง
        <input
          className="field"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={120}
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
        ตั้งรหัสผ่านสำหรับระบบนี้
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="ตั้งรหัสผ่านใหม่"
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
        <Save aria-hidden="true" size={18} />
        {isLoading ? "กำลังบันทึก..." : "เริ่มใช้งาน"}
      </button>
    </form>
  );
}
