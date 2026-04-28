import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { getAuthIdentity } from "@/lib/auth";

export default async function UpdatePasswordPage() {
  const user = await getAuthIdentity();

  if (!user) redirect("/auth/login?message=กรุณาเปิดลิงก์ตั้งรหัสผ่านใหม่จากอีเมลอีกครั้ง");

  return (
    <AuthCard
      title="ตั้งรหัสผ่านใหม่"
      subtitle="รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรกับตัวเลข"
      footerHref="/auth/login"
      footerLabel="เข้าสู่ระบบ"
      footerText="กลับไปหน้า"
    >
      <UpdatePasswordForm />
    </AuthCard>
  );
}
