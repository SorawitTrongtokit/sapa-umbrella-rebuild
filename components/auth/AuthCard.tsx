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
    <main className="animate-page flex min-h-dvh items-center justify-center overflow-hidden bg-sky-50 px-4 py-8">
      <section className="min-w-0 w-full max-w-lg">
        <div className="animate-rise mb-8 text-center">
          <div className="brand-orb mx-auto flex size-24 items-center justify-center rounded-[32px] bg-blue-600 text-white shadow-2xl shadow-blue-200">
            <Umbrella aria-hidden="true" size={48} />
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-normal text-blue-950 sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-2 max-w-[18rem] text-[10px] font-bold uppercase tracking-[0.14em] text-blue-500 sm:max-w-none sm:text-xs sm:tracking-[0.2em]">
            Umbrella Borrowing System • PCSHSPL
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-6 text-slate-500">{subtitle}</p>
        </div>

        <div className="animate-rise relative overflow-hidden rounded-[40px] border-4 border-white bg-white p-6 shadow-2xl shadow-blue-900/10 sm:rounded-[48px] sm:p-10">
          <div className="absolute right-0 top-0 size-32 rounded-full bg-sky-50 blur-3xl" />
          <div className="relative z-10">
            {children}
          </div>
        </div>

        <p className="mt-8 text-center text-sm font-bold text-slate-400">
          {footerText}{" "}
          <Link className="font-black text-blue-600 hover:underline" href={footerHref}>
            {footerLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
