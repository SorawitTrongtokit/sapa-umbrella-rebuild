# Migration Log: Supabase → Neon

บันทึกบัค/ข้อบกพร่อง/ความเสี่ยงที่พบระหว่างการย้ายระบบจาก Supabase ไป Neon
(ปรับปรุงล่าสุด: 2026-09-05)

สถานะ: ✅ แก้แล้ว | 🔧 จะแก้ใน phase นี้ | ⚠️ ยอมรับความเสี่ยง / รอตัดสินใจ | 📌 ไม่แก้ (ทราบไว้)

---

## สรุปข้อมูลก่อนย้าย (จาก dump วันที่ 2026-09-05 04:15)

- Postgres ต้นทาง: Supabase **17.6** → Neon ปลายทาง: **18** (dump 17 restore บน 18 ได้ตามปกติ)
- ข้อมูล: auth.users 104 (ยืนยันอีเมลหมด), profiles 104 (owner 1, admin 1, user 102 — 1 suspended),
  umbrellas 21 (available ทั้งหมด), borrow_transactions 19 (returned ทั้งหมด — **ไม่มีรายการค้าง**),
  feedback 1, locations 3, audit_logs 59, password_vault 104 (key_version v1 ทั้งหมด),
  auth_attempts 3, identities 105 (email 101 + google 4)
- Supabase Storage ว่างเปล่า (0 buckets, 0 objects) — ไม่มีอะไรต้องย้าย
- vault decrypt ด้วย `PASSWORD_VAULT_KEY` จาก env: **ผ่าน 104/104** (GCM auth tag ตรงหมด)

## ปัญหาด้าน Environment

### 1. `.env.local` ถูกเขียนทับด้วย Neon vars ✅ แก้แล้ว
`neon env pull` / `neon checkout` (CLI เวอร์ชันก่อนหน้า) เขียนทับ `.env.local` ทั้งไฟล์ ทำให้
Supabase keys + `PASSWORD_VAULT_KEY` + `OWNER_EMAIL` หาย (ต้องไปกู้จาก Vercel/Supabase dashboard)
- **สถานะปัจจุบัน:** CLI ปัจจุบัน preserve บรรทัดที่ไม่ใช่ Neon แล้ว; ได้สร้าง `.env.local` ใหม่ที่
  แยกชื่อกันชนกันแล้ว: `DATABASE_URL` (ชั่วคราว = Supabase, จะสลับเป็น Neon ตอน cutover),
  `SUPABASE_DATABASE_URL`, `NEON_DATABASE_URL` (pooled), `NEON_DATABASE_URL_UNPOOLED` (direct),
  `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`
- **บทเรียน:** อย่าเก็บ secrets ไว้แค่ `.env.local` — Vercel env เป็น source of truth ฝั่ง deploy

### 2. `neon.ts` ประกาศ preview.buckets + functions ทำ `neon env pull` พัง ✅ แก้แล้ว
Object Storage/Functions เป็น beta เฉพาะ region `aws-us-east-2`/`eu-central-1` แต่โปรเจกอยู่
`aws-ap-southeast-1` → `neon env pull` error 404 ทันที
- **แก้:** ลบ `preview` block ออกจาก `neon.ts` (แอปไม่ได้ใช้ buckets/functions) คง `auth: true` +
  branch policy ไว้

### 3. ไฟล์ dump/zip ของ Supabase ไม่ถูก gitignore ⚠️ (แก้แล้วเชิงกันเหนียว)
`db_cluster-*.backup.gz` มี PII + password hashes + vault ciphertext อยู่ root และ untracked —
เสี่ยงถูก commit โดยบังเอิญ
- **แก้:** เพิ่ม `*.backup.gz`, `*.storage.zip` ใน `.gitignore` (ไฟล์ยังไม่เคยถูก commit — ตรวจแล้ว)

### 4. `APP_URL` ยังเป็น localhost 🔧 cutover
ต้องตั้งเป็น production URL ก่อน cutover (มีผลกับ redirect หลัง reset password / OAuth callback)

## ปัญหาด้าน Schema/ข้อมูล

### 5. dump เป็น cluster dump รวม schema ภายในของ Supabase 🔧 Phase 1
มี auth/storage/realtime/vault/graphql/pgbouncer schema + roles ของ Supabase ปนมา — restore ตรง ๆ
ลง Neon ไม่ได้ ต้องสร้าง schema เองจาก `supabase/migrations/*` + ย้ายเฉพาะข้อมูล

### 6. FK 9 จุดชี้ไป `auth.users(id)` / RLS ใช้ `auth.uid()` 🔧 Phase 1
ต้องเขียนใหม่ชี้ `neon_auth."user"` + ใช้ helper ของ Neon แทน (type ของ id ต้องเช็คจาก live DB ก่อน)

### 7. Trigger `on_auth_user_created` + publication `supabase_realtime` 🔧 Phase 1
Supabase-specific ทั้งหมด — Realtime ถูกแทนด้วย polling แล้ว ไม่ต้องมี publication

### 8. README บอก apply migrations ผิด 🔧 Phase 5
README setup บอกแค่ 2 migrations แต่ต้องใช้ 3 (ตัวที่ 3 `202605050001_audit_fixes.sql` เพิ่ม
unique active-borrow index + `app_private.auth_attempts`) — จะแก้ตอนเขียน README ใหม่

## ปัญหาด้านโค้ด

### 9. `scripts/migrate-users.ts` query `auth.users` ตรง 🔧 Phase 2
จะพังทันทีหลังปิด Supabase — ต้องเปลี่ยนเป็น `neon_auth."user"`

### 10. มาตรฐานความยาวรหัสผ่านไม่สอดคล้อง 📌 (ประเมินใน Phase 2)
`lib/auth-password.ts` ยอมรับ 6 ตัว (Supabase-compatible) แต่ `assertPasswordStrength` ต้องการ
8+ ตัวอักษร+ตัวเลข — มีจุดที่รับรหัสอ่อนได้ ต้องตัดสินใจตอนย้ายมา Better Auth (เสี่ยง users ที่มี
รหัสสั้นย้ายไม่ผ่านถ้าบังคับ 8+)

### 11. RLS ถูก bypass เกือบทั้งหมดในสถาปัตยกรรมเดิม 🔧 Phase 1/2
API routes ใช้ service role หรือ direct SQL (ไม่มี JWT context) — RLS เดิมมีผลจริงแค่กับ
realtime subscriptions ของ browser เมื่อเปิด Data API บน Neon ต้องตรวจว่า RLS ครอบทุกตาราง
ที่ expose จริง

### 12. `password_vault` เก็บรหัสผ่าน plaintext (เข้ารหัส at-rest) 📌 ยอมรับไว้
จำเป็นต่อ legacy login + reveal (มี reason + audit log แล้ว) — ความเสี่ยงอยู่ที่ `PASSWORD_VAULT_KEY`
รั่ว; แนะนำเก็บ key ไว้ Vercel env เท่านั้น ห้าม commit

### 13. Session ทั้งหมดจะยกเลิกหลังย้าย auth ⚠️ ยอมรับ
ผู้ใช้ทุกคนต้อง login ใหม่หลัง cutover (เลือกไว้: ย้ายรหัสผ่านผ่าน vault เพื่อให้ใช้รหัสเดิมได้)
ควร cutover ตอนนอกเวลาใช้งาน

### 14. Neon Data API ตั้ง default privileges ให้ grant ครบโดยอัตโนมัติ ✅ แก้แล้ว
ตอนเปิด Data API ระบบตั้ง `ALTER DEFAULT PRIVILEGES` ให้ `authenticated` ได้สิทธิ์ครบ
(INSERT/UPDATE/DELETE/SELECT) กับทุกตารางใหม่ใน schema public — โมเดล Supabase (grant-all + RLS)
แต่แอปนี้ออกแบบ grants แบบ least-privilege
- **แก้:** `db/migrations/0002_lock_down_grants.sql` — revoke ส่วนเกิน + revoke default privileges
- **ตรวจแล้ว:** grants ตรงตามออกแบบ, RLS ทดสอบจริง (impersonate authenticated ไม่มี JWT) เห็น 0 rows

### 15. Supabase project ถูก paused กลางทาง ✅ แก้แล้ว (ผู้ใช้กด Restore)
ตอนเริ่มรัน migration script พบ `(ENOTFOUND) tenant/user postgres.wtvyxsgzmcnjwmmpgcwh not found` —
domain `wtvyxsgzmcnjwmmpgcwh.supabase.co` ไม่มีอยู่แล้ว (Non-existent domain) = project ถูก
Supabase paused อัตโนมัติ (free tier ปิด project ที่ไม่มี activity)
- **แก้:** ผู้ใช้กด Restore project แล้ว — dry-run อ่านสดสำเร็จ (ตัวเลขตรง dump ทุกตัว)

### 16. หน้า server component ที่อ่าน session ต้องประกาศ `force-dynamic` ✅ แก้แล้ว
`npm run build` พบ warning "Route / couldn't be rendered statically because it used `cookies`" —
Next.js พยายาม prerender หน้าที่เรียก `getAuthIdentity()` (อ่าน cookie) แล้วต้อง fallback เป็น dynamic
- **แก้:** เพิ่ม `export const dynamic = "force-dynamic";` ให้ครบทั้ง 9 หน้าที่อ่าน session
- หลังแก้ build สะอาด ไม่มี warning

## ผลการ migration จริง (2026-09-05)

- `--write` สำเร็จ: locations 3, auth users 104, profiles 104, umbrellas 21,
  transactions 19, feedback 1, audit_logs 59, vault 104, auth_attempts 3
- vault roundtrip จาก Neon: **104/104 OK**, FK integrity: 0 ปัญหา
- ทดสอบ sign-in ด้วยรหัสเดิมผ่าน Better Auth: **103/103 active users ผ่าน**,
  suspended 1 คนถูกบล็อกถูกต้อง, 0 fail
- Smoke test แอปจริง (local dev บน Neon): login ผ่าน handler เอง → session cookie,
  /api/umbrellas 200 (21), ยืม/คืนร่ม #1 สำเร็จ + audit 2 แถว, unauthorized ได้ 401
- Better Auth มี rate limit ที่ /sign-in/email (~10 คำขอ/นาทีต่อ IP) — script ทดสอบ
  ต้อง pacing; ผู้ใช้จริงไม่กระทบ (1 ครั้ง/คน)

## การตัดสินใจที่ตกลงแล้ว

| หัวข้อ | ตัดสินใจ |
|---|---|
| Auth | Neon Auth (Managed Better Auth) เต็มรูปแบบ + SupabaseAuthAdapter |
| รหัสผ่าน | ย้ายผ่าน password_vault (ถอดรหัสฝั่ง server, ห้าม log plaintext) |
| Realtime | Polling ทุก 10-15 วิ |
| แหล่งข้อมูล cutover | ดึงสดจาก Supabase (DATABASE_URL) ไม่ใช่ไฟล์ dump |
