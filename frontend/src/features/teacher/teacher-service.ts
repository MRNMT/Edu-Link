/**
 * Teacher Service - CRUD operations for teacher features
 * Centralized service for all teacher-related API operations
 */

import { localApi, type HomeworkItem, type QuizSummary, type QuizDetail } from "@/lib/localApi";

// ============================================================================
// HOMEWORK CRUD OPERATIONS
// ============================================================================

export const HomeworkService = {
  /**
   * GET - List all homework assignments posted by teacher
   */
  async list(): Promise<HomeworkItem[]> {
    return localApi.ops.teacher.listHomework();
  },

  /**
   * CREATE - Post new homework assignment
   */
  async create(payload: {
    class_name: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
    attachment_url?: string | null;
  }): Promise<{ id: string }> {
    return localApi.ops.teacher.postHomework(payload);
  },

  /**
   * UPDATE - Update existing homework (future API enhancement)
   */
  async update(
    homeworkId: string,
    payload: Partial<{
      title: string;
      description?: string | null;
      due_date?: string | null;
      attachment_url?: string | null;
    }>,
  ): Promise<HomeworkItem> {
    // TODO: Implement when backend supports homework updates
    throw new Error("Homework update not yet implemented");
  },

  /**
   * DELETE - Remove homework assignment (future API enhancement)
   */
  async delete(homeworkId: string): Promise<void> {
    // TODO: Implement when backend supports homework deletion
    throw new Error("Homework deletion not yet implemented");
  },
};

// ============================================================================
// ATTENDANCE CRUD OPERATIONS
// ============================================================================

export const AttendanceService = {
  /**
   * CREATE - Submit attendance batch for class
   */
  async submitBatch(payload: {
    attendance_date: string;
    entries: Array<{ child_id: string; status: "present" | "absent"; reason?: string | null }>;
  }): Promise<{ attendance_date: string; count: number }> {
    return localApi.ops.teacher.submitAttendanceBatch(payload);
  },
};

// ============================================================================
// QUIZ CRUD OPERATIONS
// ============================================================================

export const QuizService = {
  /**
   * GET - List all quizzes created by teacher
   */
  async list(): Promise<QuizSummary[]> {
    return localApi.quizzes.teacherList();
  },

  /**
   * GET - Get detailed quiz information
   */
  async getDetail(quizId: string): Promise<QuizDetail> {
    return localApi.quizzes.teacherDetail(quizId);
  },

  /**
   * CREATE - Create new quiz
   */
  async create(payload: {
    class_name: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
    review_mode?: "none" | "wrong_only" | "correct_only" | "both";
    questions: Array<{
      prompt: string;
      sort_order: number;
      options: Array<{
        option_text: string;
        is_correct: boolean;
        sort_order: number;
      }>;
    }>;
  }): Promise<QuizSummary> {
    return localApi.quizzes.create(payload);
  },

  /**
   * UPDATE - Update existing quiz
   */
  async update(quizId: string, payload: Parameters<typeof localApi.quizzes.update>[1]): Promise<QuizSummary> {
    return localApi.quizzes.update(quizId, payload);
  },

  /**
   * DELETE - Delete quiz
   */
  async delete(quizId: string): Promise<void> {
    return localApi.quizzes.delete(quizId);
  },
};

// ============================================================================
// CLASS ALERTS CRUD OPERATIONS
// ============================================================================

export const ClassAlertService = {
  /**
   * CREATE - Send class alert/announcement
   */
  async send(payload: {
    class_name: string;
    title: string;
    message: string;
    priority?: "low" | "medium" | "high" | "critical";
  }): Promise<{ id: string }> {
    return localApi.ops.teacher.sendClassAlert(payload);
  },

  /**
   * UPDATE - Update alert (future enhancement)
   */
  async update(alertId: string, payload: Partial<{ title: string; message: string }>): Promise<void> {
    // TODO: Implement when backend supports alert updates
    throw new Error("Alert update not yet implemented");
  },

  /**
   * DELETE - Delete alert (future enhancement)
   */
  async delete(alertId: string): Promise<void> {
    // TODO: Implement when backend supports alert deletion
    throw new Error("Alert deletion not yet implemented");
  },
};

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Format date for API requests (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date | string): string {
  if (typeof date === "string") return date;
  return date.toISOString().split("T")[0];
}

/**
 * Parse API date to display format
 */
export function parseDateFromApi(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Validate homework payload
 */
export function validateHomeworkPayload(payload: {
  class_name: string;
  title: string;
  description?: string;
  due_date?: string;
  attachment_url?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.class_name?.trim()) errors.push("Class name is required");
  if (!payload.title?.trim()) errors.push("Title is required");

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate attendance payload
 */
export function validateAttendancePayload(payload: {
  attendance_date: string;
  entries: Array<{ child_id: string; status: "present" | "absent"; reason?: string }>;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.attendance_date?.trim()) errors.push("Attendance date is required");
  if (!payload.entries || payload.entries.length === 0) errors.push("At least one attendance entry is required");

  return {
    valid: errors.length === 0,
    errors,
  };
}
