import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/** Server-side session lookup for use in Server Components and Server Actions. */
export async function getSession() {
  return getServerSession(authOptions);
}

/** Requires an authenticated session; redirects to /login otherwise. */
export async function requireSession() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session;
}
