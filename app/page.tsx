import { redirect } from "next/navigation";
import { getAuthIdentity } from "@/lib/auth";

export default async function HomePage() {
  const user = await getAuthIdentity();

  redirect(user ? "/dashboard" : "/auth/login");
}
