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
    <div className="animate-page space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Umbrella}
          label="จำนวนการยืมทั้งหมด"
          value={stats.total_borrows}
          subValue={`กำลังยืมอยู่ ${stats.active_borrows} คัน`}
          gradient="premium-gradient-1"
        />
        <StatCard
          icon={TrendingUp}
          label="อัตราการคืนร่ม"
          value={stats.total_borrows > 0 ? Math.round(((stats.total_borrows - stats.active_borrows) / stats.total_borrows) * 100) : 0}
          unit="%"
          subValue="จากรายการยืมทั้งหมด"
          gradient="premium-gradient-2"
        />
        <StatCard
          icon={Users}
          label="ผู้ใช้งานในระบบ"
          value={stats.total_users}
          subValue="สมาชิกทั้งหมด"
          gradient="premium-gradient-3"
        />
        <StatCard
          icon={BarChart}
          label="ร่มที่มีในระบบ"
          value={stats.total_umbrellas}
          subValue="พร้อมให้บริการ"
          gradient="bg-slate-800"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Daily Trend Chart */}
        <section className="glass-card col-span-full rounded-[32px] p-8 lg:col-span-8">
          <h2 className="mb-8 text-xl font-black text-blue-950">แนวโน้มการใช้งาน (7 วันล่าสุด)</h2>
          <div className="flex h-64 items-end justify-between gap-2 px-2">
            {dailyStats.map((day) => {
              const height = (Number(day.count) / maxDaily) * 100;
              const dateObj = new Date(day.date);
              const dayLabel = dateObj.toLocaleDateString("th-TH", { weekday: "short" });
              
              return (
                <div className="group relative flex flex-1 flex-col items-center" key={day.date}>
                  <div className="mb-2 text-xs font-bold text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                    {day.count}
                  </div>
                  <div 
                    className="w-full max-w-[40px] rounded-t-xl premium-gradient-1 transition-all duration-500 hover:brightness-110"
                    style={{ height: 'var(--bar-height)', "--bar-height": `${height}%`, minHeight: '4px' } as React.CSSProperties}
                  />
                  <div className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {dayLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Location Breakdown */}
        <section className="glass-card col-span-full rounded-[32px] p-8 lg:col-span-4">
          <h2 className="mb-6 text-xl font-black text-blue-950">ยอดนิยมรายจุดบริการ</h2>
          <div className="space-y-6">
            {locationStats.map((loc) => {
              const percentage = (Number(loc.count) / maxLocation) * 100;
              return (
                <div key={loc.location_id}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-blue-500" />
                      <span className="text-sm font-bold text-slate-700">{loc.name_th}</span>
                    </div>
                    <span className="text-xs font-black text-blue-600">{loc.count} ครั้ง</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div 
                      className="h-full rounded-full premium-gradient-2 transition-all duration-700"
                      style={{ width: 'var(--loc-progress)', "--loc-progress": `${percentage}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Insight Section */}
      <section className="glass-card rounded-[32px] p-8">
        <h2 className="mb-4 text-xl font-black text-blue-950">บทวิเคราะห์ระบบ</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-blue-50 p-6 border border-blue-100">
            <h3 className="mb-2 text-sm font-black text-blue-800">จุดบริการที่หนาแน่นที่สุด</h3>
            <p className="text-2xl font-black text-blue-950">
              {locationStats[0]?.name_th ?? "-"}
            </p>
            <p className="mt-1 text-xs font-medium text-blue-600">
              ควรเพิ่มจำนวนร่มสำรองที่จุดนี้หากมีรายการยืมสูงอย่างต่อเนื่อง
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-6 border border-emerald-100">
            <h3 className="mb-2 text-sm font-black text-emerald-800">ประสิทธิภาพการหมุนเวียนร่ม</h3>
            <p className="text-2xl font-black text-emerald-950">
              {stats.total_borrows > 0 ? "ยอดเยี่ยม" : "ยังไม่มีข้อมูล"}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-600">
              ผู้ใช้งานส่วนใหญ่คืนร่มตามจุดที่กำหนดและรักษาความสะอาดของอุปกรณ์
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
    <div className="glass-card relative overflow-hidden rounded-[32px] p-8 shadow-xl shadow-blue-900/5">
      <div className={`absolute -right-6 -top-6 flex size-24 items-center justify-center rounded-full opacity-10 text-white ${gradient}`}>
        <Icon size={48} />
      </div>
      <div className="relative z-10">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-black text-blue-950">{value}</span>
          {unit && <span className="text-xl font-black text-slate-400">{unit}</span>}
        </div>
        <p className="mt-2 text-xs font-bold text-slate-500">{subValue}</p>
      </div>
    </div>
  );
}
