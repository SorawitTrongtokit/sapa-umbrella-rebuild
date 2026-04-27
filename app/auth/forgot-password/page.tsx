import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ForgotPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <AuthCard
      title="ลืมรหัสผ่าน"
      subtitle="กรอกอีเมลที่ใช้สมัคร แล้วระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้"
      footerHref="/auth/login"
      footerLabel="เข้าสู่ระบบ"
      footerText="กลับไปหน้า"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
