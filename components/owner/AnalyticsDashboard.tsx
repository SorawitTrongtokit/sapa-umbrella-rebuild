"use client";

import { BarChart, MapPin, TrendingUp, Umbrella, Users } from "lucide-react";

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
    <div className="animate-page space-y-6">
      
      {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Umbrella}
          label="ยืมทั้งหมด"
          value={stats.total_borrows}
          subValue={`กำลังยืม: ${stats.active_borrows} คัน`}
          gradient="premium-gradient-1"
        />
        <StatCard
          icon={TrendingUp}
          label="อัตราการคืน"
          value={stats.total_borrows > 0 ? Math.round(((stats.total_borrows - stats.active_borrows) / stats.total_borrows) * 100) : 0}
          unit="%"
          subValue="จากรายการยืมทั้งหมด"
          gradient="premium-gradient-2"
        />
        <StatCard
          icon={Users}
          label="ผู้ใช้งาน"
          value={stats.total_users}
          subValue="สมาชิกทั้งหมดในระบบ"
          gradient="premium-gradient-3"
        />
        <StatCard
          icon={BarChart}
          label="ร่มรวม"
          value={stats.total_umbrellas}
          subValue="พร้อมให้บริการทั้งหมด"
          gradient="premium-gradient-4"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Daily Trend Chart (Frosted Card) */}
        <section className="glass-card col-span-full rounded-[28px] p-6 lg:col-span-8">
          <h2 className="mb-6 text-sm font-black uppercase tracking-wider text-slate-700">แนวโน้มการใช้งาน (7 วันล่าสุด)</h2>
          <div className="flex h-56 items-end justify-between gap-1.5 px-1.5 overflow-x-auto pb-2">
            {dailyStats.map((day) => {
              const height = (Number(day.count) / maxDaily) * 100;
              const dateObj = new Date(day.date);
              const dayLabel = dateObj.toLocaleDateString("th-TH", { weekday: "short" });
              
              return (
                <div className="group relative flex flex-1 flex-col items-center min-w-[32px]" key={day.date}>
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg opacity-0 transition-opacity group-hover:opacity-100 shadow-sm pointer-events-none">
                    {day.count} ครั้ง
                  </div>
                  <div 
                    className="w-full max-w-[28px] rounded-t-lg premium-gradient-1 transition-all duration-300 hover:brightness-110 hover:-translate-y-0.5"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                  <div className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    {dayLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Location popularities (Frosted Card) */}
        <section className="glass-card col-span-full rounded-[28px] p-6 lg:col-span-4">
          <h2 className="mb-5 text-sm font-black uppercase tracking-wider text-slate-700">ยอดนิยมรายจุดบริการ</h2>
          <div className="space-y-4">
            {locationStats.map((loc) => {
              const percentage = (Number(loc.count) / maxLocation) * 100;
              return (
                <div key={loc.location_id}>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-rose-500" />
                      <span className="text-slate-700">{loc.name_th}</span>
                    </div>
                    <span className="text-indigo-700">{loc.count} ครั้ง</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div 
                      className="h-full rounded-full premium-gradient-2 transition-all duration-700"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Insights panel */}
      <section className="glass-card rounded-[28px] p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-700">บทวิเคราะห์ระบบ</h2>
        <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
          <div className="rounded-2xl bg-indigo-50/50 p-4.5 border border-indigo-100/30">
            <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-indigo-700">จุดบริการที่หนาแน่นที่สุด</h3>
            <p className="text-xl font-black text-indigo-950">
              {locationStats[0]?.name_th ?? "-"}
            </p>
            <p className="mt-1 text-[11px] font-bold text-indigo-500/80 leading-relaxed">
              * แนะนำเพิ่มจำนวนร่มสำรอง ณ จุดนี้เพื่อลดการรอคอยของผู้ใช้บริการ
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50/50 p-4.5 border border-emerald-100/30">
            <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-emerald-800">ประสิทธิภาพการหมุนเวียนร่ม</h3>
            <p className="text-xl font-black text-emerald-950">
              {stats.total_borrows > 0 ? "ยอดเยี่ยม" : "ยังไม่มีข้อมูลการยืม"}
            </p>
            <p className="mt-1 text-[11px] font-bold text-emerald-600/80 leading-relaxed">
              * อัตราการคืนอยู่ในเกณฑ์ปกติ ผู้ใช้งานส่วนใหญ่ดูแลและรักษาสภาพร่มได้ดี
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, gradient, unit = "" }: { 
  icon: any; 
  label: string; 
  value: number | string; 
  subValue: string;
  gradient: string;
  unit?: string;
}) {
  return (
    <div className="glass-card relative overflow-hidden rounded-[24px] p-4.5 sm:p-5.5 shadow-sm">
      <div className={`absolute -right-5 -top-5 flex size-18 items-center justify-center rounded-full opacity-10 text-white ${gradient}`}>
        <Icon size={36} />
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-1.5 flex items-baseline gap-0.5">
          <span className="text-2xl sm:text-3xl font-black text-slate-800">{value}</span>
          {unit && <span className="text-lg font-black text-slate-400">{unit}</span>}
        </div>
        <p className="mt-1.5 text-[10px] font-bold text-slate-500 truncate">{subValue}</p>
      </div>
    </div>
  );
}
