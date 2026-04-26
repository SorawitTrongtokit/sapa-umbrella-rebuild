import { createHash } from "node:crypto";

export function getSupabaseCompatiblePassword(plainPassword: string, email: string, legacyId: string) {
  if (plainPassword.length >= 6) {
    return { password: plainPassword, adjusted: false };
  }

  const digest = createHash("sha256")
    .update(`${email}:${legacyId}:${plainPassword}:pcshspl-auth-password`)
    .digest("hex")
    .slice(0, 18);

  return {
    password: `Pcshspl-${digest}-1a`,
    adjusted: true
  };
}
