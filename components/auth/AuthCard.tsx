import Link from "next/link";
import type { Route } from "next";
import { Umbrella } from "lucide-react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  footerHref: Route;
  footerLabel: string;
  footerText: string;
  children: React.ReactNode;
};

export function AuthCard({ title, subtitle, footerHref, footerLabel, footerText, children }: AuthCardProps) {
  return (
    <main className="animate-page relative flex min-h-dvh items-center justify-center overflow-hidden soft-grid-bg px-4 py-8">
      {/* Dynamic Animated Ambient Glow Bubbles */}
      <div className="absolute rounded-full blur-[100px] opacity-45 pointer-events-none -z-10 w-[24rem] h-[24rem] bg-indigo-200 -top-20 -left-20 animate-pulse duration-[6000ms]" />
      <div className="absolute rounded-full blur-[100px] opacity-40 pointer-events-none -z-10 w-[24rem] h-[24rem] bg-purple-200 -bottom-20 -right-20 animate-pulse duration-[8000ms]" />
      <div className="absolute rounded-full blur-[120px] opacity-30 pointer-events-none -z-10 w-[28rem] h-[28rem] bg-cyan-100 top-1/2 left-1/3 -translate-y-1/2" />

      <section className="relative z-10 min-w-0 w-full max-w-lg">
        {/* App Logo & Header Section */}
        <div className="animate-rise mb-6 text-center">
          <div className="brand-orb mx-auto flex size-20 items-center justify-center rounded-[28px] premium-gradient-1 text-white shadow-xl shadow-indigo-500/20">
            <Umbrella aria-hidden="true" size={40} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mx-auto mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 sm:text-xs">
            Umbrella Borrowing System • PCSHSPL
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-relaxed text-slate-500">
            {subtitle}
          </p>
        </div>

        {/* Frosty Glass Card Wrapper */}
        <div className="animate-rise relative overflow-hidden rounded-[32px] border border-white/70 bg-white/55 p-6 shadow-[0_16px_48px_-12px_rgba(99,102,241,0.08)] backdrop-blur-xl sm:rounded-[40px] sm:p-10">
          {/* Inner Light Glow */}
          <div className="absolute -right-10 -top-10 size-32 rounded-full bg-indigo-50/50 blur-2xl" />
          <div className="relative z-10">
            {children}
          </div>
        </div>

        {/* Footer Text */}
        <p className="mt-6 text-center text-sm font-bold text-slate-400">
          {footerText}{" "}
          <Link className="font-black text-indigo-600 hover:text-indigo-800 transition-colors hover:underline" href={footerHref}>
            {footerLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
