import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/primitives";
import { AdminReportActions } from "@/components/admin-report-actions";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    include: {
      reporter: { select: { email: true } },
      reportedUser: { select: { email: true } },
      listing: { select: { title: true, slug: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink">Reports</h1>
      <p className="mb-6 text-sm text-muted">{reports.length} open report(s).</p>
      {reports.length === 0 ? (
        <Card className="p-10 text-center text-muted">No open reports. 🎉</Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{r.reason}</p>
                <p className="text-xs text-muted">
                  by {r.reporter.email}
                  {r.reportedUser ? ` · against ${r.reportedUser.email}` : ""}
                  {r.listing ? (
                    <>
                      {" · "}
                      <Link href={`/marketplace/${r.listing.slug}`} className="hover:underline">
                        {r.listing.title}
                      </Link>
                    </>
                  ) : null}
                </p>
                {r.description && <p className="mt-1 text-sm">{r.description}</p>}
              </div>
              <AdminReportActions reportId={r.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
