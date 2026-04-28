import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { HttpError } from "@/lib/http";
import type { AppRole, Profile } from "@/lib/types";

export type AuthIdentity = {
  id: string;
  email: string | null;
};

export async function getAuthIdentity(): Promise<AuthIdentity | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims.sub;

  if (error || !id) {
    return null;
  }

  return {
    id,
    email: typeof data.claims.email === "string" ? data.claims.email : null
  };
}

export async function getCurrentUser() {
  const user = await getAuthIdentity();

  if (!user) {
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
