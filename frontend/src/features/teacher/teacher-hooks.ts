/**
 * Teacher Feature Hooks
 * React hooks for teacher CRUD operations
 */

import { useState, useCallback } from "react";
import {
  HomeworkService,
  QuizService,
  AttendanceService,
  ClassAlertService,
} from "./teacher-service";
import type {
  TeacherHomework,
  HomeworkCreatePayload,
  TeacherQuiz,
  QuizCreatePayload,
  ClassAlertPayload,
} from "./teacher-types";

// ============================================================================
// HOMEWORK HOOKS
// ============================================================================

export function useHomework() {
  const [homework, setHomework] = useState<TeacherHomework[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHomework = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await HomeworkService.list();
      setHomework(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load homework";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createHomework = useCallback(
    async (payload: HomeworkCreatePayload) => {
      try {
        setError(null);
        const result = await HomeworkService.create(payload);
        await loadHomework(); // Refresh list
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create homework";
        setError(message);
        throw err;
      }
    },
    [loadHomework],
  );

  const deleteHomework = useCallback(
    async (homeworkId: string) => {
      try {
        setError(null);
        await HomeworkService.delete(homeworkId);
        setHomework((prev) => prev.filter((h) => h.id !== homeworkId));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete homework";
        setError(message);
        throw err;
      }
    },
    [],
  );

  return {
    homework,
    loading,
    error,
    loadHomework,
    createHomework,
    deleteHomework,
  };
}

// ============================================================================
// QUIZ HOOKS
// ============================================================================

export function useQuiz() {
  const [quizzes, setQuizzes] = useState<TeacherQuiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await QuizService.list();
      setQuizzes(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load quizzes";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createQuiz = useCallback(
    async (payload: QuizCreatePayload) => {
      try {
        setError(null);
        const result = await QuizService.create(payload);
        await loadQuizzes(); // Refresh list
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create quiz";
        setError(message);
        throw err;
      }
    },
    [loadQuizzes],
  );

  const updateQuiz = useCallback(
    async (quizId: string, payload: Parameters<typeof QuizService.update>[1]) => {
      try {
        setError(null);
        const result = await QuizService.update(quizId, payload);
        await loadQuizzes(); // Refresh list
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update quiz";
        setError(message);
        throw err;
      }
    },
    [loadQuizzes],
  );

  const deleteQuiz = useCallback(
    async (quizId: string) => {
      try {
        setError(null);
        await QuizService.delete(quizId);
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete quiz";
        setError(message);
        throw err;
      }
    },
    [],
  );

  return {
    quizzes,
    loading,
    error,
    loadQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz,
  };
}

// ============================================================================
// ATTENDANCE HOOKS
// ============================================================================

export function useAttendance() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitAttendance = useCallback(
    async (payload: Parameters<typeof AttendanceService.submitBatch>[0]) => {
      try {
        setSubmitting(true);
        setError(null);
        const result = await AttendanceService.submitBatch(payload);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to submit attendance";
        setError(message);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return {
    submitting,
    error,
    submitAttendance,
  };
}

// ============================================================================
// CLASS ALERT HOOKS
// ============================================================================

export function useClassAlert() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendAlert = useCallback(async (payload: ClassAlertPayload) => {
    try {
      setSending(true);
      setError(null);
      const result = await ClassAlertService.send(payload);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send alert";
      setError(message);
      throw err;
    } finally {
      setSending(false);
    }
  }, []);

  return {
    sending,
    error,
    sendAlert,
  };
}

// ============================================================================
// COMBINED DASHBOARD HOOKS
// ============================================================================

/**
 * Hook that loads all teacher dashboard data at once
 */
export function useTeacherDashboard() {
  const { homework, loadHomework: loadHomeworkData } = useHomework();
  const { quizzes, loadQuizzes } = useQuiz();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([loadHomeworkData(), loadQuizzes()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [loadHomeworkData, loadQuizzes]);

  return {
    homework,
    quizzes,
    loading,
    error,
    loadDashboardData,
  };
}
