# PCSHSPL Umbrella Borrowing System

ระบบยืมคืนร่มแบบ real-time สำหรับ PCSHSPL สร้างด้วย Next.js, Supabase Auth, Supabase Postgres, Supabase Realtime และ server-side RBAC

## Setup

1. ติดตั้ง dependencies
   ```powershell
   npm.cmd install
   ```

2. สร้าง `.env.local` จาก `.env.example`
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

3. ใช้ SQL migration ใน `supabase/migrations/202604260001_initial_schema.sql` กับ Supabase project

4. ตั้งค่า Google OAuth ใน Supabase Auth แล้วเพิ่ม callback URL:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://<your-domain>/auth/callback`

## Development

```powershell
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Migration From Firebase RTDB

ระบบไม่แตะ Firebase database โดยตรง ให้ export RTDB เป็น JSON แล้ววางที่:

```text
data/firebase-rtdb-export.json
```

ตรวจสอบ shape และทดสอบ decrypt ก่อน:

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

## Security Notes

- Browser ใช้เฉพาะ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `PASSWORD_VAULT_KEY` และ legacy decrypt key ใช้เฉพาะฝั่ง server/scripts
- ทุก table ใน exposed schema เปิด RLS
- password vault อยู่ใน `app_private`, revoke จาก `anon/authenticated`, และมี deny-all policy
- Owner ดูรหัสผ่านได้ตาม requirement แต่ทุกครั้งต้องมีเหตุผลและบันทึก audit log
- การยืม/คืนใช้ server transaction และ row lock เพื่อกัน race condition
