"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Input, Label } from "@/components/ui/primitives";
import { GoogleButton, AuthDivider } from "@/components/google-button";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-ink">Welcome back</h1>
      <p className="mb-6 text-sm text-muted">Log in to buy, sell, and track orders.</p>
      <Card>
        <CardBody>
          {googleEnabled && (
            <>
              <GoogleButton callbackUrl={callbackUrl} />
              <AuthDivider />
            </>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Log in"}
            </Button>
          </form>
        </CardBody>
      </Card>
      <p className="mt-4 text-center text-sm text-muted">
        New to MullAgain?{" "}
        <Link href="/signup" className="font-medium text-fairway-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
