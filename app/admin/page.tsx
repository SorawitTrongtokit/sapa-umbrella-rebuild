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
  const [profile] = await sql<Profile[]>`
    select * from public.profiles where id = ${user.id}
  `;

  if (!profile?.onboarding_completed) redirect("/onboarding");
  if (profile.status !== "active") redirect("/dashboard");
  if (profile.role !== "admin" && profile.role !== "owner") redirect("/dashboard");

  const [pageData] = await sql<{
    locations: Location[];
    umbrellas: Umbrella[];
    recent_transactions: BorrowTransaction[];
    users: Profile[];
  }[]>`
    select
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
      coalesce((
        select jsonb_agg(p order by p.class_level, p.student_number, p.email)
        from (
          select *
          from public.profiles
          order by class_level, student_number, email
          limit 200
        ) p
      ), '[]'::jsonb) as users
  `;

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
