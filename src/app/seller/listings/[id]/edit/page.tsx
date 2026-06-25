"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Input, Label, Textarea } from "@/components/ui/primitives";
import { ListingCondition } from "@prisma/client";

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    condition: "EXCELLENT" as ListingCondition,
    price: "",
    shippingPrice: "",
    allowOffers: true,
  });

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then((j) => {
        const l = j.data;
        if (l)
          setForm({
            title: l.title,
            description: l.description,
            condition: l.condition,
            price: String(l.priceCents / 100),
            shippingPrice: String(l.shippingPriceCents / 100),
            allowOffers: l.allowOffers,
          });
        setLoaded(true);
      });
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        condition: form.condition,
        priceCents: Math.round(Number(form.price) * 100),
        shippingPriceCents: Math.round(Number(form.shippingPrice) * 100),
        allowOffers: form.allowOffers,
      }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Could not save.");
    router.push("/seller/listings");
    router.refresh();
  }

  if (!loaded) return <div className="mx-auto max-w-xl px-4 py-16 text-center text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-ink">Edit listing</h1>
      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Card>
        <CardBody>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={8} maxLength={100} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} minLength={40} maxLength={3000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price ($)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Shipping ($)</Label>
                <Input type="number" value={form.shippingPrice} onChange={(e) => setForm({ ...form, shippingPrice: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Condition</Label>
              <select
                className="h-10 w-full rounded-lg border px-2 text-sm"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value as ListingCondition })}
              >
                {Object.values(ListingCondition).map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowOffers}
                onChange={(e) => setForm({ ...form, allowOffers: e.target.checked })}
              />
              Accept offers
            </label>
            <p className="text-xs text-muted">
              Editing an active listing may send it back to review if it triggers our trust checks.
            </p>
            <Button disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
