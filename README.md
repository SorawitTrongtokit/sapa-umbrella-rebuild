# PCSHSPL Umbrella Borrowing System

ระบบยืม-คืนร่มสำหรับ PCSHSPL สร้างด้วย Next.js, Neon Auth (Managed Better Auth) และ Neon Postgres โดยออกแบบให้ผู้ใช้เห็นสถานะร่มแบบสด (polling) ผู้ดูแลจัดการร่มได้พร้อม audit log และ Owner จัดการบัญชีผู้ใช้/สิทธิ์/รหัสผ่านได้ตาม requirement ของระบบเดิม

## ภาพรวมระบบ

โปรเจกต์นี้เป็น web app แบบ full-stack บน Next.js App Router มีทั้งหน้าผู้ใช้ทั่วไป หน้าแอดมิน หน้า Owner Console และ API routes สำหรับธุรกรรมสำคัญทั้งหมด

- ผู้ใช้เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน หรือ Google OAuth
- ผู้ใช้ใหม่จาก Google ต้อง onboarding เพื่อกรอกชื่อ ชั้น เลขที่ และตั้งรหัสผ่านก่อนใช้งาน
- ระบบมีร่ม 21 คัน แบ่งตามจุดบริการ 3 จุดจาก migration เริ่มต้น
- ผู้ใช้ยืมร่มที่สถานะว่าง และคืนได้เฉพาะร่มของตัวเองที่จุดเดิม
- สถานะร่มอัปเดตสม่ำเสมอด้วย polling ทุก 10 วินาที
- Admin/Owner เปิดใช้ ปิดใช้ หรือปรับสถานะร่มกลับเป็นว่างได้ โดยต้องระบุเหตุผล
- Owner จัดการผู้ใช้ เปลี่ยน role/status เปลี่ยนรหัสผ่าน ดูรหัสผ่านใน vault พร้อมเหตุผล และตรวจ audit log
- มีสคริปต์ตรวจและย้ายข้อมูลผู้ใช้จาก Firebase RTDB export

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Neon Auth (Managed Better Auth), Neon Postgres, RLS และ Data API
- `@neondatabase/auth` สำหรับ session ฝั่ง server/client
- `postgres` สำหรับ transaction ตรงกับฐานข้อมูล
- Zod สำหรับ validation
- Node test runner ผ่าน `tsx --test`

## โครงสร้างสำคัญ

```text
app/                         Next.js routes, pages และ API routes
components/                  UI client components แยกตาม auth/dashboard/admin/owner
lib/                         auth, db, env, validation, audit, auth clients, password vault
scripts/                     Firebase export inspection, user migration, Neon migrations
db/migrations/               Schema, RLS, seed data และ performance indexes (Neon)
tests/                       Unit tests ของ validation, migration helpers, password vault ฯลฯ
```

## Roles และสิทธิ์

ระบบมี role หลัก 3 ระดับ

- `user`: ดูสถานะร่ม ยืม/คืนร่ม แก้ข้อมูลโปรไฟล์ และส่ง feedback
- `admin`: ทำทุกอย่างของ user และจัดการสถานะร่ม ดู transaction ล่าสุด และดู analytics
- `owner`: ทำทุกอย่างของ admin และจัดการผู้ใช้ทั้งหมด ดู feedback/audit logs เปลี่ยนรหัสผ่าน หรือ reveal password จาก vault

ผู้ใช้ที่สมัครด้วยอีเมลตรงกับ `OWNER_EMAIL` จะได้ role `owner` อัตโนมัติ ส่วน role อื่นสามารถแก้ได้จาก Owner Console

## หน้าหลัก

- `/` redirect ไป `/dashboard` ถ้ามี session หรือ `/auth/login` ถ้ายังไม่เข้าสู่ระบบ
- `/auth/login` เข้าสู่ระบบด้วย password หรือ Google OAuth และ fallback legacy login
- `/auth/register` สมัครบัญชีใหม่ด้วยอีเมล/รหัสผ่าน
- `/auth/forgot-password` ขอ reset password
- `/auth/update-password` ตั้งรหัสผ่านใหม่หลัง reset
- `/auth/callback` OAuth callback และ redirect ตาม onboarding status
- `/onboarding` กรอกข้อมูลครั้งแรกสำหรับบัญชี Google
- `/dashboard` หน้าผู้ใช้ทั่วไปสำหรับยืม/คืนร่ม แก้โปรไฟล์ และส่ง feedback
- `/admin` หน้าจัดการสถานะร่มสำหรับ admin/owner
- `/owner/analytics` หน้า analytics สำหรับ admin/owner
- `/owner` Owner Console สำหรับจัดการผู้ใช้ feedback และ audit logs

## API Routes

API สำคัญอยู่ใต้ `app/api`

- `POST /api/auth/register` สร้าง Neon Auth user, profile และ password vault
- `POST /api/auth/legacy-login` ตรวจรหัสผ่าน legacy จาก vault แล้ว sync password เข้า Neon Auth
- `POST /api/auth/update-password` เปลี่ยนรหัสผ่านของผู้ใช้ปัจจุบันและอัปเดต vault
- `PATCH /api/profile` แก้ข้อมูลโปรไฟล์ผู้ใช้
- `POST /api/profile/onboard-google` สร้าง/อัปเดต profile และ vault สำหรับบัญชี Google
- `POST /api/feedback` บันทึก feedback
- `POST /api/umbrellas/[id]/borrow` ยืมร่มด้วย transaction และ row lock
- `POST /api/umbrellas/[id]/return` คืนร่ม เฉพาะผู้ที่ยืม และเฉพาะ location เดิม
- `PATCH /api/admin/umbrellas/[id]` enable, disable หรือ mark available พร้อมเหตุผล
- `PATCH /api/owner/users/[id]` แก้ข้อมูล role/status/profile ของผู้ใช้
- `POST /api/owner/users/[id]/password` Owner เปลี่ยนรหัสผ่านผู้ใช้
- `POST /api/owner/users/[id]/reveal-password` Owner ดูรหัสผ่านจาก vault โดยต้องระบุเหตุผล

ทุก route ที่เปลี่ยนข้อมูลสำคัญจะเขียน `audit_logs`

## Database Schema

Migration เริ่มต้นอยู่ที่ `db/migrations/0001_neon_schema.sql`

ตารางหลัก:

- `public.profiles`: profile, role, account status, onboarding status และ legacy user id
- `public.locations`: จุดบริการร่ม
- `public.umbrellas`: ร่มแต่ละคัน สถานะ ผู้ยืม และ transaction ปัจจุบัน
- `public.borrow_transactions`: ประวัติการยืม/คืน/ปิดรายการโดย admin
- `public.feedback`: feedback จากผู้ใช้
- `public.audit_logs`: audit trail ของ action สำคัญ
- `app_private.password_vault`: รหัสผ่านที่เข้ารหัสด้วย AES-256-GCM สำหรับ requirement ด้าน Owner/legacy migration

Migration ยังสร้าง enum, trigger `set_updated_at`, RLS policies, helper functions ใน `app_private` และ seed locations/ร่ม 1-21

Legacy Supabase migrations (อ้างอิงเฉพาะเดิม) อยู่ที่ `supabase/migrations/` — ปัจจุบันระบบใช้ `db/migrations/` บน Neon แทน

## Environment Variables

สร้าง `.env.local` จาก `.env.example`

```env
DATABASE_URL=          # Neon pooled connection string (แอปใช้)
NEON_DATABASE_URL=     # Neon pooled (ให้เท่ากับ DATABASE_URL)
NEON_DATABASE_URL_UNPOOLED=  # Neon direct (scripts/migrations เท่านั้น)
NEON_AUTH_BASE_URL=
NEON_AUTH_JWKS_URL=
NEON_AUTH_COOKIE_SECRET=
NEON_BRANCH=production
APP_URL=http://localhost:3000
OWNER_EMAIL=
PASSWORD_VAULT_KEY=
LEGACY_PASSWORD_KEY=
```

คำอธิบาย:

- `DATABASE_URL`: Neon **pooled** connection string (`-pooler`) ใช้กับ `postgres` เพื่อ transaction และ query โดยตรง
- `NEON_DATABASE_URL_UNPOOLED`: Neon **direct** connection string ใช้เฉพาะ scripts/migrations (`FOR UPDATE`, session state)
- `NEON_AUTH_BASE_URL` / `NEON_AUTH_JWKS_URL`: URL ของ Managed Better Auth (ดูใน `neon env pull`)
- `NEON_AUTH_COOKIE_SECRET`: secret ลง cookie ของ auth server (สร้างด้วย `openssl rand -base64 32`)
- `APP_URL`: ค่า URL ของแอป สำหรับ deployment/config
- `OWNER_EMAIL`: อีเมลที่สมัครแล้วได้ role `owner`
- `PASSWORD_VAULT_KEY`: key สำหรับเข้ารหัส/ถอดรหัส password vault (server-only, ห้าม commit)
- `LEGACY_PASSWORD_KEY`: key สำหรับถอดรหัส password จาก Firebase export ตอน inspect/migrate

## Setup

1. ติดตั้ง dependencies

```powershell
npm.cmd install
```

2. เชื่อมโปรเจกกับ Neon

```powershell
neon.cmd link
neon.cmd env pull
```

จากนั้นใส่ key ที่เหลือ (`NEON_AUTH_COOKIE_SECRET`, `OWNER_EMAIL`, `PASSWORD_VAULT_KEY`) ให้ครบ

3. Apply Neon schema

```powershell
npx.cmd tsx scripts/apply-neon-migration.ts
```

script นี้ apply ไฟล์ใน `db/migrations/` ตามลำดับ (track ไว้ใน `app_private.neon_migrations`) — รันซ้ำได้ปลอดภัย

4. ตั้งค่า Neon Auth trusted domains

```powershell
neon.cmd neon-auth domain allow-localhost
neon.cmd neon-auth domain add https://<your-domain>
```

5. ตั้งค่า Google OAuth (ถ้าใช้)

เพิ่ม Authorized redirect URI ใน Google Cloud Console:

```text
{NEON_AUTH_BASE_URL}/callback/google
```

แล้วใส่ credentials:

```powershell
neon.cmd neon-auth oauth-provider add --provider-id google --oauth-client-id <id> --oauth-client-secret <secret>
```

6. รัน dev server

```powershell
npm.cmd run dev
```

เปิด `http://localhost:3000`

## Development Commands

```powershell
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

คำสั่งใน `package.json`:

- `dev`: รัน Next.js dev server
- `build`: build production
- `start`: รัน production server หลัง build
- `lint`: ตรวจ ESLint
- `typecheck`: ตรวจ TypeScript แบบไม่ emit
- `test`: รัน unit tests
- `inspect:firebase`: ตรวจ shape และ decrypt password จาก Firebase export แบบไม่เขียนข้อมูล
- `migrate:users`: dry-run หรือ migrate users จาก Firebase export เข้า Neon

## Firebase RTDB Migration

ระบบไม่อ่าน Firebase โดยตรง ให้ export RTDB เป็น JSON แล้ววางไฟล์ไว้เช่น:

```text
data/firebase-rtdb-export.json
```

ไฟล์ JSON ใน `data/*.json` ถูก ignore โดย git เพื่อป้องกันข้อมูลส่วนตัวหลุด

ตรวจข้อมูลและทดสอบ decrypt ก่อน:

```powershell
npm.cmd run inspect:firebase -- data/firebase-rtdb-export.json
```

dry-run migration:

```powershell
npm.cmd run migrate:users -- data/firebase-rtdb-export.json
```

เขียนข้อมูลจริงเข้า Neon:

```powershell
npm.cmd run migrate:users -- data/firebase-rtdb-export.json --write
```

สคริปต์ migration จะ:

- ค้นหา user records จาก `/users` และ merge password จาก `/userSecrets` ถ้ามี
- normalize class level และ student number
- decrypt legacy password ด้วย `LEGACY_PASSWORD_KEY`
- สร้าง/อัปเดต user ใน `neon_auth."user"` + credential hash (scrypt)
- สร้าง/อัปเดต `profiles`
- เก็บรหัสผ่านเดิมใน `app_private.password_vault` โดยเข้ารหัสใหม่ด้วย `PASSWORD_VAULT_KEY`

## Security Notes

- `DATABASE_URL`, `NEON_DATABASE_URL_UNPOOLED`, `PASSWORD_VAULT_KEY`, `LEGACY_PASSWORD_KEY`, `NEON_AUTH_COOKIE_SECRET` ใช้เฉพาะฝั่ง server/scripts ห้าม expose ไป browser
- ทุก table ใน exposed schema เปิด RLS
- `app_private.password_vault` อยู่ใน private schema, revoke จาก `anonymous/authenticated` และมี deny-all policy
- การอ่าน password ต้องผ่าน Owner API เท่านั้น ต้องระบุเหตุผล และถูกบันทึกใน audit log
- การยืม/คืนร่มใช้ database transaction และ `for update` row lock เพื่อลด race condition
- Admin action ที่กระทบสถานะร่มต้องมีเหตุผลและบันทึก audit log
- Owner ไม่สามารถลดสิทธิ์ตัวเองออกจาก owner หรือ suspend บัญชีตัวเองผ่าน API นี้

## Testing

ชุด test ครอบคลุมส่วนที่เป็น business logic และ migration helpers เช่น:

- validation schema
- grouping/label ของร่ม
- env helpers และ owner email matching
- password vault encryption/decryption และ password strength
- credential password hashing (scrypt, format เดียวกับ Better Auth)
- legacy password decryption
- Firebase export discovery/redaction

รันทั้งหมดด้วย:

```powershell
npm.cmd run test
```

## Deployment Notes

ก่อน deploy ให้ตรวจให้ครบ:

- ตั้ง environment variables ทุกตัวใน Vercel (ดู `.env.example`)
- apply migrations กับ Neon production branch แล้ว (`scripts/apply-neon-migration.ts`)
- ตั้ง Google OAuth callback URL เป็น `{NEON_AUTH_BASE_URL}/callback/google`
- เพิ่ม production domain ใน Neon Auth trusted domains
- ห้าม expose `DATABASE_URL`, vault keys หรือ cookie secret ใน client
- ใช้ `npm.cmd run build` เพื่อตรวจ production build ก่อนปล่อยจริง

## Troubleshooting

- ถ้า login ด้วย Google แล้ววนไป onboarding: ตรวจว่ามี profile และ `onboarding_completed=true`
- ถ้า Google sign-in ได้ `invalid domain`: ตรวจ trusted domains ด้วย `neon.cmd neon-auth domain list`
- ถ้าสถานะร่มอัปเดตช้า: ระบบใช้ polling ทุก 10 วินาที (ไม่ใช่ realtime)
- ถ้า migration user fail เพราะ password: ตรวจ `LEGACY_PASSWORD_KEY` และลอง `inspect:firebase` ก่อน
- ถ้า Owner reveal password ไม่ได้: ตรวจ `PASSWORD_VAULT_KEY` ต้องตรงกับ key ตอนเข้ารหัส
- ถ้า API ตอบ unauthorized/forbidden: ตรวจ session cookie, profile status และ role ใน `profiles`
- ถ้า login ได้ `429`: Better Auth มี rate limit รอสักครู่แล้วลองใหม่
