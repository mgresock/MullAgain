import { ShieldCheck, Truck, Scale, RotateCcw } from "lucide-react";
import { Card, CardBody } from "@/components/ui/primitives";

export const metadata = { title: "Buyer Protection — MullAgain" };

const points = [
  { icon: ShieldCheck, title: "Protected payments", body: "Your payment is held securely via Stripe and only released to the seller after you receive your item." },
  { icon: Truck, title: "Tracked shipping", body: "Every shipped order includes a tracking number so you always know where your gear is." },
  { icon: RotateCcw, title: "Not as described?", body: "Open a dispute within the protection window if your item arrives damaged, counterfeit, wrong, or never shows up." },
  { icon: Scale, title: "Human review", body: "Our team reviews disputes with the order, payment, shipment, and message history before deciding — including full or partial refunds." },
];

export default function BuyerProtectionPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold text-ink">MullAgain Buyer Protection</h1>
      <p className="mt-3 text-muted">
        Shop used golf gear with confidence. Here’s how we keep every purchase safe.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {points.map((p) => (
          <Card key={p.title}>
            <CardBody>
              <p.icon className="h-6 w-6 text-fairway-600" />
              <h2 className="mt-2 font-semibold text-ink">{p.title}</h2>
              <p className="mt-1 text-sm text-muted">{p.body}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <div className="mt-8 rounded-xl bg-fairway-50 p-5 text-sm text-fairway-800">
        <strong>Keep it on MullAgain.</strong> Protection only applies to orders paid through the
        platform. We block off-platform payment requests (Venmo, Cash App, wires) in messages for
        your safety — anyone asking you to pay outside MullAgain is a red flag you can report.
      </div>
    </div>
  );
}
