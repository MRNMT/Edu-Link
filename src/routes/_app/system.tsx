import { createFileRoute } from "@tanstack/react-router";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_app/system")({ component: SystemPage });

function SystemPage() {
  return (
    <div className="min-h-screen">
      <ConsoleHeader title="System Admin · Multi-tenant Operations" subtitle="System Admin" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <ComingSoon
          phase="Phase 3"
          title="Tenant control plane"
          features={[
            "Onboard new schools after KYC",
            "Isolate school data partitions during incidents",
            "Compliance audits across tenants",
            "Rotate encryption keys",
            "Datadog / Sentry monitoring dashboards",
          ]}
        />
      </main>
    </div>
  );
}
