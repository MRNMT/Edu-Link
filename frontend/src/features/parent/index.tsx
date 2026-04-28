import { useAppDispatch, useAppSelector } from "@/store";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { localApi, type ParentDashboardOverview } from "@/lib/localApi";
import { enterChildModeThunk } from "@/store/slices/childModeSlice";
import { logoutThunk } from "@/store/slices/authSlice";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type FeedTab = "homework" | "notifications";

export default function ParentDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);
  const [overview, setOverview] = useState<ParentDashboardOverview | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>("homework");
  const [childPickerOpen, setChildPickerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [absenceForm, setAbsenceForm] = useState({
    child_id: "",
    reason: "",
    attendance_date: new Date().toISOString().slice(0, 10),
  });
  const [deletionReason, setDeletionReason] = useState("");

  const loadDashboard = async () => {
    if (!user) return;
    try {
      const data = await localApi.ops.parent.dashboard();
      setOverview(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load parent dashboard");
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [user]);

  useEffect(() => {
    if (!absenceForm.child_id && overview?.children?.[0]) {
      setAbsenceForm((current) => ({ ...current, child_id: overview.children[0].id }));
    }
  }, [overview, absenceForm.child_id]);

  const children = overview?.children ?? [];
  const homework = overview?.homework ?? [];
  const notifications = overview?.notifications ?? [];
  const parentName = overview?.parent_name ?? profile?.full_name ?? user?.full_name ?? "Guardian";
  const unreadNotifications = overview?.unread_notification_count ?? notifications.filter((item) => !item.read_at).length;
  const activeDelegates = overview?.active_delegate_count ?? 0;
  const unreadHomework = homework.filter((item) => !item.read_at).length;
  const feedItems = activeTab === "homework" ? homework : notifications;

  const enterChildMode = async (targetChild: { id: string }) => {
    const res = await dispatch(
      enterChildModeThunk({
        childId: targetChild.id,
      }) as any,
    );

    if (res.meta.requestStatus === "fulfilled") {
      navigate({ to: "/child-mode" });
    }
  };

  const goToChildMode = async () => {
    if (children.length === 0) {
      toast.error("No linked child found", {
        description: "Link at least one child before handing over this device.",
      });
      return;
    }

    if (children.length > 1) {
      setChildPickerOpen(true);
      return;
    }

    await enterChildMode(children[0]);
  };

  const doLogout = async () => {
    await dispatch(logoutThunk());
    navigate({ to: "/login" });
  };

  const scrollToSection = (sectionId: string, sectionKey: string) => {
    setActiveSection(sectionKey);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const markHomeworkRead = async (homeworkId: string) => {
    await localApi.ops.parent.markHomeworkRead(homeworkId);
    await loadDashboard();
  };

  return (
    <div id="app" className="active">
      <div className="sidebar" id="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z" fill="rgba(255,255,255,0.85)" />
              <circle cx="12" cy="11" r="3" fill="#0e2a52" />
              <path d="M8 19c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#0e2a52" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M15 8l1.5 1.5L13 13" stroke="#26b8a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="sb-logo-text">EduSecure-<span>Link</span></div>
        </div>
        <div className="sb-user" id="sb-user">
          <div className="sb-avatar" id="sb-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
          </div>
          <div>
            <div className="sb-uname" id="sb-name">{parentName}</div>
            <div className="sb-urole" id="sb-role">GUARDIAN</div>
          </div>
        </div>

        <nav className="sb-nav" id="sb-nav">
          <div className="sb-section-lbl">Main</div>
          <button type="button" className={`nav-item ${activeSection === "dashboard" ? "active" : ""}`} onClick={() => scrollToSection("main-content", "dashboard")}>
            <div className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
            </div>
            Dashboard
          </button>
          <button type="button" className={`nav-item ${activeSection === "children" ? "active" : ""}`} onClick={() => scrollToSection("children-section", "children")}>
            <div className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="9" cy="7" r="4" /><path d="M2 19c0-4 3.1-7 7-7" /><circle cx="18" cy="8" r="3" /><path d="M14 19c0-3.3 2.7-6 6-6" strokeDasharray="3 2" /></svg>
            </div>
            My Children
          </button>
          <button type="button" className={`nav-item ${activeSection === "attendance" ? "active" : ""}`} onClick={() => scrollToSection("absence-section", "attendance")}>
            <div className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" /></svg>
            </div>
            Attendance
          </button>
          <button type="button" className={`nav-item ${activeSection === "homework" ? "active" : ""}`} onClick={() => {
            setActiveTab("homework");
            scrollToSection("feed-section", "homework");
          }}>
            <div className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" /></svg>
            </div>
            Homework
            <div className="nav-badge">{unreadHomework}</div>
          </button>

          <div className="sb-section-lbl" style={{ marginTop: 8 }}>Communication</div>
          <button type="button" className={`nav-item ${activeSection === "notifications" ? "active" : ""}`} onClick={() => {
            setActiveTab("notifications");
            scrollToSection("feed-section", "notifications");
          }}>
            <div className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
            </div>
            Notifications
            <div className="nav-badge">{unreadNotifications}</div>
          </button>
          <button type="button" className={`nav-item ${activeSection === "messages" ? "active" : ""}`} onClick={() => scrollToSection("feed-section", "messages")}>
            <div className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
            </div>
            Messages
          </button>
          <button type="button" className={`nav-item ${activeSection === "absence-section" ? "active" : ""}`} onClick={() => scrollToSection("absence-section", "absence-section")}>
            <div className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" /></svg>
            </div>
            Absences
          </button>
          <button type="button" className={`nav-item ${activeSection === "account" ? "active" : ""}`} onClick={() => scrollToSection("deletion-section", "account")}>
            <div className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
            </div>
            Account Settings
          </button>
        </nav>
        <div className="sb-bottom">
          <button type="button" className="btn-signout" onClick={doLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Sign Out
          </button>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-title" id="topbar-title">Dashboard</div>
              <div className="topbar-crumb" id="topbar-crumb">EduSecure-Link / Dashboard</div>
            </div>
          </div>
          <div className="topbar-right">
            <div style={{ textAlign: "right" }}>
              <div className="tb-username">{parentName}</div>
              <div className="tb-role">Guardian</div>
            </div>
            <div className="tb-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
            </div>
            <button type="button" className="btn-tb-signout" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>
              <span className="text-[10px] font-bold">DARK</span>
            </button>
            <button type="button" className="btn-tb-signout" onClick={doLogout}>Sign Out</button>
          </div>
        </div>

        <div className="content" id="main-content">
          <div className="welcome-banner wb-default" style={{ background: "var(--teal)", color: "white", padding: "30px", borderRadius: "16px", marginBottom: "20px" }}>
            <div className="wb-inner">
              <div className="wb-h text-2xl font-bold" style={{ fontSize: "24px", fontWeight: "800" }}>Good morning, {parentName}!</div>
              <div className="wb-p" style={{ marginTop: "6px", fontSize: "14px", opacity: 0.9 }}>Here is the live view from your linked school records.</div>
            </div>
          </div>

          <div className="summary-bar mb-5 flex max-w-full overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="sum-item flex flex-1 items-center gap-4 border-r border-border p-5">
              <div className="sum-icon si-teal flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="9" cy="7" r="4" /><path d="M2 19c0-4 3.1-7 7-7" /><circle cx="18" cy="8" r="3" /><path d="M14 19c0-3.3 2.7-6 6-6" strokeDasharray="3 2" /></svg>
              </div>
              <div>
                <div className="sum-val text-2xl font-extrabold text-navy">{children.length}</div>
                <div className="sum-lbl mt-1 text-xs font-semibold text-text3 text-navy/60">Children</div>
              </div>
            </div>
            <div className="sum-item flex flex-1 items-center gap-4 border-r border-border p-5">
              <div className="sum-icon si-navy flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8a2 2 0 100-4 2 2 0 000 4z" /><path d="M8.2 14.5A4.5 4.5 0 0112 11a4.5 4.5 0 013.8 3.5" /></svg>
              </div>
              <div>
                <div className="sum-val text-2xl font-extrabold text-navy">{activeDelegates}</div>
                <div className="sum-lbl mt-1 text-xs font-semibold text-text3 text-navy/60">Active Delegates</div>
              </div>
            </div>
            <div className="sum-item flex flex-1 items-center gap-4 p-5">
              <div className="sum-icon si-amber flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              </div>
              <div>
                <div className="sum-val text-2xl font-extrabold text-navy">{unreadNotifications}</div>
                <div className="sum-lbl mt-1 text-xs font-semibold text-text3 text-navy/60">New Notifications</div>
              </div>
            </div>
          </div>

          <div className="g31 grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <div id="children-section" className="card rounded-xl border border-border bg-white p-5 shadow-sm">
                <div className="card-hd mb-4 flex items-center justify-between">
                  <div className="card-title text-sm font-bold text-navy">My Children</div>
                </div>

                {children.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-navy/60">
                    No linked children were found in your school records.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {children.map((child) => (
                      <div key={child.id} className="li flex items-center gap-3 rounded-lg p-2 transition hover:bg-slate-50">
                        <div className="li-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-navy">
                          {child.full_name.trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="li-name font-bold text-navy">{child.full_name}</div>
                          <div className="li-sub text-xs text-navy/60">{child.grade} · {child.class_name}</div>
                        </div>
                        <button type="button" className="btn btn-primary btn-sm ml-2 flex items-center gap-2 rounded-lg bg-teal px-3 py-1.5 text-xs text-white hover:bg-teal-600" onClick={() => enterChildMode(child)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="9" cy="7" r="4" /><path d="M2 19c0-4 3.1-7 7-7" /><circle cx="18" cy="8" r="3" /><path d="M14 19c0-3.3 2.7-6 6-6" strokeDasharray="3 2" /></svg>
                          Enter Child Mode
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div id="feed-section" className="card rounded-xl border border-border bg-white p-5 shadow-sm">
                <div className="card-hd mb-4 flex items-center justify-between">
                  <div className="card-title text-sm font-bold text-navy">Quick Actions</div>
                </div>
                <div className="action-tiles grid grid-cols-3 gap-3">
                  <button type="button" className="action-tile flex flex-col items-center justify-center rounded-xl bg-slate-50 py-5 transition hover:bg-slate-100" onClick={goToChildMode}>
                    <div className="at-icon si-teal mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="9" cy="7" r="4" /><path d="M2 19c0-4 3.1-7 7-7" /><circle cx="18" cy="8" r="3" /><path d="M14 19c0-3.3 2.7-6 6-6" strokeDasharray="3 2" /></svg>
                    </div>
                    <div className="at-lbl text-xs font-semibold text-navy">Hand to Child</div>
                  </button>
                  <button type="button" className="action-tile flex flex-col items-center justify-center rounded-xl bg-slate-50 py-5 transition hover:bg-slate-100" onClick={() => document.getElementById("absence-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    <div className="at-icon si-amber mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" /></svg>
                    </div>
                    <div className="at-lbl text-xs font-semibold text-navy">Report Absence</div>
                  </button>
                  <button type="button" className="action-tile flex flex-col items-center justify-center rounded-xl bg-slate-50 py-5 transition hover:bg-slate-100" onClick={() => document.getElementById("deletion-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    <div className="at-icon si-navy mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-navy/5 text-navy">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                    </div>
                    <div className="at-lbl text-xs font-semibold text-navy">Messages</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="card rounded-xl border border-border bg-white p-5 shadow-sm">
                <div className="card-hd mb-4 flex items-center justify-between">
                  <div className="card-title text-sm font-bold text-navy">Live Feed</div>
                </div>
                <div className="tab-row mb-4 flex border-b border-border">
                  <button type="button" onClick={() => setActiveTab("homework")} className={`tab-btn cursor-pointer border-b-2 pb-2 pr-4 text-sm font-bold ${activeTab === "homework" ? "border-teal text-teal" : "border-transparent text-navy/60"}`}>
                    Homework ({homework.length})
                  </button>
                  <button type="button" onClick={() => setActiveTab("notifications")} className={`tab-btn cursor-pointer pb-2 pl-4 text-sm font-semibold ${activeTab === "notifications" ? "border-b-2 border-teal text-teal" : "text-navy/60"}`}>
                    Notifications ({notifications.length})
                  </button>
                </div>

                {feedItems.length === 0 ? (
                  <div className="empty-state flex flex-col items-center justify-center py-10 opacity-75">
                    <div className="empty-icon mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" /></svg>
                    </div>
                    <h3 className="text-sm font-bold text-navy">No current items</h3>
                    <p className="mt-1 text-xs text-navy/60">Nothing has been posted yet.</p>
                  </div>
                ) : activeTab === "homework" ? (
                  <div className="space-y-2">
                    {homework.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-navy">{item.title}</div>
                            <div className="text-xs text-navy/60">{item.class_name} · Due {item.due_date || "N/A"}</div>
                          </div>
                          {!item.read_at && (
                            <button type="button" className="rounded-md border border-border px-2 py-1 text-[11px] uppercase text-muted-foreground" onClick={() => markHomeworkRead(item.id)}>
                              Mark read
                            </button>
                          )}
                        </div>
                        {item.description && <div className="mt-2 text-sm text-navy/80">{item.description}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-auto pr-1">
                    {notifications.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-navy">{item.title}</div>
                            <div className="text-xs text-navy/60">{item.category} · {new Date(item.created_at).toLocaleString()}</div>
                          </div>
                          {!item.read_at && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">New</span>}
                        </div>
                        {item.body && <div className="mt-2 text-sm text-navy/80">{item.body}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div id="absence-section" className="card rounded-xl border border-border bg-white p-5 shadow-sm">
                <div className="card-title mb-4 text-sm font-bold text-navy">Report Absence Form</div>
                <form
                  className="space-y-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    try {
                      await localApi.ops.parent.reportAbsence({
                        child_id: absenceForm.child_id,
                        attendance_date: absenceForm.attendance_date,
                        reason: absenceForm.reason,
                      });
                      toast.success("Absence reported");
                      setAbsenceForm((current) => ({ ...current, reason: "" }));
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to report absence");
                    }
                  }}
                >
                  <select className="w-full rounded-lg border border-border bg-slate-50 p-2.5 text-sm text-navy outline-none focus:border-teal" value={absenceForm.child_id} onChange={(e) => setAbsenceForm((current) => ({ ...current, child_id: e.target.value }))}>
                    <option value="">Select child</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>{child.full_name}</option>
                    ))}
                  </select>
                  <input type="date" className="w-full rounded-lg border border-border bg-slate-50 p-2.5 text-sm text-navy outline-none focus:border-teal" value={absenceForm.attendance_date} onChange={(e) => setAbsenceForm((current) => ({ ...current, attendance_date: e.target.value }))} />
                  <textarea className="w-full rounded-lg border border-border bg-slate-50 p-2.5 text-sm text-navy outline-none focus:border-teal" rows={2} placeholder="Reason" value={absenceForm.reason} onChange={(e) => setAbsenceForm((current) => ({ ...current, reason: e.target.value }))} />
                  <button type="submit" className="w-full rounded-lg bg-warning px-4 py-2 text-xs font-semibold uppercase tracking-wider text-warning-foreground">Report</button>
                </form>
              </div>

              <div id="deletion-section" className="card rounded-xl border border-border bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-lg font-semibold">Request Data Deletion</h2>
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    try {
                      await localApi.ops.parent.requestDeletion({ reason: deletionReason });
                      toast.success("Deletion request submitted");
                      setDeletionReason("");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to submit deletion request");
                    }
                  }}
                >
                  <input className="flex-1 rounded-lg border border-border bg-slate-50 p-2.5 text-sm text-navy outline-none focus:border-teal" placeholder="Optional reason" value={deletionReason} onChange={(e) => setDeletionReason(e.target.value)} />
                  <button type="submit" className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white">Submit</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={childPickerOpen} onOpenChange={setChildPickerOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose a child</DialogTitle>
              <DialogDescription>Select which child should receive the device session.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {children.map((child) => (
                <button key={child.id} type="button" className="flex w-full items-center justify-between rounded-lg border border-border bg-slate-50 px-3 py-2 text-left text-sm text-navy hover:bg-slate-100" onClick={async () => {
                  await enterChildMode(child);
                  setChildPickerOpen(false);
                }}>
                  <span>{child.full_name}</span>
                  <span className="text-xs text-navy/60">{child.class_name}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
