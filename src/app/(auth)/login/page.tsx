import { Suspense } from "react";
import { isGoogleAuthConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm googleEnabled={isGoogleAuthConfigured()} />
    </Suspense>
  );
}
