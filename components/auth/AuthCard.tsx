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
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-md">
        <div className="animate-rise text-center">
          <div className="mx-auto flex size-16 animate-float items-center justify-center rounded-3xl bg-accent text-white shadow-lift">
            <Umbrella aria-hidden="true" size={32} />
          </div>
          <p className="mt-5 text-sm font-medium text-muted">ระบบยืมคืนร่ม PCSHSPL</p>
          <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight text-ink">{title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] text-muted">{subtitle}</p>
        </div>

        <div className="card mt-7 animate-rise p-6 [animation-delay:80ms] sm:p-8">{children}</div>

        <p className="mt-6 animate-fade text-center text-sm text-muted [animation-delay:200ms]">
          {footerText}{" "}
          <Link className="font-semibold text-accent-strong hover:underline" href={footerHref}>
            {footerLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
