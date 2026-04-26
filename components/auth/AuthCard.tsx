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
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700">
            <Umbrella aria-hidden="true" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700">PCSHSPL</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
        </div>

        {children}

        <p className="mt-6 text-center text-sm text-slate-600">
          {footerText}{" "}
          <Link className="font-medium text-blue-700 hover:text-blue-800" href={footerHref}>
            {footerLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
