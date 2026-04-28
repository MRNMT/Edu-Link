/**
 * Teacher Feature Module - Public API
 * Re-exports all services, types, and hooks for easy imports
 */

// Services
export {
  HomeworkService,
  AttendanceService,
  QuizService,
  ClassAlertService,
  formatDateForApi,
  parseDateFromApi,
  validateHomeworkPayload,
  validateAttendancePayload,
} from "./teacher-service";

// Types
export type {
  TeacherHomework,
  HomeworkCreatePayload,
  HomeworkUpdatePayload,
  TeacherQuiz,
  QuizOption,
  QuizQuestion,
  QuizCreatePayload,
  QuizUpdatePayload,
  AttendanceEntry,
  AttendanceBatchPayload,
  AttendanceSubmissionResult,
  ClassAlert,
  ClassAlertPayload,
  HomeworkFormProps,
  AttendanceTrackerProps,
  QuizBuilderProps,
  ClassAlertsFormProps,
  PickupVerificationProps,
  TeacherDashboardData,
  TeacherStats,
  CreateResponse,
  UpdateResponse,
  DeleteResponse,
} from "./teacher-types";

// Hooks
export {
  useHomework,
  useQuiz,
  useAttendance,
  useClassAlert,
  useTeacherDashboard,
} from "./teacher-hooks";

// Components are imported directly from their files
export { default as TeacherDashboard } from "./index";
