export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  const ownerEmail = process.env.OWNER_EMAIL;
  return Boolean(ownerEmail && email && ownerEmail.toLowerCase() === email.toLowerCase());
}
