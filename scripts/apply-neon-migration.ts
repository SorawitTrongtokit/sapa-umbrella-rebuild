import "./load-env";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const NEON_MIGRATIONS_DIR = "db/migrations";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

const directUrl = requireEnv("NEON_DATABASE_URL_UNPOOLED");
const sql = postgres(directUrl, { max: 1, prepare: false, connect_timeout: 60 });

const dryRun = process.argv.includes("--dry-run");

async function main() {
  await sql`create schema if not exists app_private`;
  await sql`
    create table if not exists app_private.neon_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const files = readdirSync(NEON_MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    (await sql<{ name: string }[]>`select name from app_private.neon_migrations`).map((r) => r.name)
  );

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`SKIP  ${file} (already applied)`);
      continue;
    }
    const content = readFileSync(join(NEON_MIGRATIONS_DIR, file), "utf8");
    if (dryRun) {
      console.log(`DRY   ${file} (${content.length} bytes, skipped execution)`);
      continue;
    }
    console.log(`APPLY ${file} ...`);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into app_private.neon_migrations (name) values (${file})`;
    });
    console.log(`OK    ${file}`);
    ran++;
  }

  console.log(`Done. ${ran} migration(s) applied.`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => sql.end());
