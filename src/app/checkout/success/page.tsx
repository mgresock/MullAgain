import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CheckoutSuccess({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-fairway-600" />
      <h1 className="mt-4 text-2xl font-bold text-ink">Payment received</h1>
      <p className="mt-2 text-muted">
        Thanks for your order{order ? ` (#${order.slice(-8)})` : ""}. We&apos;ve notified the seller
        to ship your item. You&apos;re covered by buyer protection until you confirm delivery.
      </p>
      <p className="mt-1 text-xs text-muted">
        Your order is confirmed once our payment webhook processes — it updates automatically.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/dashboard/purchases">
          <Button>View my purchases</Button>
        </Link>
        <Link href="/marketplace">
          <Button variant="outline">Keep shopping</Button>
        </Link>
      </div>
    </div>
  );
}
