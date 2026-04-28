import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { OwnerClient } from "@/components/owner/OwnerClient";
import { getAuthIdentity } from "@/lib/auth";
import { getSql } from "@/lib/db";
import type { AuditLog, Feedback, Profile } from "@/lib/types";

export default async function OwnerPage() {
  const user = await getAuthIdentity();

  if (!user) redirect("/auth/login");

  const sql = getSql();
  const [pageData] = await sql<{
    profile: Profile | null;
    users: Profile[];
    feedback: Feedback[];
    audit_logs: AuditLog[];
  }[]>`
    select
      (select to_jsonb(p) from public.profiles p where p.id = ${user.id}) as profile,
      coalesce((select jsonb_agg(p order by p.created_at desc) from public.profiles p), '[]'::jsonb) as users,
      coalesce((
        select jsonb_agg(f order by f.created_at desc)
        from (
          select *
          from public.feedback
          order by created_at desc
          limit 100
        ) f
      ), '[]'::jsonb) as feedback,
      coalesce((
        select jsonb_agg(a order by a.created_at desc)
        from (
          select *
          from public.audit_logs
          order by created_at desc
          limit 150
        ) a
      ), '[]'::jsonb) as audit_logs
  `;

  const profile = pageData.profile;
  if (!profile?.onboarding_completed) redirect("/onboarding");
  if (profile.role !== "owner") redirect("/dashboard");

  return (
    <AppShell
      active="owner"
      profile={profile}
      title="Owner Console"
      subtitle="จัดการผู้ใช้ทั้งหมด ดูรหัสผ่านแบบมี audit log และตรวจสอบคำติชม"
    >
      <OwnerClient
        auditLogs={pageData.audit_logs}
        feedback={pageData.feedback}
        users={pageData.users}
      />
    </AppShell>
  );
}
