import Link from "next/link";
import type { Route } from "next";
import { Shield, Umbrella, UserCog, type LucideIcon } from "lucide-react";
import type { AppRole, Profile } from "@/lib/types";
import { SignOutButton } from "@/components/SignOutButton";

type AppShellProps = {
  profile: Profile;
  active: "dashboard" | "admin" | "owner";
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const navItems: Array<{
  href: Route;
  key: "dashboard" | "admin" | "owner";
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
}> = [
  { href: "/dashboard", key: "dashboard", label: "ร่มทั้งหมด", icon: Umbrella, roles: ["user", "admin", "owner"] },
  { href: "/admin", key: "admin", label: "ผู้ดูแล", icon: Shield, roles: ["admin", "owner"] },
  { href: "/owner", key: "owner", label: "Owner", icon: UserCog, roles: ["owner"] }
];

export function AppShell({ profile, active, title, subtitle, children }: AppShellProps) {
  const visibleItems = navItems.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-blue-700 text-white">
              <Umbrella aria-hidden="true" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">PCSHSPL ระบบยืมคืนร่ม</p>
              <h1 className="text-xl font-semibold tracking-normal text-slate-950">{title}</h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {profile.display_name || profile.email}
              <span className="mx-2 text-slate-300">|</span>
              {profile.role}
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <aside className="h-fit rounded-[8px] border border-slate-200 bg-white p-2 shadow-sm">
          <nav className="grid gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <Link
                  className={`focus-ring flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden={true} size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="mb-5">
            <p className="text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
