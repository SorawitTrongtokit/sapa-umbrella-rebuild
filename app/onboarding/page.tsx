import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getAuthIdentity } from "@/lib/auth";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getAuthIdentity();

  if (!user) redirect("/auth/login");

  const sql = getSql();
  const [profile] = await sql<{ onboarding_completed: boolean; display_name: string | null }[]>`
    select onboarding_completed, display_name
    from public.profiles
    where id = ${user.id}
  `;

  if (profile?.onboarding_completed) redirect("/dashboard");

  return (
    <AuthCard
      title="กรอกข้อมูลครั้งแรก"
      subtitle="บัญชี Google ต้องกรอกชั้น เลขที่ และตั้งรหัสผ่านก่อนเริ่มใช้งาน"
      footerHref="/auth/login"
      footerLabel="กลับไปเข้าสู่ระบบ"
      footerText="ต้องการเปลี่ยนบัญชี?"
    >
      <OnboardingForm defaultName={profile?.display_name ?? ""} />
    </AuthCard>
  );
}
