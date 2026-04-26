import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { HttpError } from "@/lib/http";
import type { AppRole, Profile } from "@/lib/types";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, "กรุณาเข้าสู่ระบบ");
  }

  return user;
}

export async function getProfile(userId: string): Promise<Profile> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new HttpError(403, "ไม่พบข้อมูลผู้ใช้");
  }

  return data as Profile;
}

export async function requireActiveProfile(): Promise<Profile> {
  const user = await getCurrentUser();
  const profile = await getProfile(user.id);

  if (profile.status !== "active") {
    throw new HttpError(403, "บัญชีนี้ถูกระงับ กรุณาติดต่อผู้ดูแล");
  }

  return profile;
}

export async function requireRole(roles: AppRole[]): Promise<Profile> {
  const profile = await requireActiveProfile();

  if (!roles.includes(profile.role)) {
    throw new HttpError(403, "คุณไม่มีสิทธิ์ใช้งานส่วนนี้");
  }

  return profile;
}

export function isStaffRole(role: AppRole) {
  return role === "admin" || role === "owner";
}
