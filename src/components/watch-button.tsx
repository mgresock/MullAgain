"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function WatchButton({
  listingId,
  initialWatching,
  isAuthed,
}: {
  listingId: string;
  initialWatching: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [watching, setWatching] = useState(initialWatching);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!isAuthed) return router.push("/login?callbackUrl=/marketplace");
    setBusy(true);
    const res = await fetch(`/api/listings/${listingId}/watch`, {
      method: watching ? "DELETE" : "POST",
    });
    setBusy(false);
    if (res.ok) setWatching((w) => !w);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium transition hover:bg-fairway-50",
        watching && "border-fairway-400 text-fairway-700",
      )}
    >
      <Heart className={cn("h-4 w-4", watching && "fill-fairway-600 text-fairway-600")} />
      {watching ? "Watching" : "Add to watchlist"}
    </button>
  );
}
