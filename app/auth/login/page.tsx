import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

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
