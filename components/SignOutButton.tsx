"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  return (
    <button
      className="focus-ring flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-rose-200/50 bg-white/40 px-3.5 py-2 text-xs sm:text-sm font-bold text-rose-600 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500/10 hover:text-rose-700 hover:shadow-md hover:shadow-rose-100 active:translate-y-0 active:scale-95"
      type="button"
      onClick={signOut}
    >
      <LogOut aria-hidden="true" size={15} />
      <span className="hidden xs:inline">ออกจากระบบ</span>
    </button>
  );
}
