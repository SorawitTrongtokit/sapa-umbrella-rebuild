import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getAuthIdentity } from "@/lib/auth";
import { getSql } from "@/lib/db";
import type { BorrowTransaction, Location, Profile, Umbrella } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getAuthIdentity();

  if (!user) redirect("/auth/login");

  const sql = getSql();
  const [pageData] = await sql<{
    profile: Profile | null;
    locations: Location[];
    umbrellas: Umbrella[];
    active_borrows: BorrowTransaction[];
  }[]>`
    select
      (select to_jsonb(p) from public.profiles p where p.id = ${user.id}) as profile,
      coalesce((select jsonb_agg(l order by l.sort_order) from public.locations l), '[]'::jsonb) as locations,
      coalesce((select jsonb_agg(u order by u.id) from public.umbrellas u), '[]'::jsonb) as umbrellas,
      coalesce((
        select jsonb_agg(bt order by bt.borrowed_at desc)
        from public.borrow_transactions bt
        where bt.borrower_id = ${user.id}
          and bt.status = 'active'
      ), '[]'::jsonb) as active_borrows
  `;

  const profile = pageData.profile;
  if (!profile || !profile.onboarding_completed) redirect("/onboarding");

  if (profile.status !== "active") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-10">
        <section className="card w-full max-w-md animate-rise p-8 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-danger-soft text-danger">
            <CircleAlert aria-hidden="true" size={30} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">บัญชีถูกระงับ</h1>
          <p className="mt-2 text-[0.9375rem] text-muted">กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานบัญชีอีกครั้ง</p>
        </section>
      </main>
    );
  }

  return (
    <AppShell
      active="dashboard"
      profile={profile}
      title="สถานะร่มทั้งหมด"
      subtitle="เลือกหมายเลขร่มเพื่อยืม และกดที่ร่มของตัวเองเพื่อคืนที่จุดเดิม"
    >
      <DashboardClient
        activeBorrows={pageData.active_borrows}
        initialUmbrellas={pageData.umbrellas}
        locations={pageData.locations}
        profile={profile}
      />
    </AppShell>
  );
}
