"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Input, Label } from "@/components/ui/primitives";

export default function VerifyPhonePage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/verify/phone/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Could not send code.");
    setInfo("We texted you a 6-digit code. (In dev, check the server console.)");
    setStep("code");
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/verify/phone/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Incorrect code.");
    router.push("/seller/onboarding");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-ink">Verify your phone</h1>
      <p className="mb-6 text-sm text-muted">Phone verification is required to start selling.</p>
      <Card>
        <CardBody>
          {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {info && step === "code" && (
            <p className="mb-3 rounded-md bg-fairway-50 px-3 py-2 text-sm text-fairway-800">{info}</p>
          )}
          {step === "phone" ? (
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <Label>Phone number</Label>
                <Input
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={confirm} className="space-y-4">
              <div>
                <Label>6-digit code</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Verifying…" : "Verify"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted hover:text-ink"
                onClick={() => setStep("phone")}
              >
                Use a different number
              </button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
