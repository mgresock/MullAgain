"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";
import { Button } from "./ui/button";
import { Input } from "./ui/primitives";

interface BuyBoxProps {
  listingId: string;
  priceCents: number;
  allowOffers: boolean;
  minOfferCents?: number | null;
  isOwner: boolean;
  isAuthed: boolean;
  isActive: boolean;
}

export function BuyBox(props: BuyBoxProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [offer, setOffer] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  async function buyNow() {
    setError(null);
    if (!props.isAuthed) return router.push(`/login?callbackUrl=/marketplace`);
    setBusy(true);
    try {
      const res = await fetch("/api/orders/buy-now", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId: props.listingId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start checkout.");

      const sessionRes = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: json.data.orderId }),
      });
      const sessionJson = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionJson.error ?? "Checkout unavailable.");
      window.location.href = sessionJson.data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function submitOffer() {
    setError(null);
    setInfo(null);
    if (!props.isAuthed) return router.push(`/login?callbackUrl=/marketplace`);
    const cents = Math.round(Number(offer) * 100);
    if (!cents || cents < 500) return setError("Enter a valid offer amount.");
    setBusy(true);
    const res = await fetch(`/api/listings/${props.listingId}/offers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountCents: cents }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Could not submit offer.");
    setInfo("Offer sent! The seller will respond soon.");
    setShowOffer(false);
  }

  if (props.isOwner) {
    return (
      <p className="rounded-lg bg-fairway-50 p-4 text-sm text-fairway-800">
        This is your listing. Manage it from your seller dashboard.
      </p>
    );
  }

  if (!props.isActive) {
    return (
      <p className="rounded-lg bg-gray-100 p-4 text-sm text-muted">
        This listing is no longer available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {info && <p className="rounded-md bg-fairway-50 px-3 py-2 text-sm text-fairway-800">{info}</p>}
      <Button className="w-full" size="lg" onClick={buyNow} disabled={busy}>
        {busy ? "Working…" : `Buy now · ${formatCents(props.priceCents)}`}
      </Button>
      {props.allowOffers && !showOffer && (
        <Button variant="outline" className="w-full" onClick={() => setShowOffer(true)}>
          Make an offer
        </Button>
      )}
      {showOffer && (
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={
              props.minOfferCents ? `Min ${formatCents(props.minOfferCents)}` : "Your offer ($)"
            }
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
          />
          <Button onClick={submitOffer} disabled={busy}>
            Send
          </Button>
        </div>
      )}
    </div>
  );
}
