"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function SellerOfferActions({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function call(path: string, body?: object) {
    setBusy(true);
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Action failed.");
  }

  function counter() {
    const dollars = window.prompt("Counter amount ($):");
    if (!dollars) return;
    const amountCents = Math.round(Number(dollars) * 100);
    if (!amountCents || amountCents < 500) return alert("Enter a valid amount.");
    void call(`/api/offers/${offerId}/counter`, { amountCents });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => call(`/api/offers/${offerId}/accept`)} disabled={busy}>
        Accept
      </Button>
      <Button size="sm" variant="outline" onClick={counter} disabled={busy}>
        Counter
      </Button>
      <Button size="sm" variant="destructive" onClick={() => call(`/api/offers/${offerId}/reject`)} disabled={busy}>
        Reject
      </Button>
    </div>
  );
}
