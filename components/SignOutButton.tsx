"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getAuthClient } from "@/lib/auth-client";

export function SignOutButton({ className }: { className: string }) {
  const router = useRouter();

  async function signOut() {
    const authClient = getAuthClient();
    await authClient.signOut();
    router.replace("/auth/login");
  }

  return (
    <button className={className} type="button" onClick={signOut}>
      <LogOut aria-hidden="true" size={16} />
      ออกจากระบบ
    </button>
  );
}
