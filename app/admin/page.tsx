import { redirect } from "next/navigation";
import { AdminClient } from "@/components/admin/AdminClient";
import { AppShell } from "@/components/AppShell";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import type { BorrowTransaction, Location, Profile, Umbrella } from "@/lib/types";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const service = createSupabaseServiceClient();
  const profileResult = await service.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile?.onboarding_completed) redirect("/onboarding");
  if (profile.role !== "admin" && profile.role !== "owner") redirect("/dashboard");

  const [locationResult, umbrellaResult, txResult, usersResult] = await Promise.all([
    service.from("locations").select("*").order("sort_order", { ascending: true }),
    service.from("umbrellas").select("*").order("id", { ascending: true }),
    service.from("borrow_transactions").select("*").order("borrowed_at", { ascending: false }).limit(40),
    service.from("profiles").select("*").order("class_level", { ascending: true })
  ]);

  return (
    <AppShell
      active="admin"
      profile={profile}
      title="จัดการร่ม"
      subtitle="เปิด ปิด หรือ override สถานะร่ม พร้อมบันทึก audit log ทุกครั้ง"
    >
      <AdminClient
        initialUmbrellas={(umbrellaResult.data ?? []) as Umbrella[]}
        locations={(locationResult.data ?? []) as Location[]}
        recentTransactions={(txResult.data ?? []) as BorrowTransaction[]}
        users={(usersResult.data ?? []) as Profile[]}
      />
    </AppShell>
  );
}
