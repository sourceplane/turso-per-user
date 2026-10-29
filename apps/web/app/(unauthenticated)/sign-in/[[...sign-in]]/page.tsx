import { SignIn } from "@clerk/nextjs";

import { ConnectClerk } from "@/app/_components/not-connected";
import { clerkConnected } from "@/lib/clerk";

export default function Page() {
  if (!clerkConnected) return <ConnectClerk />;
  return <SignIn path="/sign-in" fallbackRedirectUrl="/welcome" />;
}
