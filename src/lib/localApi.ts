import { Platform } from "react-native";

export type AppRole =
  | "parent"
  | "teacher"
  | "school_admin"
  | "delegate"
  | "system_admin"
  | "gate_security";

export interface LocalUser {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  school_id: string | null;
}

export interface LocalProfile {
  id: string;
  full_name: string;
  phone: string | null;
  school_id: string | null;
  frozen_at?: string | null;
  frozen_by?: string | null;
  frozen_reason?: string | null;
}

export interface LocalSession {
  access_token: string;
  user: LocalUser;
  profile: LocalProfile;
  roles: AppRole[];
}

export interface Child {
  id: string;
  full_name: string;
  class_name: string;
  grade: string;
  school_id: string | null;
}

export interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  class_name: string;
  due_date: string | null;
  attachment_url: string | null;
  created_at: string;
  read_at?: string | null;
  read_count?: number;
}

export interface NotificationItem {
  id: string;
  category: "homework" | "class_alert" | "delegate" | "security" | "system";
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface ParentDashboardOverview {
  parent_name: string | null;
  children: Child[];
  homework: HomeworkItem[];
  notifications: NotificationItem[];
  active_delegate_count: number;
  unread_notification_count: number;
}

export interface ParentAttendanceRow {
  child_id: string;
  full_name: string;
  class_name: string;
  grade: string;
  attendance_date: string | null;
  status: "present" | "absent" | "late" | "excused" | null;
  reason: string | null;
  marked_by: string | null;
}

export interface ParentTeacherContact {
  id: string;
  full_name: string;
  email: string;
  class_name: string;
}

export interface ParentTeacherMessage {
  id: string;
  parent_id: string;
  teacher_id: string;
  sender_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface QuizSummary {
  id: string;
  school_id: string | null;
  teacher_id: string | null;
  class_name: string;
  title: string;
  description: string | null;
  due_date: string | null;
  review_mode: "none" | "wrong_only" | "correct_only" | "both";
  question_count: number;
  attempt_count: number;
  created_at: string;
  updated_at: string;
}

export interface DelegateQueueItem {
  id: string;
  parent_id: string;
  delegate_name: string;
  phone: string | null;
  relationship: string | null;
  status: "pending" | "approved" | "rejected" | "revoked" | "expired";
  approved_by: string | null;
  created_at: string;
  parent_name: string;
}

export interface PickupToken {
  id: string;
  child_id: string | null;
  code: string;
  otp: string;
  status: "active" | "used" | "expired" | "rejected";
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
  kind: "qr" | "otp";
  child?: { full_name: string; class_name: string };
}

export interface AuditEntry {
  id: string;
  school_id: string | null;
  actor_id: string | null;
  action: string;
  target: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminAttendanceClass {
  class_name: string;
  present: number;
  absent: number;
  total: number;
  learners: Array<{
    class_name: string;
    child_id: string;
    full_name: string;
    status: string;
    reason: string | null;
    marked_by: string | null;
    attendance_date: string;
  }>;
}

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000");

let storedToken: string | null = null;

export function setStoredToken(token: string | null) {
  storedToken = token;
}

function getStoredToken() {
  return storedToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.error || payload?.message || "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export const localApi = {
  baseUrl: API_BASE_URL,
  auth: {
    login: (email: string, password: string) =>
      request<LocalSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<LocalSession>("/api/auth/me"),
    logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  },
  parents: {
    dashboard: () => request<ParentDashboardOverview>("/api/ops/parent/dashboard"),
    attendance: () => request<ParentAttendanceRow[]>("/api/ops/parent/attendance"),
    homework: () => request<HomeworkItem[]>("/api/ops/parent/homework"),
    notifications: () => request<NotificationItem[]>("/api/ops/parent/notifications"),
    teachers: () => request<ParentTeacherContact[]>("/api/ops/parent/teachers"),
    messages: (teacherId: string) =>
      request<ParentTeacherMessage[]>(
        `/api/ops/parent/messages?teacherId=${encodeURIComponent(teacherId)}`,
      ),
    createDelegate: (payload: { delegate_name: string; phone: string; relationship: string }) =>
      request<{ id: string; status: string }>("/api/ops/parent/delegates", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    linkChild: (payload: { child_id: string; relationship?: string }) =>
      request<{ linked: boolean; child_id: string; relationship: string }>(
        "/api/ops/parent/link-child",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    reportAbsence: (payload: { child_id: string; attendance_date?: string; reason?: string }) =>
      request<{ child_id: string; attendance_date: string; status: string }>(
        "/api/ops/parent/absence",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
  },
  teachers: {
    quizzes: () => request<QuizSummary[]>("/api/teachers/me/quizzes"),
    children: (schoolId: string) => request<Child[]>(`/api/schools/${schoolId}/children`),
    submitAttendanceBatch: (payload: {
      attendance_date: string;
      entries: Array<{ child_id: string; status: "present" | "absent"; reason?: string | null }>;
    }) =>
      request<{ attendance_date: string; count: number }>("/api/ops/teacher/attendance/batch", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    homework: () => request<HomeworkItem[]>("/api/ops/teacher/homework"),
  },
  delegates: {
    children: () => request<Child[]>("/api/ops/delegate/children"),
    passes: () => request<PickupToken[]>("/api/passes/me"),
    createPickupPass: (payload: { child_id: string }) =>
      request<PickupToken>("/api/ops/delegate/passes", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  security: {
    passes: () => request<PickupToken[]>("/api/passes/me"),
    verify: (payload: { code?: string; otp?: string; verdict?: "approve" | "reject" }) =>
      request<PickupToken>("/api/passes/verify", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  admin: {
    delegates: (status = "pending") =>
      request<DelegateQueueItem[]>(`/api/ops/admin/delegates?status=${encodeURIComponent(status)}`),
    teachers: () => request<LocalUser[]>("/api/ops/admin/teachers"),
    attendanceReview: (date: string) =>
      request<{ date: string; classes: AdminAttendanceClass[] }>(
        `/api/ops/admin/attendance/review?date=${encodeURIComponent(date)}`,
      ),
    audit: (limit = 20) => request<AuditEntry[]>(`/api/ops/admin/audit?limit=${limit}`),
  },
  system: {
    audit: (limit = 20) => request<AuditEntry[]>(`/api/audit/logs?limit=${limit}`),
  },
};
