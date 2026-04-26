import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import type { BorrowTransaction, Location, Profile, Umbrella } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const service = createSupabaseServiceClient();
  const [profileResult, locationResult, umbrellaResult, borrowResult] = await Promise.all([
    service.from("profiles").select("*").eq("id", user.id).single(),
    service.from("locations").select("*").order("sort_order", { ascending: true }),
    service.from("umbrellas").select("*").order("id", { ascending: true }),
    service
      .from("borrow_transactions")
      .select("*")
      .eq("borrower_id", user.id)
      .eq("status", "active")
      .order("borrowed_at", { ascending: false })
  ]);

  const profile = profileResult.data as Profile | null;
  if (!profile || !profile.onboarding_completed) redirect("/onboarding");

  if (profile.status !== "active") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <section className="max-w-md rounded-[8px] border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-950">บัญชีถูกระงับ</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานบัญชีอีกครั้ง</p>
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
        activeBorrows={(borrowResult.data ?? []) as BorrowTransaction[]}
        initialUmbrellas={(umbrellaResult.data ?? []) as Umbrella[]}
        locations={(locationResult.data ?? []) as Location[]}
        profile={profile}
      />
    </AppShell>
  );
}
