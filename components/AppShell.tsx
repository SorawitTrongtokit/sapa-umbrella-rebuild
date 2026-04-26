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
    <div className="min-h-dvh soft-grid-bg">
      <header className="border-b border-white/70 bg-white/82 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Umbrella aria-hidden="true" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-indigo-700">PCSHSPL ระบบยืมคืนร่ม</p>
              <h1 className="truncate text-xl font-semibold tracking-normal text-slate-950 sm:text-2xl">{title}</h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-[8px] border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-sm text-slate-700 sm:justify-start">
              <span className="min-w-0 truncate font-medium">{profile.display_name || profile.email}</span>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-normal text-indigo-700">
                {profile.role}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[228px_minmax(0,1fr)] lg:gap-6 lg:px-8">
        <aside className="app-surface h-fit rounded-[8px] p-2 lg:sticky lg:top-5">
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <Link
                  className={`focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-[8px] px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
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
          <div className="mb-5 rounded-[8px] border border-white/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
            <p className="text-sm leading-6 text-slate-600 sm:text-base">{subtitle}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
