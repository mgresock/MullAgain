import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/primitives";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string }>;
}) {
  const { action, entityType } = await searchParams;
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    ...(entityType ? { entityType } : {}),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { email: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Audit logs</h1>
        <form action="/admin/audit-logs" className="flex gap-2">
          <input
            name="action"
            defaultValue={action ?? ""}
            placeholder="Filter by action"
            className="h-9 w-56 rounded-lg border border-[var(--border)] px-3 text-sm"
          />
        </form>
      </div>
      <Card className="divide-y divide-[var(--border)] text-sm">
        {logs.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <span className="font-mono font-medium text-fairway-700">{l.action}</span>{" "}
              <span className="text-muted">
                {l.entityType}
                {l.entityId ? `#${l.entityId.slice(-6)}` : ""}
              </span>
            </div>
            <div className="text-xs text-muted">
              {l.actor?.email ?? "system"} · {new Date(l.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="p-6 text-center text-muted">No audit entries.</p>}
      </Card>
    </div>
  );
}
