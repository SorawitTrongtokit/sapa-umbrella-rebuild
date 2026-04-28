import { redirect } from "next/navigation";
import { AdminClient } from "@/components/admin/AdminClient";
import { AppShell } from "@/components/AppShell";
import { getAuthIdentity } from "@/lib/auth";
import { getSql } from "@/lib/db";
import type { BorrowTransaction, Location, Profile, Umbrella } from "@/lib/types";

export default async function AdminPage() {
  const user = await getAuthIdentity();

  if (!user) redirect("/auth/login");

  const sql = getSql();
  const [pageData] = await sql<{
    profile: Profile | null;
    locations: Location[];
    umbrellas: Umbrella[];
    recent_transactions: BorrowTransaction[];
    users: Profile[];
  }[]>`
    select
      (select to_jsonb(p) from public.profiles p where p.id = ${user.id}) as profile,
      coalesce((select jsonb_agg(l order by l.sort_order) from public.locations l), '[]'::jsonb) as locations,
      coalesce((select jsonb_agg(u order by u.id) from public.umbrellas u), '[]'::jsonb) as umbrellas,
      coalesce((
        select jsonb_agg(t order by t.borrowed_at desc)
        from (
          select *
          from public.borrow_transactions
          order by borrowed_at desc
          limit 40
        ) t
      ), '[]'::jsonb) as recent_transactions,
      coalesce((select jsonb_agg(p order by p.class_level, p.student_number, p.email) from public.profiles p), '[]'::jsonb) as users
  `;

  const profile = pageData.profile;
  if (!profile?.onboarding_completed) redirect("/onboarding");
  if (profile.role !== "admin" && profile.role !== "owner") redirect("/dashboard");

  return (
    <AppShell
      active="admin"
      profile={profile}
      title="จัดการร่ม"
      subtitle="เปิด ปิด หรือ override สถานะร่ม พร้อมบันทึก audit log ทุกครั้ง"
    >
      <AdminClient
        initialUmbrellas={pageData.umbrellas}
        locations={pageData.locations}
        recentTransactions={pageData.recent_transactions}
        users={pageData.users}
      />
    </AppShell>
  );
}
