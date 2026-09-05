import { NextResponse, type NextRequest } from "next/server";
import { getAuthIdentity } from "@/lib/auth";
import { getSql } from "@/lib/db";

function safeNextPath(next: string | null) {
  if (!next?.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const origin = requestUrl.origin;
  const loginErrorUrl = `${origin}/auth/login?message=เข้าสู่ระบบไม่สำเร็จ`;

  const user = await getAuthIdentity();

  if (!user) {
    return NextResponse.redirect(loginErrorUrl);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const sql = getSql();
  const [profile] = await sql<{ onboarding_completed: boolean }[]>`
    select onboarding_completed
    from public.profiles
    where id = ${user.id}
  `;

  return NextResponse.redirect(`${origin}${profile?.onboarding_completed ? "/dashboard" : "/onboarding"}`);
}
