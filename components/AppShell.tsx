import Link from "next/link";
import type { Route } from "next";
import { BarChart3, LayoutGrid, MessageSquare, Shield, Umbrella, User, UserCog, type LucideIcon } from "lucide-react";
import { roleLabel } from "@/lib/labels";
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
  { href: "/dashboard", key: "dashboard", label: "ร่มทั้งหมด", icon: LayoutGrid, roles: ["user", "admin", "owner"] },
  { href: "/admin", key: "admin", label: "ผู้ดูแล", icon: Shield, roles: ["admin", "owner"] },
  { href: "/owner/analytics" as Route, key: "analytics", label: "สถิติ", icon: BarChart3, roles: ["admin", "owner"] },
  { href: "/owner", key: "owner", label: "Owner", icon: UserCog, roles: ["owner"] }
];

const quickLinks: Array<{ href: Route; label: string; icon: LucideIcon }> = [
  { href: "/dashboard#profile" as Route, label: "โปรไฟล์", icon: User },
  { href: "/dashboard#feedback" as Route, label: "คำติชม", icon: MessageSquare }
];

export function AppShell({ profile, active, title, subtitle, children }: AppShellProps) {
  const visibleItems = navItems.filter((item) => item.roles.includes(profile.role));
  const displayName = profile.display_name || profile.email;
  const initials = (displayName || "PC").slice(0, 2).toUpperCase();
  const classInfo = [profile.class_level, profile.student_number ? `เลขที่ ${profile.student_number}` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
            <Umbrella aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0">
            <p className="font-bold leading-tight text-ink">ระบบยืมคืนร่ม</p>
            <p className="text-xs text-muted">PCSHSPL</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium transition duration-200 ${
                  isActive ? "bg-accent-soft font-semibold text-accent-strong" : "text-ink-soft hover:bg-canvas hover:text-ink"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" size={19} />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-4 border-t border-line pt-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium text-muted transition duration-200 hover:bg-canvas hover:text-ink"
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" size={19} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="rounded-2xl bg-canvas p-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
              <p className="truncate text-xs text-muted">
                {roleLabel[profile.role]}
                {classInfo ? ` · ${classInfo}` : ""}
              </p>
            </div>
          </div>
          <SignOutButton className="btn btn-secondary btn-sm mt-3 w-full" />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <Umbrella aria-hidden="true" size={19} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-ink">{displayName}</p>
            <p className="truncate text-xs leading-tight text-muted">
              {roleLabel[profile.role]}
              {classInfo ? ` · ${classInfo}` : ""}
            </p>
          </div>
        </div>
        <SignOutButton className="btn btn-ghost btn-sm shrink-0" />
      </header>

      <main className={`mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10 ${visibleItems.length > 1 ? "pb-28" : "pb-10"}`}>
        <div className="mb-6 animate-rise">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
          <p className="mt-1 text-[0.9375rem] text-muted">{subtitle}</p>
        </div>
        {children}
      </main>

      {/* Mobile bottom tab bar (only when there is more than one destination) */}
      {visibleItems.length > 1 ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-200 ${
                  isActive ? "text-accent-strong" : "text-muted"
                }`}
                href={item.href}
                key={item.href}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition duration-300 ease-spring ${
                    isActive ? "bg-accent-soft" : ""
                  }`}
                >
                  <Icon aria-hidden="true" size={20} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
