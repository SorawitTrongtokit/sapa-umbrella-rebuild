import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("onboarding_completed, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) redirect("/dashboard");

  return (
    <AuthCard
      title="กรอกข้อมูลครั้งแรก"
      subtitle="บัญชี Google ต้องกรอกชั้น เลขที่ และตั้งรหัสผ่านก่อนเริ่มใช้งาน"
      footerHref="/auth/login"
      footerLabel="กลับไปเข้าสู่ระบบ"
      footerText="ต้องการเปลี่ยนบัญชี?"
    >
      <OnboardingForm defaultName={profile?.display_name ?? user.user_metadata?.name ?? ""} />
    </AuthCard>
  );
}
