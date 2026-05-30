import Link from "next/link";
import type { Route } from "next";
import { BarChart3, LayoutDashboard, MessageSquare, Shield, Umbrella, User, UserCog, type LucideIcon } from "lucide-react";
import type { AppRole, Profile } from "@/lib/types";
import { SignOutButton } from "@/components/SignOutButton";

type AppShellProps = {
  profile: Profile;
  active: "dashboard" | "admin" | "owner" | "analytics";
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const navItems: Array<{
  href: Route;
  key: "dashboard" | "admin" | "owner" | "analytics";
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
}> = [
  { href: "/dashboard", key: "dashboard", label: "ร่มทั้งหมด", icon: LayoutDashboard, roles: ["user", "admin", "owner"] },
  { href: "/admin", key: "admin", label: "ผู้ดูแล", icon: Shield, roles: ["admin", "owner"] },
  { href: "/owner/analytics" as Route, key: "analytics", label: "ข้อมูลสถิติ", icon: BarChart3, roles: ["admin", "owner"] },
  { href: "/owner", key: "owner", label: "Owner", icon: UserCog, roles: ["owner"] }
];

export function AppShell({ profile, active, title, subtitle, children }: AppShellProps) {
  const visibleItems = navItems.filter((item) => item.roles.includes(profile.role));
  const initials = (profile.display_name || profile.email || "PC").slice(0, 2).toUpperCase();

  // Role display logic with color schemes
  const roleColors: Record<AppRole, string> = {
    owner: "border-amber-200 bg-amber-500/10 text-amber-800 shadow-sm shadow-amber-500/5",
    admin: "border-purple-200 bg-purple-500/10 text-purple-800 shadow-sm shadow-purple-500/5",
    user: "border-indigo-200 bg-indigo-500/10 text-indigo-800 shadow-sm shadow-indigo-500/5"
  };

  const roleLabels: Record<AppRole, string> = {
    owner: "เจ้าของระบบ (Owner)",
    admin: "ผู้ดูแล (Admin)",
    user: "ผู้ใช้ทั่วไป (User)"
  };

  return (
    <div className="animate-page min-h-dvh font-sans soft-grid-bg pb-12">
      {/* Background Orbs */}
      <div className="absolute rounded-full blur-[120px] opacity-35 pointer-events-none -z-10 w-[20rem] h-[20rem] bg-indigo-200 -top-10 -left-10" />
      <div className="absolute rounded-full blur-[120px] opacity-30 pointer-events-none -z-10 w-[20rem] h-[20rem] bg-purple-200 top-1/3 -right-10" />

      {/* Floating Glass Header */}
      <header className="animate-down sticky top-0 z-50 border-b border-white/50 bg-white/55 backdrop-blur-lg shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="mx-auto flex max-w-[92rem] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          
          {/* Logo & Main Title */}
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl premium-gradient-1 text-white shadow-md shadow-indigo-500/20">
              <Umbrella aria-hidden="true" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">PCSHSPL Umbrella System</p>
            </div>
          </div>

          {/* User Profile Info & Sign Out Button */}
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="text-right sm:block">
              <p className="max-w-[180px] sm:max-w-[240px] truncate text-xs sm:text-sm font-bold text-slate-800 underline decoration-indigo-300 decoration-2 underline-offset-4">
                {profile.display_name || profile.email}
              </p>
              <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                {profile.class_level ?? "PCSHSPL"} {profile.student_number ? `เลขที่ ${profile.student_number}` : ""} • {profile.role}
              </p>
            </div>
            
            <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/40 p-1.5 text-xs text-slate-700 shadow-sm backdrop-blur-md">
              <div className="flex size-8 items-center justify-center rounded-xl premium-gradient-2 font-black text-white shadow-sm shadow-rose-200">
                {initials}
              </div>
              <span className={`hidden sm:inline-block rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${roleColors[profile.role]}`}>
                {roleLabels[profile.role]}
              </span>
            </div>
            
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
        
        {/* Navigation Sidebar (Horizontal scrolling on mobile, vertical grid on desktop) */}
        <aside className="glass-card animate-rise h-fit rounded-3xl p-2.5 lg:sticky lg:top-24">
          <nav className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none lg:grid lg:overflow-visible lg:pb-0">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <Link
                  className={`focus-ring flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "premium-gradient-1 text-white shadow-md shadow-indigo-500/20"
                      : "text-slate-500 hover:bg-indigo-50/50 hover:text-indigo-700"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden={true} size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Quick Navigation Links visible only on Desktop */}
            <div className="mt-2.5 hidden border-t border-slate-200/50 pt-2.5 lg:block">
              <Link
                className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-400 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors"
                href={"/dashboard#feedback" as Route}
              >
                <MessageSquare aria-hidden={true} size={18} />
                <span>คำติชม</span>
              </Link>
              <Link
                className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-400 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors"
                href={"/dashboard#profile" as Route}
              >
                <User aria-hidden={true} size={18} />
                <span>โปรไฟล์</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Content Wrapper */}
        <main className="animate-rise min-w-0 space-y-5">
          {/* Frosted Subtitle Banner */}
          <div className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md px-5 py-3.5 shadow-[0_4px_20px_rgba(99,102,241,0.02)]">
            <p className="text-xs sm:text-sm font-bold leading-relaxed text-slate-600">{subtitle}</p>
          </div>
          
          <div className="min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
