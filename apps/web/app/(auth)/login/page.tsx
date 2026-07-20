import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in — FounderOS" };

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-page">
            <span className="text-lg font-semibold">F</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-primary">
              Sign in to FounderOS
            </h1>
            <p className="mt-1 text-[13px] text-secondary">Your AI Chief of Staff.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border-strong bg-surface p-6 shadow-card">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-[12px] text-muted">
          Founder and Virtual Assistant accounts only.
        </p>
      </div>
    </div>
  );
}
