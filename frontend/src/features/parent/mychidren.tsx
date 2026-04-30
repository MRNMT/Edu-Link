import { useEffect, useState } from "react";
import { useAppDispatch } from "@/store";
import { useNavigate } from "@tanstack/react-router";
import { enterChildModeThunk } from "@/store/slices/childModeSlice";
import { ParentLayout } from "@/features/parent/layout";
import { localApi, type Child } from "@/lib/localApi";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

const colors = ["bg-blue-100", "bg-yellow-100", "bg-green-100", "bg-purple-100", "bg-red-100", "bg-pink-100"];

export default function ParentMyChildrenPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const rows = await localApi.children.myParentChildren();
      setChildren(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load children");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChildren();
  }, []);

  const switchToChild = async (childId: string) => {
    const result = await dispatch(enterChildModeThunk({ childId }) as any);
    if (result.meta.requestStatus === "fulfilled") {
      navigate({ to: "/child-mode" });
    }
  };

  const getColorClass = (index: number) => colors[index % colors.length];
  const getTextColorClass = (index: number) => {
    const textColors = ["text-blue-700", "text-yellow-700", "text-green-700", "text-purple-700", "text-red-700", "text-pink-700"];
    return textColors[index % textColors.length];
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "At School":
        return "bg-blue-100 text-blue-700";
      case "Picked Up":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <ParentLayout title="My Children">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">My Children</h1>
        <p className="mt-1 text-sm text-muted-foreground">Switch to child mode or view each child's statistics</p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center text-muted-foreground">
          Loading children...
        </div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-slate-50 p-8 text-center text-muted-foreground">
          No linked children found. Link a child to get started.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {children.map((child, index) => (
            <div key={child.id} className="rounded-xl border border-border bg-white p-6 shadow-sm">
              {/* Child Card Header */}
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full font-bold text-xl ${getColorClass(index)} ${getTextColorClass(index)}`}>
                    {child.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-navy">{child.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {child.grade} · {child.class_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="mb-6 grid grid-cols-3 gap-3 border-t border-border pt-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-navy">{child.attendance_percent}%</div>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-navy">{child.homework_pending}</div>
                  <p className="text-xs text-muted-foreground">HW Pending</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-navy">{child.avg_score}%</div>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              </div>

              {/* Enter Child Mode Button */}
              <button
                type="button"
                className="mb-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2 text-xs font-semibold text-white hover:bg-teal-600"
                onClick={() => void switchToChild(child.id)}
              >
                <ArrowRight className="h-4 w-4" />
                Enter Child Mode
              </button>

              {/* Details Section */}
              <div className="border-t border-border pt-4">
                <h4 className="mb-3 text-sm font-bold text-navy">{child.full_name} — Details</h4>
                <div className="space-y-2 text-sm">
                  {child.student_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Student ID:</span>
                      <span className="font-semibold text-navy">{child.student_id}</span>
                    </div>
                  )}
                  {child.teacher_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Class Teacher:</span>
                      <span className="font-semibold text-navy">{child.teacher_name}</span>
                    </div>
                  )}
                  {child.school_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">School:</span>
                      <span className="font-semibold text-navy">{child.school_name}</span>
                    </div>
                  )}
                  {child.current_status && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Status:</span>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(child.current_status)}`}>
                        {child.current_status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ParentLayout>
  );
}
