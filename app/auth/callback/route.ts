import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

function safeNextPath(next: string | null) {
  if (!next?.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const origin = requestUrl.origin;
  const loginErrorUrl = `${origin}/auth/login?message=เข้าสู่ระบบไม่สำเร็จ`;

  if (!code) {
    return NextResponse.redirect(loginErrorUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(loginErrorUrl);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(loginErrorUrl);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.redirect(`${origin}${profile?.onboarding_completed ? "/dashboard" : "/onboarding"}`);
}
