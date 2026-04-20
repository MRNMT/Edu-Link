import { createFileRoute } from "@tanstack/react-router";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_app/delegate")({ component: DelegatePage });

function DelegatePage() {
  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Delegate Guardian Console" subtitle="Delegate" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <ComingSoon
          phase="Phase 2"
          title="Delegate pickup access"
          features={[
            "SMS one-time token onboarding (Twilio)",
            "Drop-off QR before first break",
            "Pickup QR after last class · 30 min validity",
            "Auto-revoke when parent withdraws delegate",
          ]}
        />
      </main>
    </div>
  );
}
