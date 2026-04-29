/**
 * Teacher Feature Types & Interfaces
 * Centralized type definitions for teacher module
 */

// ============================================================================
// HOMEWORK TYPES
// ============================================================================

export interface TeacherHomework {
  id: string;
  title: string;
  description: string | null;
  class_name: string;
  due_date: string | null;
  attachment_url: string | null;
  created_at: string;
  read_count?: number;
  read_at?: string | null;
}

export interface HomeworkCreatePayload {
  class_name: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  attachment_url?: string | null;
}

export interface HomeworkUpdatePayload {
  title?: string;
  description?: string | null;
  due_date?: string | null;
  attachment_url?: string | null;
}

// ============================================================================
// QUIZ TYPES
// ============================================================================

export interface TeacherQuiz {
  id: string;
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

export interface QuizOption {
  id?: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface QuizQuestion {
  id?: string;
  prompt: string;
  sort_order: number;
  options: QuizOption[];
}

export interface QuizCreatePayload {
  class_name: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  review_mode?: "none" | "wrong_only" | "correct_only" | "both";
  questions: QuizQuestion[];
}

export interface QuizUpdatePayload {
  title?: string;
  description?: string | null;
  due_date?: string | null;
  review_mode?: "none" | "wrong_only" | "correct_only" | "both";
  questions?: QuizQuestion[];
}

// ============================================================================
// ATTENDANCE TYPES
// ============================================================================

export interface AttendanceEntry {
  child_id: string;
  full_name: string;
  class_name: string;
  status: "present" | "absent" | "unknown";
  reason?: string | null;
}

export interface AttendanceBatchPayload {
  attendance_date: string;
  entries: Array<{
    child_id: string;
    status: "present" | "absent";
    reason?: string | null;
  }>;
}

export interface AttendanceSubmissionResult {
  attendance_date: string;
  count: number;
}

// ============================================================================
// CLASS ALERT TYPES
// ============================================================================

export interface ClassAlert {
  id: string;
  class_name: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  created_at: string;
  read_count?: number;
}

export interface ClassAlertPayload {
  class_name: string;
  title: string;
  message: string;
  priority?: "low" | "medium" | "high" | "critical";
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface HomeworkFormProps {
  classOptions: string[];
  onHomeworkPosted: () => void;
}

export interface AttendanceTrackerProps {
  children: Array<{ id: string; full_name: string; class_name: string }>;
  onSubmit: () => void;
  submitted: boolean;
}

export interface QuizBuilderProps {
  classOptions: string[];
  quizzes: TeacherQuiz[];
  onQuizzesChange: (quizzes: TeacherQuiz[]) => void;
}

export interface ClassAlertsFormProps {
  classOptions: string[];
  onAlertSent: () => void;
}

export interface PickupVerificationProps {
  userId: string;
  schoolId: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface TeacherDashboardData {
  children: Array<{ id: string; full_name: string; class_name: string }>;
  quizzes: TeacherQuiz[];
  homework: TeacherHomework[];
  alerts: ClassAlert[];
  classCount: number;
  studentCount: number;
}

export interface TeacherStats {
  totalStudents: number;
  totalClasses: number;
  activeQuizzes: number;
  recentHomework: number;
  attendanceRate: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CreateResponse {
  id: string;
}

export interface UpdateResponse {
  id: string;
  updated: boolean;
}

export interface DeleteResponse {
  id: string;
  deleted: boolean;
}
