import Link from "next/link";
import { getCurrentUser } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/primitives";
import { CheckCircle2, Circle } from "lucide-react";

export default async function SellPage() {
  const user = await getCurrentUser();
  const sp = user?.sellerProfile;

  const steps = [
    { label: "Verify your email", done: Boolean(user?.emailVerified) },
    { label: "Verify your phone", done: Boolean(user?.phoneVerified) },
    { label: "Create a seller profile", done: Boolean(sp) },
    { label: "Complete Stripe onboarding", done: Boolean(sp?.onboardingComplete) },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold text-ink">Start selling on MullAgain</h1>
      <p className="mt-2 text-muted">
        Turn your old clubs into cash. We take a small platform fee and handle payments, payouts,
        and buyer protection through Stripe — you just ship the gear.
      </p>

      <Card className="mt-8">
        <CardBody>
          <h2 className="mb-4 font-semibold text-ink">Your seller checklist</h2>
          <ul className="space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3">
                {s.done ? (
                  <CheckCircle2 className="h-5 w-5 text-fairway-600" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
                <span className={s.done ? "text-ink" : "text-muted"}>{s.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {!user ? (
              <Link href="/signup">
                <Button>Create an account</Button>
              </Link>
            ) : !user.emailVerified ? (
              <Link href="/verify-email">
                <Button>Verify your email</Button>
              </Link>
            ) : !user.phoneVerified ? (
              <Link href="/verify-phone">
                <Button>Verify your phone</Button>
              </Link>
            ) : sp?.onboardingComplete ? (
              <Link href="/seller/listings/new">
                <Button>Create your first listing</Button>
              </Link>
            ) : (
              <Link href="/seller/onboarding">
                <Button>Continue onboarding</Button>
              </Link>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
