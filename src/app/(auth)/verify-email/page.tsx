"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/primitives";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}

function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"idle" | "verifying" | "done" | "error">(
    token ? "verifying" : "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      const res = await fetch("/api/verify/email/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (res.ok) {
        setState("done");
      } else {
        setState("error");
        setMessage(json.error ?? "Verification failed.");
      }
    })();
  }, [token]);

  async function resend() {
    setMessage("");
    const res = await fetch("/api/verify/email/send", { method: "POST" });
    setMessage(res.ok ? "Verification email sent — check your inbox (or the dev console)." : "Could not send email.");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <Card>
        <CardBody className="space-y-4">
          {state === "verifying" && <p>Verifying your email…</p>}
          {state === "done" && (
            <>
              <h1 className="text-xl font-bold text-fairway-700">Email verified ✓</h1>
              <p className="text-sm text-muted">You can now buy, message, and start selling.</p>
              <Link href="/dashboard">
                <Button className="w-full">Go to dashboard</Button>
              </Link>
            </>
          )}
          {(state === "idle" || state === "error") && (
            <>
              <h1 className="text-xl font-bold text-ink">Verify your email</h1>
              <p className="text-sm text-muted">
                {state === "error"
                  ? message
                  : "We sent you a verification link. Click it to activate your account."}
              </p>
              <Button variant="outline" className="w-full" onClick={resend}>
                Resend verification email
              </Button>
              {message && <p className="text-sm text-fairway-700">{message}</p>}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
