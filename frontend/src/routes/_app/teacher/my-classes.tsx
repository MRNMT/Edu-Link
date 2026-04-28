import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppSelector } from "@/store";
import { localApi, type Child } from "@/lib/localApi";
import { toast } from "sonner";

function MyClassesPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;
    void (async () => {
      try {
        setLoading(true);
        const schoolChildren = await localApi.children.schoolChildren(sid);
        setChildren(schoolChildren);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load classes");
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.school_id]);

  const classes = Array.from(
    new Map(
      Array.from(new Set(children.map((c) => c.class_name)))
        .map((cn) => [cn, children.filter((c) => c.class_name === cn)])
    ).entries()
  ).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="My Classes" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="panel p-6 text-sm text-muted-foreground">Loading classes…</div>
        ) : classes.length === 0 ? (
          <div className="panel p-6 text-sm text-muted-foreground">No classes found.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map(([className, classChildren]) => (
              <div key={className} className="panel p-4">
                <h3 className="text-lg font-semibold">Class {className}</h3>
                <div className="mt-2 text-sm text-muted-foreground">{classChildren.length} students</div>
                <div className="mt-4 space-y-1 text-xs">
                  {classChildren.slice(0, 5).map((child) => (
                    <div key={child.id} className="text-muted-foreground">
                      • {child.full_name}
                    </div>
                  ))}
                  {classChildren.length > 5 && (
                    <div className="text-muted-foreground">• +{classChildren.length - 5} more</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export const Route = createFileRoute("/_app/teacher/my-classes")({
  component: MyClassesPage,
});

export default Route;
