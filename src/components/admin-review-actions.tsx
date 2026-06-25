"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function AdminReviewActions({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    const reason =
      action === "reject" ? window.prompt("Reason for rejection (optional):") ?? undefined : undefined;
    const res = await fetch(`/api/admin/listings/${listingId}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else {
      const j = await res.json();
      alert(j.error ?? "Action failed.");
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => act("approve")} disabled={busy}>
        Approve
      </Button>
      <Button size="sm" variant="destructive" onClick={() => act("reject")} disabled={busy}>
        Reject
      </Button>
    </div>
  );
}
