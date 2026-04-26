const clientKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getPublicEnv() {
  return {
    supabaseUrl: requireEnv(clientKeys[0]),
    supabaseAnonKey: requireEnv(clientKeys[1])
  };
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  const ownerEmail = process.env.OWNER_EMAIL;
  return Boolean(ownerEmail && email && ownerEmail.toLowerCase() === email.toLowerCase());
}
