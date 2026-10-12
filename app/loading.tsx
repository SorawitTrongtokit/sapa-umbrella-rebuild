export default function Loading() {
  return (
    <main className="min-h-dvh animate-fade px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <span className="sr-only">กำลังโหลด</span>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-5 w-72 max-w-full" />
        </div>
        <div className="skeleton h-32 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="skeleton h-64 rounded-3xl" />
          <div className="skeleton h-64 rounded-3xl" />
          <div className="skeleton h-64 rounded-3xl" />
        </div>
      </div>
    </main>
  );
}
