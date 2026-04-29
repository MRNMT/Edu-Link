import { Building2, MoreVertical } from "lucide-react";

interface School {
  id: string;
  name: string;
  code: string;
  user_count?: number;
  created_at: string;
}

export function SchoolsManagement({ schools }: { schools: School[] }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Schools & Districts</h2>
        </div>
        <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold uppercase text-primary-foreground transition hover:bg-primary/90">
          + Add School
        </button>
      </div>

      {schools.length === 0 ? (
        <div className="rounded-md border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No schools configured yet.
        </div>
      ) : (
        <div className="space-y-2">
          {schools.map((school) => (
            <div
              key={school.id}
              className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-4"
            >
              <div className="flex-1">
                <div className="font-semibold">{school.name}</div>
                <div className="text-xs text-muted-foreground">
                  Code: <span className="font-mono">{school.code}</span> ·{" "}
                  {school.user_count || 0} users
                </div>
              </div>
              <button className="rounded p-2 text-muted-foreground transition hover:bg-muted">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
