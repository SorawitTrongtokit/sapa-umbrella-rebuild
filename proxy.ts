import { auth } from "@/lib/auth-server";

// Middleware exists solely to complete the OAuth flow: when Better Auth
// redirects back to /auth/callback?neon_auth_session_verifier=..., this
// middleware exchanges the verifier for app-domain session cookies.
// /auth/callback is in the middleware's built-in skip list, so no route
// protection happens here — pages guard themselves server-side.
export default auth.middleware();

export const config = {
  matcher: ["/auth/callback"]
};
