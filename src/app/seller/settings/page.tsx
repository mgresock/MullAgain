"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Input, Label, Textarea } from "@/components/ui/primitives";

export default function SellerSettingsPage() {
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    locationCity: "",
    locationState: "",
    returnPolicy: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((j) => {
        const sp = j.data?.seller;
        if (sp)
          setForm({
            displayName: sp.displayName ?? "",
            bio: sp.bio ?? "",
            locationCity: sp.locationCity ?? "",
            locationState: sp.locationState ?? "",
            returnPolicy: sp.returnPolicy ?? "",
          });
        setLoaded(true);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/seller/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    setMsg(res.ok ? "Saved." : (await res.json()).error ?? "Could not save.");
  }

  if (!loaded) return <div className="mx-auto max-w-xl px-4 py-16 text-center text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-ink">Seller settings</h1>
      <Card>
        <CardBody>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Display name</Label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input value={form.locationCity} onChange={(e) => setForm({ ...form, locationCity: e.target.value })} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.locationState} onChange={(e) => setForm({ ...form, locationState: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Return policy</Label>
              <Textarea
                value={form.returnPolicy}
                onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
                placeholder="e.g. Returns accepted within 14 days if not as described."
              />
            </div>
            {msg && <p className="text-sm text-fairway-700">{msg}</p>}
            <Button disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
