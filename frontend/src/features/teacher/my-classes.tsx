import { useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppSelector } from "@/store";
import { localApi, type Child } from "@/lib/localApi";
import { toast } from "sonner";
import { Users, TrendingUp, Award } from "lucide-react";

export default function TeacherMyClassesPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [children, setChildren] = useState<Child[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;
    void (async () => {
      try {
        setLoading(true);
        const [schoolChildren, teacherClassRows] = await Promise.all([
          localApi.children.schoolChildren(sid),
          localApi.ops.teacher.classes(),
        ]);
        const classNames = teacherClassRows.map((entry) => entry.class_name);
        setAssignedClasses(classNames);
        setChildren(schoolChildren.filter((child) => classNames.includes(child.class_name)));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load classes");
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.school_id]);

  const classes = Array.from(
    new Map(assignedClasses.map((cn) => [cn, children.filter((c) => c.class_name === cn)])).entries(),
  ).sort((a, b) => a[0].localeCompare(b[0]));

  const selectedClassData = classes.find(([cn]) => cn === selectedClass);
  const selectedStudents = selectedClassData ? selectedClassData[1] : [];

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="My Classes" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">My Classes</h2>
          <div className="text-sm text-muted-foreground">{classes.length} classes</div>
        </div>

        {loading ? (
          <div className="panel p-6 text-sm text-muted-foreground">Loading classes…</div>
        ) : classes.length === 0 ? (
          <div className="panel p-6 text-sm text-muted-foreground">No classes found.</div>
        ) : (
          <div className="grid gap-6">
            {selectedClass === null ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classes.map(([className, classChildren]) => (
                  <div
                    key={className}
                    onClick={() => setSelectedClass(className)}
                    className="panel p-5 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition"
                  >
                    <h3 className="text-lg font-semibold mb-3">Class {className}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{classChildren.length} students</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span>Average grade: {classChildren.length > 0 ? "—" : "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Award className="h-4 w-4 text-amber-500" />
                        <span>Attendance rate: —</span>
                      </div>
                    </div>
                    <button className="mt-4 w-full rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition">
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <button
                  onClick={() => setSelectedClass(null)}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
                >
                  ← Back to Classes
                </button>

                <div className="panel p-6">
                  <h3 className="text-2xl font-bold mb-2">Class {selectedClass}</h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <div className="text-2xl font-bold text-blue-600">{selectedStudents.length}</div>
                      <div className="text-xs text-muted-foreground">Total Students</div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <div className="text-2xl font-bold text-green-600">—</div>
                      <div className="text-xs text-muted-foreground">Avg Attendance</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <div className="text-2xl font-bold text-amber-600">—</div>
                      <div className="text-xs text-muted-foreground">Avg Performance</div>
                    </div>
                  </div>

                  <h4 className="text-lg font-semibold mb-3">Enrolled Students</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="text-left p-3 font-semibold">Name</th>
                          <th className="text-left p-3 font-semibold">Grade</th>
                          <th className="text-left p-3 font-semibold">School</th>
                          <th className="text-center p-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudents.map((student) => (
                          <tr key={student.id} className="border-b hover:bg-muted/50 transition last:border-b-0">
                            <td className="p-3 font-medium">{student.full_name}</td>
                            <td className="p-3 text-muted-foreground">{student.grade || "—"}</td>
                            <td className="p-3 text-muted-foreground text-xs">{student.school_id}</td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-success/20 text-success">
                                Active
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <button className="px-4 py-2.5 rounded-md border border-border hover:bg-muted transition font-semibold text-sm">
                      Send Class Message
                    </button>
                    <button className="px-4 py-2.5 rounded-md border border-border hover:bg-muted transition font-semibold text-sm">
                      View Attendance Report
                    </button>
                    <button className="px-4 py-2.5 rounded-md border border-border hover:bg-muted transition font-semibold text-sm">
                      Export Class List
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
