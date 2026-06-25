import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutCancel() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <XCircle className="mx-auto h-14 w-14 text-muted" />
      <h1 className="mt-4 text-2xl font-bold text-ink">Checkout cancelled</h1>
      <p className="mt-2 text-muted">
        No payment was taken. The reservation on this item will expire shortly if you don&apos;t
        complete checkout.
      </p>
      <div className="mt-6">
        <Link href="/marketplace">
          <Button>Back to marketplace</Button>
        </Link>
      </div>
    </div>
  );
}
