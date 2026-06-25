"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

const OUTCOMES: { value: string; label: string }[] = [
  { value: "REFUNDED", label: "Refund buyer" },
  { value: "RESOLVED_BUYER", label: "Resolve for buyer (refund)" },
  { value: "RESOLVED_SELLER", label: "Resolve for seller" },
  { value: "NEEDS_SELLER_RESPONSE", label: "Request seller response" },
  { value: "NEEDS_BUYER_RESPONSE", label: "Request buyer response" },
  { value: "CLOSED", label: "Close" },
];

export function AdminDisputeActions({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("REFUNDED");
  const [busy, setBusy] = useState(false);

  async function resolve() {
    const resolution = window.prompt("Resolution note (optional):") ?? undefined;
    setBusy(true);
    const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outcome, resolution }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Action failed.");
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        className="h-8 rounded-md border px-2 text-sm"
      >
        {OUTCOMES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Button size="sm" onClick={resolve} disabled={busy}>
        Apply
      </Button>
    </div>
  );
}
