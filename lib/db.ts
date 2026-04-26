import postgres, { type Sql } from "postgres";
import { requireEnv } from "@/lib/env";

type AppSql = Sql<Record<string, unknown>>;

const globalForPostgres = globalThis as unknown as {
  pcshsplSql?: AppSql;
};

export function getSql(): AppSql {
  if (!globalForPostgres.pcshsplSql) {
    globalForPostgres.pcshsplSql = postgres(requireEnv("DATABASE_URL"), {
      max: 5,
      idle_timeout: 20,
      prepare: false
    }) as AppSql;
  }

  return globalForPostgres.pcshsplSql;
}
