"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function AdminReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function resolve(status: "ACTION_TAKEN" | "DISMISSED") {
    const note = window.prompt("Note (optional):") ?? undefined;
    setBusy(true);
    const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Action failed.");
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => resolve("ACTION_TAKEN")} disabled={busy}>
        Action taken
      </Button>
      <Button size="sm" variant="outline" onClick={() => resolve("DISMISSED")} disabled={busy}>
        Dismiss
      </Button>
    </div>
  );
}
