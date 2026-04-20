import { createFileRoute } from "@tanstack/react-router";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

function AdminPage() {
  return (
    <div className="min-h-screen">
      <ConsoleHeader title="School Admin Console" subtitle="School Admin" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <ComingSoon
          phase="Phase 2"
          title="School operations console"
          features={[
            "Onboarding wizard for learners + parent linking",
            "Daily attendance review across classes",
            "Delegate guardian approval queue",
            "Freeze suspicious parent accounts",
            "Audit log export (CSV)",
            "Teacher account management",
          ]}
        />
      </main>
    </div>
  );
}
