"use client";

import type { LucideIcon } from "lucide-react";

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: LucideIcon }>;
};

export function Segmented<T extends string>({ label, value, onChange, options }: SegmentedProps<T>) {
  return (
    <div aria-label={label} className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-sunken p-1" role="tablist">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === value;
        return (
          <button
            aria-selected={isActive}
            className={`flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition duration-200 ${
              isActive ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink"
            }`}
            key={option.value}
            role="tab"
            type="button"
            onClick={() => onChange(option.value)}
          >
            {Icon ? <Icon aria-hidden="true" size={16} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
