import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/authz";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/listings/pending", "Review queue"],
  ["/admin/users", "Users"],
  ["/admin/sellers", "Sellers"],
  ["/admin/orders", "Orders"],
  ["/admin/disputes", "Disputes"],
  ["/admin/reports", "Reports"],
  ["/admin/audit-logs", "Audit logs"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (!isAdmin(user)) redirect("/");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="rounded-md bg-ink px-2 py-1 text-xs font-bold text-white">ADMIN</span>
        <nav className="flex flex-wrap gap-1 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-1.5 hover:bg-fairway-50">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
