export default function Loading() {
  return (
    <main className="min-h-dvh bg-sky-50 px-4 py-6 sm:px-6 lg:px-8">
      <span className="sr-only">กำลังโหลด</span>
      <div className="mx-auto grid max-w-[92rem] gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden space-y-3 lg:block">
          <div className="skeleton h-14 rounded-2xl" />
          <div className="skeleton h-14 rounded-2xl" />
          <div className="skeleton h-14 rounded-2xl" />
        </aside>
        <section className="min-w-0 space-y-6">
          <div className="skeleton h-24 rounded-[24px]" />
          <div className="grid gap-6 md:grid-cols-3">
            <div className="skeleton h-64 rounded-[28px]" />
            <div className="skeleton h-64 rounded-[28px]" />
            <div className="skeleton h-64 rounded-[28px]" />
          </div>
        </section>
      </div>
    </main>
  );
}
