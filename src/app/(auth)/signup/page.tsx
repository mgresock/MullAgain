import { isGoogleAuthConfigured } from "@/lib/env";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return <SignupForm googleEnabled={isGoogleAuthConfigured()} />;
}
