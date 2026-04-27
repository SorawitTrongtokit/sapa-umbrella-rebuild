import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
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
      <main className="flex min-h-dvh items-center justify-center overflow-hidden bg-sky-50 px-4 py-8">
        <section className="w-full max-w-md rounded-[40px] border-4 border-white bg-white p-8 text-center shadow-2xl shadow-blue-900/10">
          <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-[28px] bg-rose-100 text-rose-600">
            <CircleAlert aria-hidden="true" size={38} />
          </div>
          <h1 className="text-2xl font-black tracking-normal text-blue-950">บัญชีถูกระงับ</h1>
          <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-800">
            กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานบัญชีอีกครั้ง
          </p>
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
