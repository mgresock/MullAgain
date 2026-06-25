"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function AdminUserActions({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(accountStatus: "ACTIVE" | "SUSPENDED" | "BANNED") {
    const reason =
      accountStatus !== "ACTIVE" ? window.prompt(`Reason for ${accountStatus.toLowerCase()}:`) ?? undefined : undefined;
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountStatus, reason }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Action failed.");
  }

  if (status === "ACTIVE") {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setStatus("SUSPENDED")} disabled={busy}>
          Suspend
        </Button>
        <Button size="sm" variant="destructive" onClick={() => setStatus("BANNED")} disabled={busy}>
          Ban
        </Button>
      </div>
    );
  }
  return (
    <Button size="sm" onClick={() => setStatus("ACTIVE")} disabled={busy}>
      Reinstate
    </Button>
  );
}
