"use client";

import { createAuthClient } from "@neondatabase/auth/next";

let authClient: ReturnType<typeof createAuthClient> | null = null;

export function getAuthClient() {
  authClient ??= createAuthClient();
  return authClient;
}
