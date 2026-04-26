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
    <main className="flex min-h-dvh items-center justify-center px-4 py-8 soft-grid-bg">
      <section className="app-surface rounded-[8px] p-4 sm:p-7" style={{ width: "min(calc(100vw - 3rem), 28rem)" }}>
        <div className="mb-7 flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <Umbrella aria-hidden="true" size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-indigo-700">PCSHSPL</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
        </div>

        {children}

        <p className="mt-6 text-center text-sm text-slate-600">
          {footerText}{" "}
          <Link className="font-semibold text-indigo-700 hover:text-indigo-800" href={footerHref}>
            {footerLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
