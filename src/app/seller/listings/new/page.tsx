"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Input, Label, Textarea } from "@/components/ui/primitives";
import { ListingCategory, ListingCondition, Handedness, ShaftFlex, ShaftMaterial } from "@prisma/client";

const CATEGORIES = Object.values(ListingCategory);
const CONDITIONS = Object.values(ListingCondition);

export default function NewListingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "DRIVERS" as ListingCategory,
    brand: "",
    model: "",
    condition: "EXCELLENT" as ListingCondition,
    price: "",
    shippingPrice: "15",
    allowOffers: true,
    // golf specs (sent only when relevant)
    handedness: "RIGHT" as Handedness,
    shaftFlex: "STIFF" as ShaftFlex,
    shaftMaterial: "GRAPHITE" as ShaftMaterial,
    loft: "",
    length: "",
    setComposition: "",
    size: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (files.length < 3) return setError("Please add at least 3 photos.");
    setBusy(true);
    try {
      // 1) Create the listing (draft).
      setStep("Creating listing…");
      const golfSpecs = {
        handedness: form.handedness,
        shaftFlex: form.shaftFlex,
        shaftMaterial: form.shaftMaterial,
        loft: form.loft || undefined,
        length: form.length || undefined,
        setComposition: form.setComposition || undefined,
        size: form.size || undefined,
      };
      const createRes = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          brand: form.brand,
          model: form.model || undefined,
          condition: form.condition,
          priceCents: Math.round(Number(form.price) * 100),
          shippingPriceCents: Math.round(Number(form.shippingPrice) * 100),
          allowOffers: form.allowOffers,
          golfSpecs,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.error ?? "Could not create listing.");
      const listingId = createJson.data.id;

      // 2) Presign uploads.
      setStep("Preparing photo uploads…");
      const presignRes = await fetch(`/api/listings/${listingId}/images/presign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: files.map((f) => ({ contentType: f.type, sizeBytes: f.size })),
        }),
      });
      const presignJson = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignJson.error ?? "Could not presign uploads.");
      const uploads: { uploadUrl: string; s3Key: string }[] = presignJson.data.uploads;

      // 3) Upload to S3 (skipped automatically in dev-stub mode).
      setStep("Uploading photos…");
      await Promise.all(
        uploads.map(async (u, idx) => {
          if (u.uploadUrl.startsWith("/__dev-uploads/")) return; // stub
          await fetch(u.uploadUrl, {
            method: "PUT",
            headers: { "content-type": files[idx].type },
            body: files[idx],
          });
        }),
      );

      // 4) Confirm + attach images.
      setStep("Finalizing photos…");
      const confirmRes = await fetch(`/api/listings/${listingId}/images/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          images: uploads.map((u, idx) => ({ s3Key: u.s3Key, sortOrder: idx })),
        }),
      });
      if (!confirmRes.ok) {
        const j = await confirmRes.json();
        throw new Error(j.error ?? "Could not attach photos.");
      }

      // 5) Publish.
      setStep("Publishing…");
      const pubRes = await fetch(`/api/listings/${listingId}/publish`, { method: "POST" });
      const pubJson = await pubRes.json();
      if (!pubRes.ok) throw new Error(pubJson.error ?? "Could not publish.");

      router.push("/seller/dashboard");
      router.refresh();
      if (pubJson.data.requiresReview) {
        alert("Your listing was submitted for review and will go live once approved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  const showClubSpecs = ["DRIVERS", "FAIRWAY_WOODS", "HYBRIDS", "IRONS", "WEDGES", "PUTTERS"].includes(
    form.category,
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Create a listing</h1>
      <p className="mt-1 text-sm text-muted">
        New sellers and high-value items go through a quick review before going live.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={submit} className="mt-6 space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} required minLength={8} maxLength={100} placeholder="TaylorMade Stealth Driver 10.5° — Excellent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select
                  className="h-10 w-full rounded-lg border px-2 text-sm"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value as ListingCategory)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Condition</Label>
                <select
                  className="h-10 w-full rounded-lg border px-2 text-sm"
                  value={form.condition}
                  onChange={(e) => set("condition", e.target.value as ListingCondition)}
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Brand</Label>
                <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} required />
              </div>
              <div>
                <Label>Model</Label>
                <Input value={form.model} onChange={(e) => set("model", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                required
                minLength={40}
                maxLength={3000}
                placeholder="Describe condition, included accessories, specs, and any flaws (min 40 characters)…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price ($)</Label>
                <Input type="number" min={5} value={form.price} onChange={(e) => set("price", e.target.value)} required />
              </div>
              <div>
                <Label>Shipping ($)</Label>
                <Input type="number" min={0} value={form.shippingPrice} onChange={(e) => set("shippingPrice", e.target.value)} />
              </div>
            </div>
          </CardBody>
        </Card>

        {showClubSpecs && (
          <Card>
            <CardBody className="space-y-4">
              <h2 className="font-semibold text-ink">Club specs</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Handedness</Label>
                  <select className="h-10 w-full rounded-lg border px-2 text-sm" value={form.handedness} onChange={(e) => set("handedness", e.target.value as Handedness)}>
                    {Object.values(Handedness).map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Shaft flex</Label>
                  <select className="h-10 w-full rounded-lg border px-2 text-sm" value={form.shaftFlex} onChange={(e) => set("shaftFlex", e.target.value as ShaftFlex)}>
                    {Object.values(ShaftFlex).map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Shaft material</Label>
                  <select className="h-10 w-full rounded-lg border px-2 text-sm" value={form.shaftMaterial} onChange={(e) => set("shaftMaterial", e.target.value as ShaftMaterial)}>
                    {Object.values(ShaftMaterial).map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Loft</Label>
                  <Input value={form.loft} onChange={(e) => set("loft", e.target.value)} placeholder="10.5°" />
                </div>
                <div>
                  <Label>Length</Label>
                  <Input value={form.length} onChange={(e) => set("length", e.target.value)} placeholder={'34"'} />
                </div>
                <div>
                  <Label>Set composition</Label>
                  <Input value={form.setComposition} onChange={(e) => set("setComposition", e.target.value)} placeholder="5-PW" />
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-semibold text-ink">Photos (3–12)</h2>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 12))}
              className="text-sm"
            />
            <p className="text-xs text-muted">{files.length} selected · jpg, png, or webp · max 8MB each</p>
          </CardBody>
        </Card>

        <Button size="lg" className="w-full" disabled={busy}>
          {busy ? step || "Working…" : "Publish listing"}
        </Button>
      </form>
    </div>
  );
}
