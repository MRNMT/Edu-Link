import type { AppRole } from "../store/slices/authSlice";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const TOKEN_KEY = "guardian-link-access-token";

export interface LocalUser {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  school_id: string | null;
  created_at?: string;
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

export interface NotificationItem {
  id: string;
  category: "homework" | "class_alert" | "delegate" | "security" | "system";
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
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

export interface Child {
  id: string;
  full_name: string;
  class_name: string;
  grade: string;
  school_id: string | null;
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

export interface QuizOption {
  id: string;
  option_text: string;
  sort_order: number;
}

export type QuizReviewMode = "none" | "wrong_only" | "correct_only" | "both";

export interface QuizQuestion {
  id: string;
  prompt: string;
  sort_order: number;
  options: QuizOption[];
}

export interface QuizSummary {
  id: string;
  school_id: string | null;
  teacher_id: string | null;
  class_name: string;
  title: string;
  description: string | null;
  due_date: string | null;
  review_mode: QuizReviewMode;
  question_count: number;
  attempt_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuizTeacherOption extends QuizOption {
  is_correct: boolean;
}

export interface QuizTeacherQuestion {
  id: string;
  prompt: string;
  sort_order: number;
  options: QuizTeacherOption[];
}

export interface QuizDetail extends QuizSummary {
  questions: QuizTeacherQuestion[];
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  child_id: string;
  submitted_by_user_id: string;
  score: number;
  total_questions: number;
  submitted_answers: Array<{
    question_id: string;
    option_id: string | null;
    correct: boolean;
  }>;
  submitted_at: string;
}

export interface Quiz {
  id: string;
  school_id: string | null;
  teacher_id: string | null;
  class_name: string;
  title: string;
  description: string | null;
  due_date: string | null;
  review_mode: QuizReviewMode;
  created_at: string;
  updated_at: string;
  question_count: number;
  questions: QuizQuestion[];
  attempt: QuizAttempt | null;
  review: {
    mode: QuizReviewMode;
    items: Array<{
      question_id: string;
      selected_option_id?: string | null;
      correct_option_id?: string | null;
      correct?: boolean;
    }>;
  } | null;
}

export interface ChildQuizPayload {
  child: Child;
  quizzes: Quiz[];
}

export interface ParentDashboardOverview {
  parent_name: string | null;
  children: Child[];
  homework: HomeworkItem[];
  notifications: NotificationItem[];
  active_delegate_count: number;
  unread_notification_count: number;
}

export interface QuizCreateQuestionInput {
  prompt: string;
  options: Array<{
    text: string;
    is_correct: boolean;
  }>;
}

export interface QuizCreatePayload {
  title: string;
  description?: string | null;
  class_name: string;
  due_date?: string | null;
  review_mode?: QuizReviewMode;
  questions: QuizCreateQuestionInput[];
}

export interface QuizSubmissionAnswer {
  question_id: string;
  option_id: string;
}

function storageAvailable() {
  return typeof window !== "undefined";
}

export function getStoredToken() {
  if (!storageAvailable()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (!storageAvailable()) return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
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
  children: {
    myParentChildren: () => request<Child[]>("/api/parents/me/children"),
    schoolChildren: (schoolId: string) => request<Child[]>(`/api/schools/${schoolId}/children`),
  },
  quizzes: {
    teacherList: () => request<QuizSummary[]>("/api/teachers/me/quizzes"),
    teacherDetail: (quizId: string) => request<QuizDetail>(`/api/teachers/me/quizzes/${quizId}`),
    create: (payload: QuizCreatePayload) =>
      request<QuizSummary>("/api/teachers/me/quizzes", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (quizId: string, payload: QuizCreatePayload) =>
      request<QuizSummary>(`/api/teachers/me/quizzes/${quizId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    forChild: (childId: string) => request<ChildQuizPayload>(`/api/children/${childId}/quizzes`),
    submit: (childId: string, quizId: string, answers: QuizSubmissionAnswer[]) =>
      request<QuizAttempt>(`/api/children/${childId}/quizzes/${quizId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      }),
  },
  passes: {
    my: () => request<PickupToken[]>("/api/passes/me"),
    school: (schoolId: string) => request<PickupToken[]>(`/api/schools/${schoolId}/passes`),
    create: (payload: {
      child_id?: string;
      child_name?: string;
      token_kind?: "qr" | "otp";
      expires_at: string;
    }) =>
      request<PickupToken>("/api/passes", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    verify: (payload: { code?: string; otp?: string; verdict?: "approve" | "reject" }) =>
      request<PickupToken>("/api/passes/verify", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  audit: {
    create: (payload: {
      action: string;
      target?: string | null;
      metadata?: Record<string, unknown>;
    }) =>
      request<AuditEntry>("/api/audit", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    list: (limit = 30) => request<AuditEntry[]>(`/api/audit?limit=${limit}`),
  },
  ops: {
    admin: {
      onboardLearner: (payload: {
        child_full_name: string;
        class_name: string;
        grade: string;
        parent_id?: string | null;
        parent_invite?: { email?: string; phone?: string } | null;
        relationship?: string;
      }) =>
        request<{ id: string }>("/api/ops/admin/children/onboard", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      attendanceReview: (date: string) =>
        request<{ date: string; classes: AdminAttendanceClass[] }>(
          `/api/ops/admin/attendance/review?date=${encodeURIComponent(date)}`,
        ),
      delegates: (status: string = "pending") =>
        request<DelegateQueueItem[]>(
          `/api/ops/admin/delegates?status=${encodeURIComponent(status)}`,
        ),
      decideDelegate: (delegateId: string, decision: "approve" | "reject") =>
        request<{ id: string; status: string }>(`/api/ops/admin/delegates/${delegateId}/decision`, {
          method: "POST",
          body: JSON.stringify({ decision }),
        }),
      freezeAccount: (userId: string, freeze: boolean, reason?: string) =>
        request<{ user_id: string; freeze: boolean; reason?: string }>(
          `/api/ops/admin/accounts/${userId}/freeze`,
          {
            method: "POST",
            body: JSON.stringify({ freeze, reason }),
          },
        ),
      listTeachers: () => request<LocalUser[]>("/api/ops/admin/teachers"),
      createTeacher: (payload: { full_name: string; email: string; password?: string }) =>
        request<{ id: string }>("/api/ops/admin/teachers", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      updateTeacher: (
        teacherId: string,
        payload: { full_name?: string; email?: string; is_active?: boolean },
      ) =>
        request<{ id: string; updated: boolean }>(`/api/ops/admin/teachers/${teacherId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }),
      deactivateTeacher: (teacherId: string) =>
        request<{ id: string; active: boolean }>(
          `/api/ops/admin/teachers/${teacherId}/deactivate`,
          {
            method: "POST",
          },
        ),
      audit: (params: {
        actorId?: string;
        action?: string;
        from?: string;
        to?: string;
        page?: number;
        pageSize?: number;
      }) => {
        const search = new URLSearchParams();
        if (params.actorId) search.set("actorId", params.actorId);
        if (params.action) search.set("action", params.action);
        if (params.from) search.set("from", params.from);
        if (params.to) search.set("to", params.to);
        if (params.page) search.set("page", String(params.page));
        if (params.pageSize) search.set("pageSize", String(params.pageSize));
        return request<{ page: number; pageSize: number; rows: AuditEntry[] }>(
          `/api/ops/admin/audit?${search.toString()}`,
        );
      },
    },
    teacher: {
      submitAttendanceBatch: (payload: {
        attendance_date: string;
        entries: Array<{ child_id: string; status: "present" | "absent"; reason?: string | null }>;
      }) =>
        request<{ attendance_date: string; count: number }>("/api/ops/teacher/attendance/batch", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      postHomework: (payload: {
        class_name: string;
        title: string;
        description?: string | null;
        due_date?: string | null;
        attachment_url?: string | null;
      }) =>
        request<{ id: string }>("/api/ops/teacher/homework", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      listHomework: () => request<HomeworkItem[]>("/api/ops/teacher/homework"),
      sendClassAlert: (payload: {
        class_name: string;
        title: string;
        message: string;
        priority?: "low" | "medium" | "high" | "critical";
      }) =>
        request<{ id: string }>("/api/ops/teacher/class-alerts", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
    },
    parent: {
      dashboard: () => request<ParentDashboardOverview>("/api/ops/parent/dashboard"),
      homeworkFeed: () => request<HomeworkItem[]>("/api/ops/parent/homework"),
      markHomeworkRead: (homeworkId: string) =>
        request<{ homework_id: string; read: boolean }>(
          `/api/ops/parent/homework/${homeworkId}/read`,
          {
            method: "POST",
          },
        ),
      notifications: () => request<NotificationItem[]>("/api/ops/parent/notifications"),
      createDelegate: (payload: { delegate_name: string; phone: string; relationship: string }) =>
        request<{ id: string; status: string }>("/api/ops/parent/delegates", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      reportAbsence: (payload: { child_id: string; attendance_date?: string; reason?: string }) =>
        request<{ child_id: string; attendance_date: string; status: string }>(
          "/api/ops/parent/absence",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        ),
      requestDeletion: (payload: { reason?: string }) =>
        request<{ id: string; status: string }>("/api/ops/parent/deletion-request", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
    },
    delegate: {
      children: () => request<Child[]>("/api/ops/delegate/children"),
      createPickupPass: (payload: { child_id: string }) =>
        request<PickupToken>("/api/ops/delegate/passes", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
    },
  },
};
