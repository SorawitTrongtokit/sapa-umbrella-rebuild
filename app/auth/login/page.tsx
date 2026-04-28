import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { getAuthIdentity } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getAuthIdentity();

  if (user) redirect("/dashboard");

  return (
    <AuthCard
      title="เข้าสู่ระบบ"
      subtitle="ยืมและคืนร่มได้ทันที พร้อมดูสถานะทุกจุดแบบเรียลไทม์"
      footerHref="/auth/register"
      footerLabel="สมัครบัญชี"
      footerText="ยังไม่มีบัญชี?"
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
