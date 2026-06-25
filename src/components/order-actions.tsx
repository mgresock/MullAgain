"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function ConfirmDeliveryButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/confirm-delivery`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Failed.");
  }
  return (
    <Button size="sm" onClick={go} disabled={busy}>
      Confirm delivery
    </Button>
  );
}

export function OpenDisputeButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    const description = window.prompt("Describe the problem (min 10 characters):");
    if (!description || description.length < 10) return;
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/dispute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "ITEM_NOT_AS_DESCRIBED", description }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Failed.");
  }
  return (
    <Button size="sm" variant="outline" onClick={go} disabled={busy}>
      Open dispute
    </Button>
  );
}
