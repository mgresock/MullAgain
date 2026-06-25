import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { Card, Badge } from "@/components/ui/primitives";
import { AdminDisputeActions } from "@/components/admin-dispute-actions";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  const disputes = await prisma.dispute.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: {
      order: {
        include: {
          listing: { select: { title: true } },
          buyer: { select: { email: true } },
          seller: { select: { email: true } },
        },
      },
      evidence: { select: { evidenceType: true, content: true, fileUrl: true, createdAt: true } },
    },
  });

  const open = disputes.filter((d) => !["CLOSED", "RESOLVED_SELLER", "RESOLVED_BUYER", "REFUNDED"].includes(d.status));
  const closed = disputes.filter((d) => ["CLOSED", "RESOLVED_SELLER", "RESOLVED_BUYER", "REFUNDED"].includes(d.status));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Disputes</h1>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Open ({open.length})
      </h2>
      <div className="space-y-3">
        {open.length === 0 && <Card className="p-6 text-center text-muted">No open disputes.</Card>}
        {open.map((d) => (
          <Card key={d.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{d.order.listing.title}</p>
                <p className="text-xs text-muted">
                  {d.reason.replace(/_/g, " ").toLowerCase()} · {d.order.buyer.email} vs{" "}
                  {d.order.seller.email} · order {formatCents(d.order.totalCents)}
                </p>
                <p className="mt-1 text-sm">{d.description}</p>
                {d.evidence.length > 0 && (
                  <p className="mt-1 text-xs text-muted">{d.evidence.length} evidence item(s) submitted</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge color="amber">{d.status.replace(/_/g, " ").toLowerCase()}</Badge>
                <AdminDisputeActions disputeId={d.id} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {closed.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">
            Resolved ({closed.length})
          </h2>
          <Card className="divide-y divide-[var(--border)]">
            {closed.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <span>{d.order.listing.title}</span>
                <Badge color="green">{d.status.replace(/_/g, " ").toLowerCase()}</Badge>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
