import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/primitives";
import { AdminUserActions } from "@/components/admin-user-actions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const statusColor: Record<string, "green" | "amber" | "red" | "gray"> = {
  ACTIVE: "green",
  SUSPENDED: "amber",
  BANNED: "red",
  DELETED: "gray",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { sellerProfile: { select: { sellerTier: true, totalSales: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Users</h1>
        <form action="/admin/users">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search email / name / username"
            className="h-9 w-72 rounded-lg border border-[var(--border)] px-3 text-sm"
          />
        </form>
      </div>
      <Card className="divide-y divide-[var(--border)]">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {u.name ?? u.username ?? "—"}{" "}
                <span className="text-xs text-muted">{u.email}</span>
              </p>
              <p className="text-xs text-muted">
                {u.role}
                {u.sellerProfile
                  ? ` · seller (${u.sellerProfile.sellerTier}, ${u.sellerProfile.totalSales} sales)`
                  : ""}
                {u.emailVerified ? " · email✓" : ""}
                {u.phoneVerified ? " · phone✓" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge color={statusColor[u.accountStatus]}>{u.accountStatus.toLowerCase()}</Badge>
              {u.role !== "SUPER_ADMIN" && <AdminUserActions userId={u.id} status={u.accountStatus} />}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
