"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Input, Label, Textarea } from "@/components/ui/primitives";

export default function SellerOnboardingPage() {
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [status, setStatus] = useState<{ onboardingComplete: boolean } | null>(null);
  const [form, setForm] = useState({ displayName: "", bio: "", locationCity: "", locationState: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // On mount (and after Stripe return), pull the live connect status.
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/stripe/connect/status");
      if (res.ok) {
        const json = await res.json();
        setHasProfile(true);
        setStatus(json.data);
      } else {
        setHasProfile(false);
      }
    })();
  }, []);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/seller/create-profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json();
      return setError(json.error ?? "Could not create profile.");
    }
    setHasProfile(true);
  }

  async function connectStripe() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/stripe/connect/create-account", { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Could not start Stripe onboarding.");
    window.location.href = json.data.onboardingUrl;
  }

  if (hasProfile === null) {
    return <div className="mx-auto max-w-xl px-4 py-16 text-center text-muted">Loading…</div>;
  }

  if (status?.onboardingComplete) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-fairway-700">You&apos;re ready to sell! ✓</h1>
        <p className="mt-2 text-muted">Stripe onboarding is complete and payouts are enabled.</p>
        <Button className="mt-6" onClick={() => router.push("/seller/listings/new")}>
          Create a listing
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ink">Seller onboarding</h1>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!hasProfile ? (
        <Card className="mt-6">
          <CardBody>
            <h2 className="mb-4 font-semibold">Step 1 — Create your seller profile</h2>
            <form onSubmit={createProfile} className="space-y-4">
              <div>
                <Label>Shop / display name</Label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input
                    value={form.locationCity}
                    onChange={(e) => setForm({ ...form, locationCity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    value={form.locationState}
                    onChange={(e) => setForm({ ...form, locationState: e.target.value })}
                  />
                </div>
              </div>
              <Button disabled={busy}>Create profile</Button>
            </form>
          </CardBody>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardBody>
            <h2 className="mb-2 font-semibold">Step 2 — Connect payouts with Stripe</h2>
            <p className="mb-4 text-sm text-muted">
              We use Stripe Connect to verify your identity and pay you securely. You&apos;ll be
              redirected to Stripe&apos;s hosted onboarding.
            </p>
            <Button onClick={connectStripe} disabled={busy}>
              {busy ? "Redirecting…" : "Connect with Stripe"}
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
