import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getAuthIdentity } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getAuthIdentity();

  if (user) redirect("/dashboard");

  return (
    <AuthCard
      title="สมัครบัญชี"
      subtitle="กรอกข้อมูลนักเรียนเพื่อใช้งานระบบยืมคืนร่ม PCSHSPL"
      footerHref="/auth/login"
      footerLabel="เข้าสู่ระบบ"
      footerText="มีบัญชีแล้ว?"
    >
      <RegisterForm />
    </AuthCard>
  );
}
