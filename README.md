# PCSHSPL Umbrella Borrowing System

ระบบยืม-คืนร่มสำหรับ PCSHSPL สร้างด้วย Next.js, Supabase Auth, Supabase Postgres และ Supabase Realtime โดยออกแบบให้ผู้ใช้เห็นสถานะร่มแบบเรียลไทม์ ผู้ดูแลจัดการร่มได้พร้อม audit log และ Owner จัดการบัญชีผู้ใช้/สิทธิ์/รหัสผ่านได้ตาม requirement ของระบบเดิม

## ภาพรวมระบบ

โปรเจกต์นี้เป็น web app แบบ full-stack บน Next.js App Router มีทั้งหน้าผู้ใช้ทั่วไป หน้าแอดมิน หน้า Owner Console และ API routes สำหรับธุรกรรมสำคัญทั้งหมด

- ผู้ใช้เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน หรือ Google OAuth
- ผู้ใช้ใหม่จาก Google ต้อง onboarding เพื่อกรอกชื่อ ชั้น เลขที่ และตั้งรหัสผ่านก่อนใช้งาน
- ระบบมีร่ม 21 คัน แบ่งตามจุดบริการ 3 จุดจาก migration เริ่มต้น
- ผู้ใช้ยืมร่มที่สถานะว่าง และคืนได้เฉพาะร่มของตัวเองที่จุดเดิม
- สถานะร่มอัปเดตแบบ realtime ผ่าน Supabase Realtime
- Admin/Owner เปิดใช้ ปิดใช้ หรือปรับสถานะร่มกลับเป็นว่างได้ โดยต้องระบุเหตุผล
- Owner จัดการผู้ใช้ เปลี่ยน role/status เปลี่ยนรหัสผ่าน ดูรหัสผ่านใน vault พร้อมเหตุผล และตรวจ audit log
- มีสคริปต์ตรวจและย้ายข้อมูลผู้ใช้จาก Firebase RTDB export

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, Realtime และ RLS
- `@supabase/ssr` สำหรับ session cookie ฝั่ง server/client
- `postgres` สำหรับ transaction ตรงกับฐานข้อมูล
- Zod สำหรับ validation
- Node test runner ผ่าน `tsx --test`

## โครงสร้างสำคัญ

```text
app/                         Next.js routes, pages และ API routes
components/                  UI client components แยกตาม auth/dashboard/admin/owner
lib/                         auth, db, env, validation, audit, Supabase clients, password vault
scripts/                     Firebase export inspection และ user migration
supabase/migrations/         Schema, RLS, seed data และ performance indexes
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
- `/auth/login` เข้าสู่ระบบด้วย Supabase password หรือ Google OAuth และ fallback legacy login
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

- `POST /api/auth/register` สร้าง Supabase user, profile และ password vault
- `POST /api/auth/legacy-login` ตรวจรหัสผ่าน legacy จาก vault แล้ว sync password เข้า Supabase Auth
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

Migration เริ่มต้นอยู่ที่ `supabase/migrations/202604260001_initial_schema.sql`

ตารางหลัก:

- `public.profiles`: profile, role, account status, onboarding status และ legacy user id
- `public.locations`: จุดบริการร่ม
- `public.umbrellas`: ร่มแต่ละคัน สถานะ ผู้ยืม และ transaction ปัจจุบัน
- `public.borrow_transactions`: ประวัติการยืม/คืน/ปิดรายการโดย admin
- `public.feedback`: feedback จากผู้ใช้
- `public.audit_logs`: audit trail ของ action สำคัญ
- `app_private.password_vault`: รหัสผ่านที่เข้ารหัสด้วย AES-256-GCM สำหรับ requirement ด้าน Owner/legacy migration

Migration ยังสร้าง enum, trigger `set_updated_at`, RLS policies, helper functions ใน `app_private`, seed locations และ seed ร่มหมายเลข 1-21 รวมถึงเปิด `replica identity full` และเพิ่ม `public.umbrellas` เข้า Supabase Realtime publication

Migration เพิ่ม performance indexes อยู่ที่ `supabase/migrations/20260428122607_performance_indexes.sql`

## Environment Variables

สร้าง `.env.local` จาก `.env.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
APP_URL=http://localhost:3000
OWNER_EMAIL=
PASSWORD_VAULT_KEY=
LEGACY_PASSWORD_KEY=
```

คำอธิบาย:

- `NEXT_PUBLIC_SUPABASE_URL`: URL ของ Supabase project ใช้ได้ทั้ง client/server
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key สำหรับ browser และ server session client
- `SUPABASE_SERVICE_ROLE_KEY`: service role สำหรับ server routes/scripts เท่านั้น ห้ามส่งไป browser
- `DATABASE_URL`: Postgres connection string ใช้กับ `postgres` เพื่อ transaction และ query โดยตรง
- `APP_URL`: ค่า URL ของแอป ปัจจุบันยังไม่ได้ถูกอ่านโดย code หลัก แต่เก็บไว้สำหรับ deployment/config ในอนาคต
- `OWNER_EMAIL`: อีเมลที่สมัครแล้วได้ role `owner`
- `PASSWORD_VAULT_KEY`: key สำหรับเข้ารหัส/ถอดรหัส password vault
- `LEGACY_PASSWORD_KEY`: key สำหรับถอดรหัส password จาก Firebase export ตอน inspect/migrate

## Setup

1. ติดตั้ง dependencies

```powershell
npm.cmd install
```

2. สร้าง `.env.local`

```powershell
Copy-Item .env.example .env.local
```

จากนั้นใส่ค่า Supabase, database และ key ต่าง ๆ ให้ครบ

3. Apply Supabase migrations

ใช้ Supabase SQL editor หรือ Supabase CLI เพื่อ apply migration ตามลำดับ:

```text
supabase/migrations/202604260001_initial_schema.sql
supabase/migrations/20260428122607_performance_indexes.sql
```

4. ตั้งค่า Google OAuth ใน Supabase Auth

เพิ่ม callback URL:

```text
http://localhost:3000/auth/callback
https://<your-domain>/auth/callback
```

5. รัน dev server

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
- `migrate:users`: dry-run หรือ migrate users จาก Firebase export เข้า Supabase

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

เขียนข้อมูลจริงเข้า Supabase:

```powershell
npm.cmd run migrate:users -- data/firebase-rtdb-export.json --write
```

สคริปต์ migration จะ:

- ค้นหา user records จาก `/users` และ merge password จาก `/userSecrets` ถ้ามี
- normalize class level และ student number
- decrypt legacy password ด้วย `LEGACY_PASSWORD_KEY`
- สร้าง/อัปเดต Supabase Auth user
- สร้าง/อัปเดต `profiles`
- เก็บรหัสผ่านเดิมใน `app_private.password_vault` โดยเข้ารหัสใหม่ด้วย `PASSWORD_VAULT_KEY`
- แปลง password ที่สั้นเกินขั้นต่ำของ Supabase เป็นรหัสผ่าน compatible แบบ deterministic สำหรับ Auth แต่ยังเก็บ plain legacy password ที่เข้ารหัสไว้ใน vault

## Security Notes

- Browser ใช้เฉพาะ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `PASSWORD_VAULT_KEY` และ `LEGACY_PASSWORD_KEY` ใช้เฉพาะฝั่ง server/scripts
- ทุก table ใน exposed schema เปิด RLS
- `app_private.password_vault` อยู่ใน private schema, revoke จาก `anon/authenticated` และมี deny-all policy
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
- legacy password decryption
- Firebase export discovery/redaction
- password compatibility สำหรับ Supabase Auth

รันทั้งหมดด้วย:

```powershell
npm.cmd run test
```

## Deployment Notes

ก่อน deploy ให้ตรวจให้ครบ:

- ตั้ง environment variables ทุกตัวใน hosting provider
- apply migrations กับ Supabase project production แล้ว
- เปิด Supabase Realtime สำหรับ `public.umbrellas`
- ตั้ง Google OAuth callback URL ของ production domain
- ห้าม expose service role key หรือ database URL ใน client
- ใช้ `npm.cmd run build` เพื่อตรวจ production build ก่อนปล่อยจริง

## Troubleshooting

- ถ้า login ด้วย Google แล้ววนไป onboarding: ตรวจว่ามี profile และ `onboarding_completed=true`
- ถ้าสถานะร่มไม่ realtime: ตรวจ Realtime publication ของ `public.umbrellas` และ browser anon key
- ถ้า migration user fail เพราะ password: ตรวจ `LEGACY_PASSWORD_KEY` และลอง `inspect:firebase` ก่อน
- ถ้า Owner reveal password ไม่ได้: ตรวจ `PASSWORD_VAULT_KEY` ต้องตรงกับ key ตอนเข้ารหัส
- ถ้า API ตอบ unauthorized/forbidden: ตรวจ session cookie, profile status และ role ใน `profiles`
