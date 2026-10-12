"use client";

import { BarChart, TrendingUp, Umbrella, Users, type LucideIcon } from "lucide-react";

type AnalyticsDashboardProps = {
  stats: {
    total_borrows: number;
    active_borrows: number;
    total_users: number;
    total_umbrellas: number;
  };
  locationStats: {
    location_id: string;
    name_th: string;
    count: number;
  }[];
  dailyStats: {
    date: string;
    count: number;
  }[];
};

export function AnalyticsDashboard({ stats, locationStats, dailyStats }: AnalyticsDashboardProps) {
  const maxDaily = Math.max(...dailyStats.map((d) => Number(d.count)), 1);
  const maxLocation = Math.max(...locationStats.map((l) => Number(l.count)), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Umbrella}
          label="ยืมทั้งหมด"
          value={stats.total_borrows}
          subValue={`กำลังยืม: ${stats.active_borrows} คัน`}
          delay={0}
        />
        <StatCard
          icon={TrendingUp}
          label="อัตราการคืน"
          value={stats.total_borrows > 0 ? Math.round(((stats.total_borrows - stats.active_borrows) / stats.total_borrows) * 100) : 0}
          unit="%"
          subValue="จากรายการยืมทั้งหมด"
          delay={60}
        />
        <StatCard icon={Users} label="ผู้ใช้งาน" value={stats.total_users} subValue="สมาชิกทั้งหมดในระบบ" delay={120} />
        <StatCard icon={BarChart} label="ร่มรวม" value={stats.total_umbrellas} subValue="พร้อมให้บริการทั้งหมด" delay={180} />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Daily trend */}
        <section className="card animate-rise p-5 [animation-delay:220ms] sm:p-6 lg:col-span-8">
          <h2 className="font-semibold text-ink">แนวโน้มการใช้งาน (7 วันล่าสุด)</h2>
          <p className="text-sm text-muted">จำนวนครั้งที่ยืมต่อวัน</p>
          {dailyStats.length === 0 ? (
            <p className="py-16 text-center text-muted">ยังไม่มีการยืมใน 7 วันที่ผ่านมา</p>
          ) : (
            <div className="mt-8 flex h-56 items-stretch gap-2 border-b border-line sm:gap-4">
              {dailyStats.map((day, index) => {
                const height = (Number(day.count) / maxDaily) * 100;
                const dateObj = new Date(day.date);
                return (
                  <div
                    className="group relative flex flex-1 flex-col items-center justify-end outline-none"
                    key={day.date}
                    tabIndex={0}
                    aria-label={`${dateObj.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "short" })} ${day.count} ครั้ง`}
                  >
                    <div
                      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                      style={{ bottom: `calc(max(${height}%, 4px) + 6px)` }}
                    >
                      {dateObj.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} · {day.count} ครั้ง
                    </div>
                    <div
                      className="w-full max-w-8 origin-bottom animate-grow-y rounded-t bg-accent transition-colors duration-150 group-hover:bg-accent-strong group-focus-visible:bg-accent-strong"
                      style={{ height: `${height}%`, minHeight: "4px", animationDelay: `${300 + index * 60}ms` }}
                    />
                    <span className="absolute top-full mt-2 text-xs text-muted">
                      {dateObj.toLocaleDateString("th-TH", { weekday: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {dailyStats.length > 0 ? <div className="h-7" /> : null}
        </section>

        {/* Borrows per location */}
        <section className="card animate-rise p-5 [animation-delay:280ms] sm:p-6 lg:col-span-4">
          <h2 className="font-semibold text-ink">ยอดนิยมรายจุดบริการ</h2>
          <p className="text-sm text-muted">จำนวนครั้งที่ยืมทั้งหมด</p>
          <div className="mt-5 space-y-4">
            {locationStats.map((loc, index) => {
              const percentage = (Number(loc.count) / maxLocation) * 100;
              return (
                <div key={loc.location_id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-ink-soft">{loc.name_th}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-ink">{loc.count} ครั้ง</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full origin-left animate-grow-x rounded-full bg-accent"
                      style={{ width: `${percentage}%`, animationDelay: `${350 + index * 80}ms` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Insights */}
      <section className="card animate-rise p-5 [animation-delay:340ms] sm:p-6">
        <h2 className="font-semibold text-ink">บทวิเคราะห์ระบบ</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-canvas p-4">
            <h3 className="text-sm text-muted">จุดบริการที่หนาแน่นที่สุด</h3>
            <p className="mt-1 text-xl font-bold text-ink">{locationStats[0]?.name_th ?? "-"}</p>
            <p className="mt-1 text-sm text-ink-soft">
              แนะนำเพิ่มจำนวนร่มสำรอง ณ จุดนี้เพื่อลดการรอคอยของผู้ใช้บริการ
            </p>
          </div>
          <div className="rounded-2xl bg-canvas p-4">
            <h3 className="text-sm text-muted">ประสิทธิภาพการหมุนเวียนร่ม</h3>
            <p className="mt-1 text-xl font-bold text-ink">{stats.total_borrows > 0 ? "ยอดเยี่ยม" : "ยังไม่มีข้อมูลการยืม"}</p>
            <p className="mt-1 text-sm text-ink-soft">
              อัตราการคืนอยู่ในเกณฑ์ปกติ ผู้ใช้งานส่วนใหญ่ดูแลและรักษาสภาพร่มได้ดี
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  delay,
  unit = ""
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subValue: string;
  delay: number;
  unit?: string;
}) {
  return (
    <section className="card animate-rise p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
          <Icon aria-hidden="true" size={18} />
        </span>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink sm:text-3xl">
        {value}
        {unit && <span className="ml-0.5 text-lg font-semibold text-muted">{unit}</span>}
      </p>
      <p className="mt-1 truncate text-sm text-muted">{subValue}</p>
    </section>
  );
}
