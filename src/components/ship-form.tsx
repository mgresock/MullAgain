"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/primitives";

export function ShipForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState("USPS");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (tracking.length < 3) return;
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/ship`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ carrier, trackingNumber: tracking }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else alert((await res.json()).error ?? "Failed.");
  }

  if (!open)
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Add tracking & ship
      </Button>
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        className="h-8 rounded-md border px-2 text-sm"
      >
        {["USPS", "UPS", "FedEx", "DHL"].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <Input
        className="h-8 w-44"
        placeholder="Tracking #"
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
      />
      <Button size="sm" onClick={submit} disabled={busy}>
        Ship
      </Button>
    </div>
  );
}
