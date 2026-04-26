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
    router.refresh();
  }

  return (
    <button
      className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      type="button"
      onClick={signOut}
    >
      <LogOut aria-hidden="true" size={16} />
      ออกจากระบบ
    </button>
  );
}
