"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "./ui/button";

export function ListingManageActions({
  listingId,
  canEdit,
}: {
  listingId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Remove this listing?")) return;
    setBusy(true);
    const res = await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Could not remove.");
  }

  return (
    <div className="flex gap-2">
      {canEdit && (
        <Link href={`/seller/listings/${listingId}/edit`}>
          <Button size="sm" variant="outline">
            Edit
          </Button>
        </Link>
      )}
      <Button size="sm" variant="destructive" onClick={remove} disabled={busy}>
        Remove
      </Button>
    </div>
  );
}
