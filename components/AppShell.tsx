import Link from "next/link";
import type { Route } from "next";
import { LayoutDashboard, MessageSquare, Shield, Umbrella, User, UserCog, type LucideIcon } from "lucide-react";
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
  { href: "/dashboard", key: "dashboard", label: "ร่มทั้งหมด", icon: LayoutDashboard, roles: ["user", "admin", "owner"] },
  { href: "/admin", key: "admin", label: "ผู้ดูแล", icon: Shield, roles: ["admin", "owner"] },
  { href: "/owner", key: "owner", label: "Owner", icon: UserCog, roles: ["owner"] }
];

export function AppShell({ profile, active, title, subtitle, children }: AppShellProps) {
  const visibleItems = navItems.filter((item) => item.roles.includes(profile.role));
  const initials = (profile.display_name || profile.email || "PC").slice(0, 2).toUpperCase();

  return (
    <div className="animate-page min-h-dvh bg-sky-50 font-sans">
      <header className="animate-down border-b border-sky-100 bg-white shadow-sm">
        <div className="mx-auto flex min-h-20 max-w-[92rem] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Umbrella aria-hidden="true" size={28} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold tracking-normal text-blue-950 sm:text-2xl">{title}</h1>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-500">PCSHSPL Umbrella System</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="hidden text-right md:block">
              <p className="max-w-72 truncate text-sm font-bold text-slate-700 underline decoration-sky-300 underline-offset-4">
                {profile.display_name || profile.email}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {profile.class_level ?? "PCSHSPL"} {profile.student_number ? `เลขที่ ${profile.student_number}` : ""} • {profile.role}
              </p>
            </div>
            <div className="flex min-h-12 items-center justify-between gap-3 rounded-full border-2 border-white bg-orange-100 px-4 py-2 text-sm text-orange-700 shadow-md sm:justify-start">
              <span className="font-black">{initials}</span>
              <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-black uppercase tracking-normal text-blue-700">
                {profile.role}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <aside className="glass-card animate-rise h-fit rounded-[32px] p-3 lg:sticky lg:top-6">
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <Link
                  className={`focus-ring flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                      : "text-slate-600 hover:bg-sky-50 hover:text-blue-800"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden={true} size={18} />
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 hidden border-t border-sky-50 pt-2 lg:block">
              <button className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-400" type="button">
                <MessageSquare aria-hidden={true} size={18} />
                คำติชม
              </button>
              <button className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-400" type="button">
                <User aria-hidden={true} size={18} />
                โปรไฟล์
              </button>
            </div>
          </nav>
        </aside>

        <main className="animate-rise min-w-0">
          <div className="mb-6 rounded-[24px] border border-sky-100 bg-white/70 px-5 py-4 shadow-sm">
            <p className="text-sm font-medium leading-6 text-slate-500 sm:text-base">{subtitle}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
