import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { OwnerClient } from "@/components/owner/OwnerClient";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import type { AuditLog, Feedback, Profile } from "@/lib/types";

export default async function OwnerPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const service = createSupabaseServiceClient();
  const profileResult = await service.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile?.onboarding_completed) redirect("/onboarding");
  if (profile.role !== "owner") redirect("/dashboard");

  const [usersResult, feedbackResult, auditResult] = await Promise.all([
    service.from("profiles").select("*").order("created_at", { ascending: false }),
    service.from("feedback").select("*").order("created_at", { ascending: false }).limit(100),
    service.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(150)
  ]);

  return (
    <AppShell
      active="owner"
      profile={profile}
      title="Owner Console"
      subtitle="จัดการผู้ใช้ทั้งหมด ดูรหัสผ่านแบบมี audit log และตรวจสอบคำติชม"
    >
      <OwnerClient
        auditLogs={(auditResult.data ?? []) as AuditLog[]}
        feedback={(feedbackResult.data ?? []) as Feedback[]}
        users={(usersResult.data ?? []) as Profile[]}
      />
    </AppShell>
  );
}
