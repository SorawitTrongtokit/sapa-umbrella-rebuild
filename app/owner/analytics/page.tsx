import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AnalyticsDashboard } from "@/components/owner/AnalyticsDashboard";
import { getAuthIdentity } from "@/lib/auth";
import { getSql } from "@/lib/db";
import type { Profile } from "@/lib/types";

export default async function AnalyticsPage() {
  const user = await getAuthIdentity();

  if (!user) redirect("/auth/login");

  const sql = getSql();
  const [profile] = await sql<Profile[]>`
    select * from public.profiles where id = ${user.id}
  `;

  if (!profile?.onboarding_completed) redirect("/onboarding");
  if (profile.status !== "active") redirect("/dashboard");
  if (profile.role !== "owner" && profile.role !== "admin") redirect("/dashboard");

  const [statsRows, locationStats, dailyStats] = await Promise.all([
    sql<{
      total_borrows: number;
      active_borrows: number;
      total_users: number;
      total_umbrellas: number;
    }[]>`
      select
        (select count(*) from public.borrow_transactions) as total_borrows,
        (select count(*) from public.borrow_transactions where status = 'active') as active_borrows,
        (select count(*) from public.profiles) as total_users,
        (select count(*) from public.umbrellas) as total_umbrellas
    `,
    sql<{
      location_id: string;
      name_th: string;
      count: number;
    }[]>`
      select
        l.id as location_id,
        l.name_th,
        count(bt.id) as count
      from public.locations l
      left join public.borrow_transactions bt on bt.borrow_location_id = l.id
      group by l.id, l.name_th
      order by count desc
    `,
    sql<{
      date: string;
      count: number;
    }[]>`
      select
        to_char(date_trunc('day', borrowed_at), 'YYYY-MM-DD') as date,
        count(*) as count
      from public.borrow_transactions
      where borrowed_at > now() - interval '7 days'
      group by date
      order by date asc
    `
  ]);

  const [stats] = statsRows;

  return (
    <AppShell
      active="analytics"
      profile={profile}
      title="Analytics Dashboard"
      subtitle="ข้อมูลสถิติการใช้งานระบบยืมคืนร่ม ยอดการใช้งาน และแนวโน้มในช่วง 7 วันที่ผ่านมา"
    >
      <AnalyticsDashboard 
        stats={stats}
        locationStats={locationStats}
        dailyStats={dailyStats}
      />
    </AppShell>
  );
}
