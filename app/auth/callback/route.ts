import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?message=เข้าสู่ระบบไม่สำเร็จ`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?message=เข้าสู่ระบบไม่สำเร็จ`);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?message=เข้าสู่ระบบไม่สำเร็จ`);
  }

  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.redirect(`${origin}${profile?.onboarding_completed ? "/dashboard" : "/onboarding"}`);
}
