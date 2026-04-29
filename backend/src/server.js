import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'node:url';
import pool, { query } from './db.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

function toId(value) {
  return value == null ? null : String(value);
}

function mapUser(row) {
  return {
    id: toId(row.id),
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    school_id: toId(row.school_id),
    frozen_at: row.frozen_at ?? null,
    frozen_by: toId(row.frozen_by),
    frozen_reason: row.frozen_reason ?? null,
    created_at: row.created_at,
  };
}

function mapChild(row) {
  return {
    id: toId(row.id),
    full_name: row.full_name,
    class_name: row.class_name ?? '',
    grade: row.grade ?? '',
    school_id: toId(row.school_id),
  };
}

function mapToken(row) {
  return {
    id: toId(row.id),
    child_id: toId(row.child_id),
    code: row.code,
    otp: row.otp,
    status: row.status,
    expires_at: row.expires_at,
    used_at: row.used_at,
    used_by: toId(row.used_by),
    created_at: row.created_at,
    kind: row.kind,
    child: row.child_full_name
      ? {
          full_name: row.child_full_name,
          class_name: row.child_class_name ?? '',
        }
      : undefined,
  };
}

function mapAudit(row) {
  return {
    id: toId(row.id),
    school_id: toId(row.school_id),
    actor_id: toId(row.actor_id),
    action: row.action,
    target: row.target,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    created_at: row.created_at,
  };
}

function parseMaybeJson(value, fallback = null) {
  if (value == null) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
}

function generateTemporaryPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function normalizeFullName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function isValidFullName(value) {
  const name = normalizeFullName(value);
  // Require at least two name parts and allow letters, spaces, apostrophes and hyphens.
  if (name.split(' ').length < 2) return false;
  return /^[A-Za-z][A-Za-z\-\' ]{1,158}$/.test(name);
}

function parseGradeLevel(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const match = text.match(/\d+/);
  if (!match) return null;
  const level = Number(match[0]);
  if (!Number.isInteger(level)) return null;
  return level;
}

async function sendTemporaryCredentialsEmail({ toEmail, fullName, temporaryPassword }) {
  const emailEnabled = String(process.env.ENABLE_EMAILS || 'false').toLowerCase() === 'true';
  if (!emailEnabled) {
    return false;
  }

  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const secure = String(process.env.EMAIL_SECURE || process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || user;
  const fromName = process.env.EMAIL_FROM_NAME || 'EduSecure-Link';

  if (!host || !user || !pass || !from) {
    throw new Error('Email settings are missing. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS and EMAIL_FROM (or SMTP_* equivalents).');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `${fromName} <${from}>`,
    to: toEmail,
    subject: 'Your EduSecure-Link temporary login credentials',
    text: `Hello ${fullName},\n\nYour parent account has been created in EduSecure-Link.\n\nEmail: ${toEmail}\nTemporary password: ${temporaryPassword}\n\nPlease sign in and change your password immediately.\n\nRegards,\nEduSecure-Link`,
    html: `<p>Hello ${fullName},</p><p>Your parent account has been created in <strong>EduSecure-Link</strong>.</p><p><strong>Email:</strong> ${toEmail}<br/><strong>Temporary password:</strong> ${temporaryPassword}</p><p>Please sign in and change your password immediately.</p><p>Regards,<br/>EduSecure-Link</p>`,
  });

  return true;
}

const QUIZ_REVIEW_MODES = new Set(['none', 'wrong_only', 'correct_only', 'both']);

function normalizeQuizReviewMode(value) {
  const mode = String(value ?? 'none').trim().toLowerCase();
  if (!QUIZ_REVIEW_MODES.has(mode)) {
    return null;
  }
  return mode;
}

function mapQuizSummary(row) {
  return {
    id: toId(row.id),
    school_id: toId(row.school_id),
    teacher_id: toId(row.teacher_id),
    class_name: row.class_name,
    title: row.title,
    description: row.description,
    due_date: row.due_date,
    review_mode: row.review_mode ?? 'none',
    question_count: Number(row.question_count ?? 0),
    attempt_count: Number(row.attempt_count ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapQuizAttempt(row) {
  return {
    id: toId(row.id),
    quiz_id: toId(row.quiz_id),
    child_id: toId(row.child_id),
    submitted_by_user_id: toId(row.submitted_by_user_id),
    score: Number(row.score ?? 0),
    total_questions: Number(row.total_questions ?? 0),
    submitted_answers: parseMaybeJson(row.answers_json, []),
    submitted_at: row.submitted_at,
  };
}

function groupQuizRows(rows) {
  const quizzes = new Map();

  for (const row of rows) {
    const quizId = toId(row.quiz_id);
    if (!quizId) {
      continue;
    }

    let quiz = quizzes.get(quizId);
    if (!quiz) {
      quiz = {
        id: quizId,
        school_id: toId(row.school_id),
        teacher_id: toId(row.teacher_id),
        class_name: row.class_name,
        title: row.title,
        description: row.description,
        due_date: row.due_date,
        review_mode: row.review_mode ?? 'none',
        created_at: row.created_at,
        updated_at: row.updated_at,
        question_count: 0,
        questions: [],
        attempt: row.attempt_id
          ? {
              id: toId(row.attempt_id),
              quiz_id: quizId,
              child_id: toId(row.attempt_child_id),
              submitted_by_user_id: toId(row.attempt_submitted_by_user_id),
              score: Number(row.attempt_score ?? 0),
              total_questions: Number(row.attempt_total_questions ?? 0),
              submitted_answers: parseMaybeJson(row.attempt_answers, []),
              submitted_at: row.attempt_submitted_at,
            }
          : null,
      };
      quizzes.set(quizId, quiz);
    }

    if (row.question_id) {
      let question = quiz.questions.find((item) => item.id === toId(row.question_id));
      if (!question) {
        question = {
          id: toId(row.question_id),
          prompt: row.question_prompt,
          sort_order: Number(row.question_sort_order ?? 0),
          options: [],
        };
        quiz.questions.push(question);
      }

      if (row.option_id) {
        question.options.push({
          id: toId(row.option_id),
          option_text: row.option_text,
          __is_correct: Boolean(row.is_correct),
          sort_order: Number(row.option_sort_order ?? 0),
        });
      }
    }
  }

  return [...quizzes.values()].map((quiz) => ({
    ...quiz,
    question_count: quiz.questions.length,
  }));
}

function buildChildQuizReview(quiz) {
  const sanitizedQuestions = quiz.questions.map((question) => ({
    ...question,
    options: question.options.map(({ __is_correct, ...option }) => option),
  }));

  if (!quiz?.attempt) {
    return { ...quiz, questions: sanitizedQuestions, review: null };
  }

  const reviewMode = quiz.review_mode ?? 'none';
  if (reviewMode === 'none') {
    return { ...quiz, questions: sanitizedQuestions, review: { mode: 'none', items: [] } };
  }

  const submitted = new Map(
    (Array.isArray(quiz.attempt.submitted_answers) ? quiz.attempt.submitted_answers : []).map((answer) => [
      toId(answer.question_id),
      {
        selected_option_id: toId(answer.option_id),
        correct: Boolean(answer.correct),
      },
    ])
  );

  const reviewItems = quiz.questions
    .map((question) => {
      const answer = submitted.get(question.id) ?? { selected_option_id: null, correct: false };
      const correctOption = question.options.find((option) => option.__is_correct) ?? null;
      const selectedOption = question.options.find((option) => option.id === answer.selected_option_id) ?? null;

      if (reviewMode === 'wrong_only' && answer.correct) {
        return null;
      }

      if (reviewMode === 'correct_only') {
        return {
          question_id: question.id,
          correct_option_id: correctOption?.id ?? null,
        };
      }

      if (reviewMode === 'wrong_only') {
        return {
          question_id: question.id,
          selected_option_id: selectedOption?.id ?? null,
          correct_option_id: correctOption?.id ?? null,
          correct: false,
        };
      }

      return {
        question_id: question.id,
        selected_option_id: selectedOption?.id ?? null,
        correct_option_id: correctOption?.id ?? null,
        correct: answer.correct,
      };
    })
    .filter(Boolean);

  return {
    ...quiz,
    questions: sanitizedQuestions,
    review: {
      mode: reviewMode,
      items: reviewItems,
    },
  };
}

async function ensureQuizSchema() {
  await query(
    `CREATE TABLE IF NOT EXISTS quizzes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id BIGINT UNSIGNED NOT NULL,
      teacher_id BIGINT UNSIGNED NOT NULL,
      class_name VARCHAR(80) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      due_date DATE NULL,
      review_mode ENUM('none', 'wrong_only', 'correct_only', 'both') NOT NULL DEFAULT 'none',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_quizzes_school_created (school_id, created_at),
      KEY idx_quizzes_teacher (teacher_id),
      KEY idx_quizzes_class (class_name),
      CONSTRAINT fk_quizzes_school_id
        FOREIGN KEY (school_id) REFERENCES schools(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_quizzes_teacher_id
        FOREIGN KEY (teacher_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS quiz_questions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      quiz_id BIGINT UNSIGNED NOT NULL,
      prompt VARCHAR(500) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_quiz_questions_quiz (quiz_id, sort_order),
      CONSTRAINT fk_quiz_questions_quiz_id
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS quiz_options (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      question_id BIGINT UNSIGNED NOT NULL,
      option_text VARCHAR(255) NOT NULL,
      is_correct TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_quiz_options_question (question_id, sort_order),
      CONSTRAINT fk_quiz_options_question_id
        FOREIGN KEY (question_id) REFERENCES quiz_questions(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS quiz_attempts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      quiz_id BIGINT UNSIGNED NOT NULL,
      child_id BIGINT UNSIGNED NOT NULL,
      submitted_by_user_id BIGINT UNSIGNED NOT NULL,
      answers_json JSON NOT NULL,
      score INT NOT NULL DEFAULT 0,
      total_questions INT NOT NULL DEFAULT 0,
      submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_quiz_attempts_pair (quiz_id, child_id),
      KEY idx_quiz_attempts_child (child_id),
      KEY idx_quiz_attempts_quiz (quiz_id),
      CONSTRAINT fk_quiz_attempts_quiz_id
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_quiz_attempts_child_id
        FOREIGN KEY (child_id) REFERENCES children(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_quiz_attempts_submitted_by
        FOREIGN KEY (submitted_by_user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB`
  );

  const reviewModeColumn = await query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'review_mode'`
  );

  if (Number(reviewModeColumn[0]?.count ?? 0) === 0) {
    await query(
      `ALTER TABLE quizzes
       ADD COLUMN review_mode ENUM('none', 'wrong_only', 'correct_only', 'both') NOT NULL DEFAULT 'none' AFTER due_date`
    );
  }
}

async function ensureOperationsSchema() {
  await query(
    `CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      category ENUM('homework', 'class_alert', 'delegate', 'security', 'system') NOT NULL DEFAULT 'system',
      title VARCHAR(255) NOT NULL,
      body TEXT NULL,
      data JSON NULL,
      read_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notifications_user_created (user_id, created_at),
      KEY idx_notifications_school_created (school_id, created_at),
      CONSTRAINT fk_notifications_school
        FOREIGN KEY (school_id) REFERENCES schools(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS deletion_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id BIGINT UNSIGNED NOT NULL,
      requested_by BIGINT UNSIGNED NOT NULL,
      reason TEXT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      reviewed_by BIGINT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_deletion_requests_school (school_id, created_at),
      KEY idx_deletion_requests_user (requested_by),
      CONSTRAINT fk_deletion_requests_school
        FOREIGN KEY (school_id) REFERENCES schools(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_deletion_requests_user
        FOREIGN KEY (requested_by) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_deletion_requests_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS class_alerts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id BIGINT UNSIGNED NOT NULL,
      created_by_user_id BIGINT UNSIGNED NOT NULL,
      class_name VARCHAR(80) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_class_alerts_school_date (school_id, created_at),
      KEY idx_class_alerts_class (class_name),
      CONSTRAINT fk_class_alerts_school_id
        FOREIGN KEY (school_id) REFERENCES schools(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_class_alerts_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS classes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(80) NOT NULL,
      grade_level VARCHAR(40) NOT NULL,
      capacity INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_classes_school_name (school_id, name),
      KEY idx_classes_school_id (school_id),
      CONSTRAINT fk_classes_school_id
        FOREIGN KEY (school_id) REFERENCES schools(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS teacher_class_assignments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id BIGINT UNSIGNED NOT NULL,
      teacher_id BIGINT UNSIGNED NOT NULL,
      class_name VARCHAR(80) NOT NULL,
      grade_level TINYINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_teacher_class_grade (teacher_id, class_name, grade_level),
      KEY idx_teacher_class_assignments_school (school_id, class_name),
      KEY idx_teacher_class_assignments_teacher (teacher_id),
      CONSTRAINT fk_teacher_class_assignments_school
        FOREIGN KEY (school_id) REFERENCES schools(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_teacher_class_assignments_teacher
        FOREIGN KEY (teacher_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS parent_teacher_messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id BIGINT UNSIGNED NOT NULL,
      parent_id BIGINT UNSIGNED NOT NULL,
      teacher_id BIGINT UNSIGNED NOT NULL,
      sender_id BIGINT UNSIGNED NOT NULL,
      message TEXT NOT NULL,
      read_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ptm_parent_teacher_created (parent_id, teacher_id, created_at),
      KEY idx_ptm_teacher_created (teacher_id, created_at),
      KEY idx_ptm_sender_created (sender_id, created_at),
      CONSTRAINT fk_ptm_school
        FOREIGN KEY (school_id) REFERENCES schools(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_ptm_parent
        FOREIGN KEY (parent_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_ptm_teacher
        FOREIGN KEY (teacher_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_ptm_sender
        FOREIGN KEY (sender_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB`
  );

  const usersColumns = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
       AND COLUMN_NAME IN ('teacher_identifier', 'frozen_at', 'frozen_by', 'frozen_reason', 'parent_identifier')`
  );
  const existingCols = new Set(usersColumns.map((row) => row.COLUMN_NAME));

  if (!existingCols.has('teacher_identifier')) {
    await query(`ALTER TABLE users ADD COLUMN teacher_identifier VARCHAR(64) NULL AFTER email`);
  }
  if (!existingCols.has('frozen_at')) {
    await query(`ALTER TABLE users ADD COLUMN frozen_at DATETIME NULL AFTER is_active`);
  }
  if (!existingCols.has('frozen_by')) {
    await query(`ALTER TABLE users ADD COLUMN frozen_by BIGINT UNSIGNED NULL AFTER frozen_at`);
    await query(
      `ALTER TABLE users
       ADD CONSTRAINT fk_users_frozen_by
       FOREIGN KEY (frozen_by) REFERENCES users(id)
       ON DELETE SET NULL ON UPDATE CASCADE`
    );
  }
  if (!existingCols.has('frozen_reason')) {
    await query(`ALTER TABLE users ADD COLUMN frozen_reason VARCHAR(255) NULL AFTER frozen_by`);
  }
  if (!existingCols.has('parent_identifier')) {
    await query(`ALTER TABLE users ADD COLUMN parent_identifier VARCHAR(64) NULL AFTER teacher_identifier`);
  }

  await query(
    `CREATE UNIQUE INDEX uq_users_school_teacher_identifier ON users (school_id, teacher_identifier)`
  ).catch(() => null);
  await query(
    `CREATE UNIQUE INDEX uq_users_school_parent_identifier ON users (school_id, parent_identifier)`
  ).catch(() => null);

  const attendanceColumns = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance'
       AND COLUMN_NAME IN ('attendance_date', 'marked_by', 'reason')`
  );
  const attendanceSet = new Set(attendanceColumns.map((row) => row.COLUMN_NAME));

  if (!attendanceSet.has('attendance_date')) {
    await query(`ALTER TABLE attendance ADD COLUMN attendance_date DATE NULL AFTER school_id`);
    await query(`UPDATE attendance SET attendance_date = DATE(recorded_at) WHERE attendance_date IS NULL`);
    await query(`ALTER TABLE attendance MODIFY COLUMN attendance_date DATE NOT NULL`);
  }
  if (!attendanceSet.has('marked_by')) {
    await query(`ALTER TABLE attendance ADD COLUMN marked_by BIGINT UNSIGNED NULL AFTER attendance_date`);
    await query(`UPDATE attendance SET marked_by = recorded_by_teacher_id WHERE marked_by IS NULL`);
  }
  if (!attendanceSet.has('reason')) {
    await query(`ALTER TABLE attendance ADD COLUMN reason VARCHAR(255) NULL AFTER status`);
  }

  await query(
    `CREATE UNIQUE INDEX uq_attendance_child_date ON attendance (child_id, attendance_date)`
  ).catch(() => null);

  await query(
    `ALTER TABLE homework_read RENAME TO homework_reads`
  ).catch(() => null);

  const passColumns = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pickup_passes'
       AND COLUMN_NAME IN ('rejected_attempts')`
  );
  const passSet = new Set(passColumns.map((row) => row.COLUMN_NAME));
  if (!passSet.has('rejected_attempts')) {
    await query(`ALTER TABLE pickup_passes ADD COLUMN rejected_attempts INT NOT NULL DEFAULT 0 AFTER status`);
  }
}

function hasAnyRole(user, roles) {
  return roles.includes(String(user?.role ?? ''));
}

function requireRoles(req, res, roles) {
  if (!hasAnyRole(req.user, roles)) {
    res.status(403).json({ error: 'Insufficient role permissions' });
    return false;
  }
  return true;
}

function toCsv(rows) {
  const escapeCell = (value) => {
    const text = value == null ? '' : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  return rows
    .map((row) => row.map(escapeCell).join(','))
    .join('\n');
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is missing');
  }

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id,
    },
    secret,
    { expiresIn: '7d' }
  );
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function getSessionByUserId(userId) {
  const rows = await query(
    `SELECT id, full_name, email, role, school_id, frozen_at, frozen_by, frozen_reason, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) return null;

  const user = mapUser(rows[0]);
  return {
    access_token: signToken(user),
    user,
    profile: {
      id: user.id,
      full_name: user.full_name,
      phone: null,
      school_id: user.school_id,
      frozen_at: user.frozen_at,
      frozen_by: user.frozen_by,
      frozen_reason: user.frozen_reason,
    },
    roles: [user.role],
  };
}

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1 AS ok');
    return res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, email, password, role = 'parent', school_id = null } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email, and password are required' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role, school_id)
       VALUES (?, ?, ?, ?, ?)`,
      [full_name, email, passwordHash, role, school_id]
    );

    const user = mapUser({ id: result.insertId, full_name, email, role, school_id, created_at: new Date() });
    return res.status(201).json({
      access_token: signToken(user),
      user,
      profile: {
        id: user.id,
        full_name,
        phone: null,
        school_id: user.school_id,
        frozen_at: user.frozen_at,
        frozen_by: user.frozen_by,
        frozen_reason: user.frozen_reason,
      },
      roles: [role],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const rows = await query(
      `SELECT id, full_name, email, password_hash, role, school_id, frozen_at, frozen_by, frozen_reason
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userRow = rows[0];
    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = mapUser(userRow);
    return res.json({
      access_token: signToken(user),
      user,
      profile: {
        id: user.id,
        full_name: user.full_name,
        phone: null,
        school_id: user.school_id,
        frozen_at: user.frozen_at,
        frozen_by: user.frozen_by,
        frozen_reason: user.frozen_reason,
      },
      roles: [user.role],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  try {
    const session = await getSessionByUserId(req.user.sub);
    if (!session) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(session);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', authRequired, async (_req, res) => {
  return res.json({ ok: true });
});

app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const rows = await query(
      `SELECT id, full_name, email FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const user = rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await query(
      `INSERT INTO password_reset_tokens (user_id, otp, expires_at) VALUES (?, ?, ?)`,
      [user.id, otp, expiresAt]
    );

    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
    const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
    const secure = port === 465;
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM;
    const fromName = process.env.EMAIL_FROM_NAME || 'EduSecure-Link';

    if (host && emailUser && emailPass && from) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user: emailUser, pass: emailPass },
      });

      await transporter.sendMail({
        from: `${fromName} <${from}>`,
        to: user.email,
        subject: 'Password Reset Request - EduSecure-Link',
        text: `Hello ${user.full_name},\n\nYou requested a password reset for your EduSecure-Link account.\n\nYour OTP is: ${otp}\n\nThis OTP will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.\n\nRegards,\nEduSecure-Link`,
        html: `<p>Hello ${user.full_name},</p><p>You requested a password reset for your <strong>EduSecure-Link</strong> account.</p><p><strong>Your OTP is: ${otp}</strong></p><p>This OTP will expire in 15 minutes.</p><p>If you didn't request this, please ignore this email.</p><p>Regards,<br/>EduSecure-Link</p>`,
      });
    }

    return res.json({ ok: true, message: 'OTP sent to your email' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const userRows = await query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userRows[0].id;

    const tokenRows = await query(
      `SELECT id, expires_at FROM password_reset_tokens 
       WHERE user_id = ? AND otp = ? AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId, otp]
    );

    if (tokenRows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const token = tokenRows[0];
    if (new Date(token.expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [hashedPassword, userId]
    );

    await query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`,
      [token.id]
    );

    return res.json({ ok: true, message: 'Password reset successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/me', authRequired, async (req, res) => {
  try {
    const session = await getSessionByUserId(req.user.sub);
    if (!session) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(session.user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/parents/me/children', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.id, c.full_name, c.class_name, c.grade, c.school_id
       FROM parent_children pc
       INNER JOIN children c ON c.id = pc.child_id
       WHERE pc.parent_id = ?
       ORDER BY c.full_name`,
      [req.user.sub]
    );

    return res.json(rows.map(mapChild));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/schools/:schoolId/children', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, full_name, class_name, grade, school_id
       FROM children
       WHERE school_id = ?
       ORDER BY full_name`,
      [req.params.schoolId]
    );

    return res.json(rows.map(mapChild));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/passes/me', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, c.full_name AS child_full_name, c.class_name AS child_class_name
       FROM pickup_passes p
       LEFT JOIN children c ON c.id = p.child_id
       WHERE p.issued_by_user_id = ?
       ORDER BY p.created_at DESC
       LIMIT 10`,
      [req.user.sub]
    );

    return res.json(rows.map(mapToken));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/schools/:schoolId/passes', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, c.full_name AS child_full_name, c.class_name AS child_class_name
       FROM pickup_passes p
       LEFT JOIN children c ON c.id = p.child_id
       WHERE p.school_id = ?
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [req.params.schoolId]
    );

    return res.json(rows.map(mapToken));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/passes', authRequired, async (req, res) => {
  try {
    const { child_id, child_name, token_kind = 'qr', expires_at } = req.body;

    if (!expires_at || (!child_id && !child_name)) {
      return res.status(400).json({ error: 'child_id or child_name and expires_at are required' });
    }

    if (req.user.role === 'parent') {
      const ownerRows = await query(
        `SELECT frozen_at FROM users WHERE id = ? LIMIT 1`,
        [req.user.sub]
      );
      if (ownerRows[0]?.frozen_at) {
        return res.status(403).json({ error: 'Account is frozen. Contact school admin.' });
      }
    }

    const code = `PASS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    let childRow = null;
    if (child_id) {
      const children = await query(
        `SELECT id, full_name, class_name, grade, school_id
         FROM children
         WHERE id = ?
         LIMIT 1`,
        [child_id]
      );
      childRow = children[0] ?? null;
    }

    const result = await query(
      `INSERT INTO pickup_passes (child_id, child_name, issued_by_user_id, school_id, token_kind, code, otp, status, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [child_id ?? null, child_name ?? childRow?.full_name ?? 'Unknown child', req.user.sub, req.user.school_id, token_kind, code, otp, expires_at]
    );

    const rows = await query('SELECT * FROM pickup_passes WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json(
      mapToken({
        ...rows[0],
        child_full_name: childRow?.full_name ?? child_name ?? 'Unknown child',
        child_class_name: childRow?.class_name ?? '',
      })
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/passes/verify', authRequired, async (req, res) => {
  try {
    const { code, otp, verdict = 'approve' } = req.body;

    if (!code && !otp) {
      return res.status(400).json({ error: 'code or otp is required' });
    }

    const rows = await query(
      `SELECT p.*, c.full_name AS child_full_name, c.class_name AS child_class_name
       FROM pickup_passes p
       LEFT JOIN children c ON c.id = p.child_id
       WHERE ${code ? 'p.code = ?' : 'p.otp = ?'}
       LIMIT 1`,
      [code ?? otp]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const token = rows[0];
    const expired = new Date(token.expires_at).getTime() < Date.now();

    let newStatus = token.status;
    const priorRejected = Number(token.rejected_attempts ?? 0);
    let rejectedAttempts = priorRejected;
    if (token.status === 'active') {
      if (expired) newStatus = 'expired';
      else if (verdict === 'approve') newStatus = 'used';
      else {
        rejectedAttempts += 1;
        newStatus = rejectedAttempts >= 2 ? 'rejected' : 'active';
      }
    }

    await query(
      `UPDATE pickup_passes
       SET status = ?, rejected_attempts = ?, used_at = ?, used_by = ?
       WHERE id = ?`,
      [
        newStatus,
        rejectedAttempts,
        newStatus === 'used' || newStatus === 'rejected' ? new Date() : null,
        req.user.sub,
        token.id,
      ]
    );

    if (newStatus === 'rejected' && verdict === 'reject' && rejectedAttempts >= 2) {
      await query(
        `INSERT INTO notifications (school_id, user_id, category, title, body, data)
         SELECT ?, id, 'security', 'Token locked after failed scans', ?, ?
         FROM users
         WHERE school_id = ? AND role = 'school_admin'`,
        [
          req.user.school_id,
          `Token ${token.code} was locked after repeated rejection scans at the gate.`,
          JSON.stringify({ token_id: token.id, code: token.code, rejected_attempts: rejectedAttempts }),
          req.user.school_id,
        ]
      );
    }

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.school_id,
        req.user.sub,
        `pickup_pass.${newStatus}`,
        String(token.id),
        JSON.stringify({ verdict, child_id: token.child_id, rejected_attempts: rejectedAttempts }),
      ]
    );

    return res.json(
      mapToken({
        ...token,
        status: newStatus,
        rejected_attempts: rejectedAttempts,
        used_at: newStatus === 'used' || newStatus === 'rejected' ? new Date() : null,
        used_by: req.user.sub,
      })
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/audit', authRequired, async (req, res) => {
  try {
    const { action, target = null, metadata = {} } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    const result = await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.school_id, req.user.sub, action, target, JSON.stringify(metadata)]
    );

    const rows = await query('SELECT * FROM audit_logs WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json(mapAudit(rows[0]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/audit', authRequired, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 30), 100);
    const rows = await query(
      `SELECT * FROM audit_logs
       WHERE school_id = ? OR actor_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [req.user.school_id, req.user.sub, limit]
    );

    return res.json(rows.map(mapAudit));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/passes', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, c.full_name AS child_full_name, c.class_name AS child_class_name
       FROM pickup_passes p
       LEFT JOIN children c ON c.id = p.child_id
       WHERE p.issued_by_user_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.sub]
    );

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// === PROFILE ENDPOINTS ===
app.put('/api/me', authRequired, async (req, res) => {
  try {
    const { full_name, phone } = req.body;

    if (full_name) {
      await query('UPDATE users SET full_name = ? WHERE id = ?', [full_name, req.user.sub]);
    }

    const session = await getSessionByUserId(req.user.sub);
    if (!session) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(session);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// === CHILD MODE ENDPOINTS ===
function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

app.post('/api/parents/me/child-mode/enter', authRequired, async (req, res) => {
  try {
    const { child_id } = req.body;

    if (!child_id) {
      return res.status(400).json({ error: 'child_id is required' });
    }

    // Verify user is parent and has access to child
    const childRows = await query(
      `SELECT c.id FROM children c
       INNER JOIN parent_children pc ON pc.child_id = c.id
       WHERE c.id = ? AND pc.parent_id = ?`,
      [child_id, req.user.sub]
    );

    if (childRows.length === 0) {
      return res.status(403).json({ error: 'No access to this child' });
    }

    // Log child mode entry
    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'child_mode.enter', ?, ?)`,
      [req.user.school_id, req.user.sub, String(child_id), JSON.stringify({ child_id })]
    );

    return res.json({ ok: true, child_id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/parents/me/child-mode/exit', authRequired, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'password is required' });
    }

    // Verify password
    const userRows = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.sub]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ok = await verifyPassword(password, userRows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Log child mode exit
    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'child_mode.exit', 'child_mode', ?)`,
      [req.user.school_id, req.user.sub, JSON.stringify({})]
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// === DELEGATED GUARDIAN ENDPOINTS ===
app.post('/api/parents/me/delegates', authRequired, async (req, res) => {
  try {
    const { full_name, phone_number, relationship } = req.body;

    if (!full_name || !phone_number) {
      return res.status(400).json({ error: 'full_name and phone_number are required' });
    }

    const token = require('crypto').randomBytes(32).toString('hex');
    const result = await query(
      `INSERT INTO delegated_guardians (parent_id, phone_number, full_name, relationship, status, token)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [req.user.sub, phone_number, full_name, relationship ?? null, token]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'delegate.requested', ?, ?)`,
      [req.user.school_id, req.user.sub, String(result.insertId), JSON.stringify({ full_name, phone_number })]
    );

    return res.status(201).json({
      id: result.insertId,
      status: 'pending',
      full_name,
      phone_number,
      relationship,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/parents/me/delegates', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, full_name, phone_number, relationship, status, created_at
       FROM delegated_guardians
       WHERE parent_id = ?
       ORDER BY created_at DESC`,
      [req.user.sub]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// === TEACHER ENDPOINTS ===
app.get('/api/teachers/me/quizzes', authRequired, async (req, res) => {
  try {
    const teacherRows = await query(
      `SELECT id
       FROM users
       WHERE id = ? AND role = 'teacher'
       LIMIT 1`,
      [req.user.sub]
    );

    if (teacherRows.length === 0) {
      return res.status(403).json({ error: 'Teacher role required' });
    }

    const rows = await query(
      `SELECT q.id, q.school_id, q.teacher_id, q.class_name, q.title, q.description, q.due_date, q.review_mode, q.created_at, q.updated_at,
              (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
              (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS attempt_count
       FROM quizzes q
       WHERE q.teacher_id = ?
       ORDER BY q.created_at DESC`,
      [req.user.sub]
    );

    return res.json(rows.map(mapQuizSummary));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/teachers/me/classes', authRequired, async (req, res) => {
  try {
    const teacherRows = await query(
      `SELECT id
       FROM users
       WHERE id = ? AND role = 'teacher'
       LIMIT 1`,
      [req.user.sub]
    );

    if (teacherRows.length === 0) {
      return res.status(403).json({ error: 'Teacher role required' });
    }

    const rows = await query(
      `SELECT class_name
       FROM (
         SELECT class_name FROM teacher_class_assignments WHERE teacher_id = ?
         UNION
         SELECT class_name FROM homework WHERE teacher_id = ?
         UNION
         SELECT class_name FROM quizzes WHERE teacher_id = ?
         UNION
         SELECT class_name FROM class_alerts WHERE created_by_user_id = ?
         UNION
         SELECT DISTINCT c.class_name
         FROM attendance a
         INNER JOIN children c ON c.id = a.child_id
         WHERE a.recorded_by_teacher_id = ?
       ) teacher_classes
       WHERE class_name IS NOT NULL AND class_name <> ''
       ORDER BY class_name ASC`,
      [req.user.sub, req.user.sub, req.user.sub, req.user.sub, req.user.sub]
    );

    return res.json(rows.map((row) => ({ class_name: row.class_name })));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/teachers/me/quizzes/:quizId', authRequired, async (req, res) => {
  try {
    const teacherRows = await query(
      `SELECT id
       FROM users
       WHERE id = ? AND role = 'teacher'
       LIMIT 1`,
      [req.user.sub]
    );

    if (teacherRows.length === 0) {
      return res.status(403).json({ error: 'Teacher role required' });
    }

    const quizRows = await query(
      `SELECT q.id, q.school_id, q.teacher_id, q.class_name, q.title, q.description, q.due_date, q.review_mode, q.created_at, q.updated_at,
              (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
              (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS attempt_count
       FROM quizzes q
       WHERE q.id = ? AND q.teacher_id = ?
       LIMIT 1`,
      [req.params.quizId, req.user.sub]
    );

    if (quizRows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const questionRows = await query(
      `SELECT qq.id AS question_id, qq.prompt, qq.sort_order,
              qo.id AS option_id, qo.option_text, qo.is_correct, qo.sort_order AS option_sort_order
       FROM quiz_questions qq
       LEFT JOIN quiz_options qo ON qo.question_id = qq.id
       WHERE qq.quiz_id = ?
       ORDER BY qq.sort_order ASC, qo.sort_order ASC`,
      [req.params.quizId]
    );

    const questions = [];
    const questionMap = new Map();

    for (const row of questionRows) {
      const questionId = toId(row.question_id);
      let question = questionMap.get(questionId);
      if (!question) {
        question = {
          id: questionId,
          prompt: row.prompt,
          sort_order: Number(row.sort_order ?? 0),
          options: [],
        };
        questionMap.set(questionId, question);
        questions.push(question);
      }

      if (row.option_id) {
        question.options.push({
          id: toId(row.option_id),
          option_text: row.option_text,
          is_correct: Boolean(row.is_correct),
          sort_order: Number(row.option_sort_order ?? 0),
        });
      }
    }

    return res.json({
      ...mapQuizSummary(quizRows[0]),
      questions,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/teachers/me/quizzes', authRequired, async (req, res) => {
  try {
    const teacherRows = await query(
      `SELECT id
       FROM users
       WHERE id = ? AND role = 'teacher'
       LIMIT 1`,
      [req.user.sub]
    );

    if (teacherRows.length === 0) {
      return res.status(403).json({ error: 'Teacher role required' });
    }

    if (!req.user.school_id) {
      return res.status(400).json({ error: 'School is required to post a quiz' });
    }

    const {
      title,
      description = null,
      class_name,
      due_date = null,
      review_mode = 'none',
      questions = [],
    } = req.body;

    if (!title || !class_name) {
      return res.status(400).json({ error: 'title and class_name are required' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    const normalizedReviewMode = normalizeQuizReviewMode(review_mode);
    if (!normalizedReviewMode) {
      return res.status(400).json({ error: 'review_mode must be one of: none, wrong_only, correct_only, both' });
    }

    const normalizedQuestions = questions.map((question, index) => {
      const prompt = String(question?.prompt ?? '').trim();
      const rawOptions = Array.isArray(question?.options) ? question.options : [];
      const options = rawOptions
        .map((option, optionIndex) => ({
          text: String(option?.text ?? '').trim(),
          is_correct: Boolean(option?.is_correct),
          sort_order: optionIndex + 1,
        }))
        .filter((option) => option.text.length > 0);

      if (!prompt) {
        throw new Error(`Question ${index + 1} needs a prompt`);
      }

      if (options.length < 2) {
        throw new Error(`Question ${index + 1} needs at least two answer choices`);
      }

      const correctChoices = options.filter((option) => option.is_correct);
      if (correctChoices.length !== 1) {
        throw new Error(`Question ${index + 1} needs exactly one correct answer`);
      }

      return { prompt, options };
    });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [quizResult] = await connection.execute(
        `INSERT INTO quizzes (school_id, teacher_id, class_name, title, description, due_date, review_mode)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.school_id, req.user.sub, class_name, title, description ?? null, due_date || null, normalizedReviewMode]
      );

      const quizId = quizResult.insertId;

      for (let questionIndex = 0; questionIndex < normalizedQuestions.length; questionIndex += 1) {
        const question = normalizedQuestions[questionIndex];
        const [questionResult] = await connection.execute(
          `INSERT INTO quiz_questions (quiz_id, prompt, sort_order)
           VALUES (?, ?, ?)`,
          [quizId, question.prompt, questionIndex + 1]
        );

        const questionId = questionResult.insertId;

        for (const option of question.options) {
          await connection.execute(
            `INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order)
             VALUES (?, ?, ?, ?)`,
            [questionId, option.text, option.is_correct ? 1 : 0, option.sort_order]
          );
        }
      }

      await connection.execute(
        `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
         VALUES (?, ?, 'quiz.created', ?, ?)`,
        [
          req.user.school_id,
          req.user.sub,
          String(quizId),
          JSON.stringify({ title, class_name, question_count: normalizedQuestions.length }),
        ]
      );

      await connection.commit();
      return res.status(201).json({
        id: toId(quizId),
        school_id: toId(req.user.school_id),
        teacher_id: toId(req.user.sub),
        class_name,
        title,
        description,
        due_date,
        review_mode: normalizedReviewMode,
        question_count: normalizedQuestions.length,
        attempt_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/teachers/me/quizzes/:quizId', authRequired, async (req, res) => {
  try {
    const teacherRows = await query(
      `SELECT id
       FROM users
       WHERE id = ? AND role = 'teacher'
       LIMIT 1`,
      [req.user.sub]
    );

    if (teacherRows.length === 0) {
      return res.status(403).json({ error: 'Teacher role required' });
    }

    const {
      title,
      description = null,
      class_name,
      due_date = null,
      review_mode = 'none',
      questions,
    } = req.body;

    if (!title || !class_name) {
      return res.status(400).json({ error: 'title and class_name are required' });
    }

    const normalizedReviewMode = normalizeQuizReviewMode(review_mode);
    if (!normalizedReviewMode) {
      return res.status(400).json({ error: 'review_mode must be one of: none, wrong_only, correct_only, both' });
    }
    const hasQuestionUpdate = Array.isArray(questions);
    let normalizedQuestions = [];

    if (hasQuestionUpdate) {
      if (questions.length === 0) {
        return res.status(400).json({ error: 'At least one question is required when updating questions' });
      }

      normalizedQuestions = questions.map((question, index) => {
        const prompt = String(question?.prompt ?? '').trim();
        const rawOptions = Array.isArray(question?.options) ? question.options : [];
        const options = rawOptions
          .map((option, optionIndex) => ({
            text: String(option?.text ?? '').trim(),
            is_correct: Boolean(option?.is_correct),
            sort_order: optionIndex + 1,
          }))
          .filter((option) => option.text.length > 0);

        if (!prompt) {
          throw new Error(`Question ${index + 1} needs a prompt`);
        }

        if (options.length < 2) {
          throw new Error(`Question ${index + 1} needs at least two answer choices`);
        }

        const correctChoices = options.filter((option) => option.is_correct);
        if (correctChoices.length !== 1) {
          throw new Error(`Question ${index + 1} needs exactly one correct answer`);
        }

        return { prompt, options };
      });
    }

    const quizRows = await query(
      `SELECT id,
              (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = quizzes.id) AS attempt_count
       FROM quizzes
       WHERE id = ? AND teacher_id = ?
       LIMIT 1`,
      [req.params.quizId, req.user.sub]
    );

    if (quizRows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const attemptCount = Number(quizRows[0].attempt_count ?? 0);
    if (hasQuestionUpdate && attemptCount > 0) {
      return res.status(409).json({ error: 'Cannot edit questions after learners have submitted attempts' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        `UPDATE quizzes
         SET class_name = ?, title = ?, description = ?, due_date = ?, review_mode = ?
         WHERE id = ? AND teacher_id = ?`,
        [class_name, title, description ?? null, due_date || null, normalizedReviewMode, req.params.quizId, req.user.sub]
      );

      if (hasQuestionUpdate) {
        await connection.execute('DELETE FROM quiz_questions WHERE quiz_id = ?', [req.params.quizId]);

        for (let questionIndex = 0; questionIndex < normalizedQuestions.length; questionIndex += 1) {
          const question = normalizedQuestions[questionIndex];
          const [questionResult] = await connection.execute(
            `INSERT INTO quiz_questions (quiz_id, prompt, sort_order)
             VALUES (?, ?, ?)`,
            [req.params.quizId, question.prompt, questionIndex + 1]
          );

          const questionId = questionResult.insertId;
          for (const option of question.options) {
            await connection.execute(
              `INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order)
               VALUES (?, ?, ?, ?)`,
              [questionId, option.text, option.is_correct ? 1 : 0, option.sort_order]
            );
          }
        }
      }

      await connection.execute(
        `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
         VALUES (?, ?, 'quiz.updated', ?, ?)`,
        [
          req.user.school_id,
          req.user.sub,
          String(req.params.quizId),
          JSON.stringify({
            title,
            class_name,
            due_date,
            review_mode: normalizedReviewMode,
            questions_updated: hasQuestionUpdate,
          }),
        ]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const rows = await query(
      `SELECT q.id, q.school_id, q.teacher_id, q.class_name, q.title, q.description, q.due_date, q.review_mode, q.created_at, q.updated_at,
              (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
              (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS attempt_count
       FROM quizzes q
       WHERE q.id = ? AND q.teacher_id = ?
       LIMIT 1`,
      [req.params.quizId, req.user.sub]
    );

    return res.json(mapQuizSummary(rows[0]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/children/:childId/quizzes', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Parent role required' });
    }

    const childRows = await query(
      `SELECT c.id, c.full_name, c.class_name, c.grade, c.school_id
       FROM children c
       INNER JOIN parent_children pc ON pc.child_id = c.id
       WHERE pc.parent_id = ? AND c.id = ? AND c.school_id = ?
       LIMIT 1`,
      [req.user.sub, req.params.childId, req.user.school_id]
    );

    if (childRows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const child = mapChild(childRows[0]);

    const rows = await query(
      `SELECT q.id AS quiz_id, q.school_id, q.teacher_id, q.class_name, q.title, q.description, q.due_date, q.review_mode, q.created_at, q.updated_at,
              qq.id AS question_id, qq.prompt AS question_prompt, qq.sort_order AS question_sort_order,
              qo.id AS option_id, qo.option_text, qo.is_correct, qo.sort_order AS option_sort_order,
              qa.id AS attempt_id, qa.child_id AS attempt_child_id, qa.submitted_by_user_id AS attempt_submitted_by_user_id,
              qa.score AS attempt_score, qa.total_questions AS attempt_total_questions, qa.answers_json AS attempt_answers,
              qa.submitted_at AS attempt_submitted_at
       FROM quizzes q
       LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
       LEFT JOIN quiz_options qo ON qo.question_id = qq.id
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.child_id = ?
       WHERE q.school_id = ? AND q.class_name = ?
       ORDER BY q.created_at DESC, qq.sort_order ASC, qo.sort_order ASC`,
      [child.id, child.school_id, child.class_name]
    );

    const quizzes = groupQuizRows(rows).map(buildChildQuizReview);
    return res.json({ child, quizzes });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/children/:childId/quizzes/:quizId/submit', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Parent role required' });
    }

    const childRows = await query(
      `SELECT c.id, c.full_name, c.class_name, c.grade, c.school_id
       FROM children c
       INNER JOIN parent_children pc ON pc.child_id = c.id
       WHERE pc.parent_id = ? AND c.id = ? AND c.school_id = ?
       LIMIT 1`,
      [req.user.sub, req.params.childId, req.user.school_id]
    );

    if (childRows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const child = mapChild(childRows[0]);

    const quizRows = await query(
      `SELECT id
       FROM quizzes
       WHERE id = ? AND school_id = ? AND class_name = ?
       LIMIT 1`,
      [req.params.quizId, child.school_id, child.class_name]
    );

    if (quizRows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found for this child' });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'answers array is required' });
    }

    const questionRows = await query(
      `SELECT qq.id AS question_id, qq.prompt, qo.id AS option_id, qo.is_correct
       FROM quiz_questions qq
       INNER JOIN quiz_options qo ON qo.question_id = qq.id
       WHERE qq.quiz_id = ?
       ORDER BY qq.sort_order ASC, qo.sort_order ASC`,
      [req.params.quizId]
    );

    if (questionRows.length === 0) {
      return res.status(404).json({ error: 'Quiz questions were not found' });
    }

    const questions = new Map();
    for (const row of questionRows) {
      const questionId = toId(row.question_id);
      let question = questions.get(questionId);
      if (!question) {
        question = {
          id: questionId,
          prompt: row.prompt,
          options: [],
        };
        questions.set(questionId, question);
      }

      question.options.push({
        id: toId(row.option_id),
        is_correct: Boolean(row.is_correct),
      });
    }

    const answerMap = new Map(
      answers
        .filter((answer) => answer?.question_id && answer?.option_id)
        .map((answer) => [toId(answer.question_id), toId(answer.option_id)])
    );

    const normalizedAnswers = [];
    let score = 0;
    for (const [questionId, question] of questions.entries()) {
      const selectedOptionId = answerMap.get(questionId) ?? null;
      const selectedOption = question.options.find((option) => option.id === selectedOptionId) ?? null;
      const correct = Boolean(selectedOption?.is_correct);
      if (correct) {
        score += 1;
      }

      normalizedAnswers.push({
        question_id: questionId,
        option_id: selectedOptionId,
        correct,
      });
    }

    const totalQuestions = questions.size;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        `INSERT INTO quiz_attempts (quiz_id, child_id, submitted_by_user_id, answers_json, score, total_questions, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           submitted_by_user_id = VALUES(submitted_by_user_id),
           answers_json = VALUES(answers_json),
           score = VALUES(score),
           total_questions = VALUES(total_questions),
           submitted_at = NOW()`,
        [
          req.params.quizId,
          child.id,
          req.user.sub,
          JSON.stringify(normalizedAnswers),
          score,
          totalQuestions,
        ]
      );

      await connection.execute(
        `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
         VALUES (?, ?, 'quiz.submitted', ?, ?)`,
        [
          child.school_id,
          req.user.sub,
          String(req.params.quizId),
          JSON.stringify({ child_id: child.id, score, total_questions: totalQuestions }),
        ]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const attemptRows = await query(
      `SELECT *
       FROM quiz_attempts
       WHERE quiz_id = ? AND child_id = ?
       LIMIT 1`,
      [req.params.quizId, child.id]
    );

    return res.status(201).json({
      id: attemptRows[0] ? toId(attemptRows[0].id) : null,
      quiz_id: toId(req.params.quizId),
      child_id: child.id,
      submitted_by_user_id: toId(req.user.sub),
      score,
      total_questions: totalQuestions,
      submitted_answers: normalizedAnswers,
      submitted_at: attemptRows[0]?.submitted_at ?? new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


app.post('/api/teachers/me/attendance', authRequired, async (req, res) => {
  try {
    const { attendance_records } = req.body; // Array of { child_id, status }

    if (!Array.isArray(attendance_records) || attendance_records.length === 0) {
      return res.status(400).json({ error: 'attendance_records array is required' });
    }

    const results = [];
    for (const record of attendance_records) {
      const result = await query(
        `INSERT INTO attendance (child_id, school_id, recorded_by_teacher_id, status, recorded_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [record.child_id, req.user.school_id, req.user.sub, record.status]
      );

      results.push({ child_id: record.child_id, attendance_id: result.insertId });
    }

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'attendance.submitted', 'bulk', ?)`,
      [req.user.school_id, req.user.sub, JSON.stringify({ count: attendance_records.length })]
    );

    return res.status(201).json({ records: results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/teachers/me/attendance/summary', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.id, c.full_name, c.class_name,
              COALESCE(a.status, 'not_marked') as status,
              a.recorded_at
       FROM children c
       LEFT JOIN attendance a ON a.child_id = c.id AND DATE(a.recorded_at) = CURDATE() AND a.school_id = ?
       WHERE c.school_id = ?
       ORDER BY c.class_name, c.full_name`,
      [req.user.school_id, req.user.school_id]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/teachers/me/homework', authRequired, async (req, res) => {
  try {
    const { title, description, class_name, due_date, attachment_url } = req.body;

    if (!title || !class_name) {
      return res.status(400).json({ error: 'title and class_name are required' });
    }

    const result = await query(
      `INSERT INTO homework (school_id, teacher_id, class_name, title, description, attachment_url, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.school_id, req.user.sub, class_name, title, description ?? null, attachment_url ?? null, due_date ?? null]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'homework.posted', ?, ?)`,
      [req.user.school_id, req.user.sub, String(result.insertId), JSON.stringify({ title, class_name })]
    );

    return res.status(201).json({ id: result.insertId, title, class_name });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/teachers/me/homework', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT h.id, h.title, h.description, h.class_name, h.due_date, h.attachment_url, h.created_at,
              COUNT(DISTINCT hr.parent_id) as read_count
       FROM homework h
        LEFT JOIN homework_reads hr ON hr.homework_id = h.id
       WHERE h.teacher_id = ?
       GROUP BY h.id
       ORDER BY h.created_at DESC`,
      [req.user.sub]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// === GATE SECURITY ENDPOINTS ===
app.get('/api/security/passes/pending', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, c.full_name AS child_full_name, c.class_name AS child_class_name
       FROM pickup_passes p
       LEFT JOIN children c ON c.id = p.child_id
       WHERE p.school_id = ? AND p.status = 'active' AND p.expires_at > NOW()
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [req.user.school_id]
    );

    return res.json(rows.map(mapToken));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// === AUDIT LOG ENDPOINTS ===
app.get('/api/audit/logs', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT a.*, u.full_name as actor_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.school_id = ?
       ORDER BY a.created_at DESC
       LIMIT 50`,
      [req.user.school_id]
    );

    return res.json(rows.map(mapAudit));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// === SCHOOL ADMIN ENDPOINTS ===
app.get('/api/admin/school', authRequired, async (req, res) => {
  try {
    // Verify user is school admin
    const adminRows = await query(
      `SELECT * FROM users WHERE id = ? AND role = "school_admin"`,
      [req.user.sub]
    );
    if (adminRows.length === 0) {
      return res.status(403).json({ error: 'School admin role required' });
    }

    const schoolRows = await query('SELECT * FROM schools WHERE id = ?', [req.user.school_id]);
    if (schoolRows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    return res.json(schoolRows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/school/attendance/summary', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT DATE(a.recorded_at) as date, a.status, COUNT(*) as count
       FROM attendance a
       WHERE a.school_id = ? AND DATE(a.recorded_at) = CURDATE()
       GROUP BY DATE(a.recorded_at), a.status`,
      [req.user.school_id]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/delegates/pending', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT dg.*, p.full_name as parent_full_name, p.email as parent_email
       FROM delegated_guardians dg
       JOIN users p ON p.id = dg.parent_id
       WHERE p.school_id = ? AND dg.status = 'pending'
       ORDER BY dg.created_at DESC`,
      [req.user.school_id]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/delegates/:delegateId/approve', authRequired, async (req, res) => {
  try {
    const { approved = true } = req.body;

    const delegateRows = await query(
      `SELECT dg.* FROM delegated_guardians dg
       JOIN users p ON p.id = dg.parent_id
       WHERE dg.id = ? AND p.school_id = ?`,
      [req.params.delegateId, req.user.school_id]
    );

    if (delegateRows.length === 0) {
      return res.status(404).json({ error: 'Delegate not found' });
    }

    const newStatus = approved ? 'approved' : 'rejected';
    await query(
      `UPDATE delegated_guardians
       SET status = ?, approved_by_admin_id = ?, approved_at = NOW()
       WHERE id = ?`,
      [newStatus, req.user.sub, req.params.delegateId]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.school_id, req.user.sub, `delegate.${approved ? 'approved' : 'rejected'}`, req.params.delegateId, JSON.stringify({ approved })]
    );

    return res.json({ id: req.params.delegateId, status: newStatus });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/audit-logs', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT a.*, u.full_name as actor_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.school_id = ?
       ORDER BY a.created_at DESC
       LIMIT 100`,
      [req.user.school_id]
    );

    return res.json(rows.map(mapAudit));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// === DELEGATED GUARDIAN ENDPOINTS ===
app.get('/api/delegates/me/passes', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, c.full_name AS child_full_name, c.class_name AS child_class_name
       FROM pickup_passes p
       LEFT JOIN children c ON c.id = p.child_id
       WHERE p.issued_by_user_id = ? AND p.status = 'active'
       ORDER BY p.created_at DESC`,
      [req.user.sub]
    );

    return res.json(rows.map(mapToken));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/delegates/me/passes', authRequired, async (req, res) => {
  try {
    const { child_id, child_name } = req.body;

    if (!child_id && !child_name) {
      return res.status(400).json({ error: 'child_id or child_name is required' });
    }

    // Generate 30-minute expiry
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 30);

    const code = `PASS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    let childRow = null;
    if (child_id) {
      const children = await query(
        `SELECT id, full_name, class_name, school_id
         FROM children
         WHERE id = ?
         LIMIT 1`,
        [child_id]
      );
      childRow = children[0] ?? null;
    }

    const result = await query(
      `INSERT INTO pickup_passes (child_id, child_name, issued_by_user_id, school_id, token_kind, code, otp, status, expires_at)
       VALUES (?, ?, ?, ?, 'qr', ?, ?, 'active', ?)`,
      [
        child_id ?? null,
        child_name ?? childRow?.full_name ?? 'Unknown child',
        req.user.sub,
        req.user.school_id,
        code,
        otp,
        expiryTime,
      ]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'pickup_pass.generated', ?, ?)`,
      [req.user.school_id, req.user.sub, String(result.insertId), JSON.stringify({ child_id })]
    );

    return res.status(201).json({
      id: result.insertId,
      child_id,
      code,
      otp,
      expires_at: expiryTime,
      status: 'active',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// === OPERATIONS API (Phase 2) ===
app.post('/api/ops/admin/children/onboard', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;

    const {
      child_full_name,
      class_name,
      grade,
      parent_identifier = null,
      parent_invite = null,
      relationship = 'parent',
    } = req.body;

    if (!child_full_name || !class_name || !grade) {
      return res.status(400).json({ error: 'child_full_name, class_name and grade are required' });
    }

    // Validate parent_identifier if provided
    if (parent_identifier) {
      const parentRows = await query(
        `SELECT id FROM users WHERE parent_identifier = ? AND school_id = ? AND role = 'parent' LIMIT 1`,
        [parent_identifier, req.user.school_id]
      );
      if (parentRows.length === 0) {
        return res.status(400).json({ error: 'Invalid parent_identifier: parent does not exist in this school' });
      }
    }

    const result = await query(
      `INSERT INTO children (full_name, school_id, class_name, grade)
       VALUES (?, ?, ?, ?)`,
      [child_full_name, req.user.school_id, class_name, grade]
    );

    if (parent_identifier) {
      // Get the parent id from parent_identifier
      const parentRows = await query(
        `SELECT id FROM users WHERE parent_identifier = ? AND school_id = ? LIMIT 1`,
        [parent_identifier, req.user.school_id]
      );
      
      if (parentRows.length > 0) {
        await query(
          `INSERT INTO parent_children (parent_id, child_id, relationship)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE relationship = VALUES(relationship)`,
          [parentRows[0].id, result.insertId, relationship]
        );
      }
    }

    if (parent_invite?.email || parent_invite?.phone) {
      await query(
        `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
         VALUES (?, ?, 'parent.invite.created', ?, ?)`,
        [
          req.user.school_id,
          req.user.sub,
          String(result.insertId),
          JSON.stringify({ parent_invite, relationship }),
        ]
      );
    }

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'child.onboarded', ?, ?)`,
      [
        req.user.school_id,
        req.user.sub,
        String(result.insertId),
        JSON.stringify({ child_full_name, class_name, grade, parent_identifier }),
      ]
    );

    return res.status(201).json({ id: result.insertId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/admin/attendance/review', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin', 'teacher'])) return;

    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const rows = await query(
      `SELECT c.class_name, c.id AS child_id, c.full_name,
              COALESCE(a.status, 'absent') AS status,
              a.reason,
              a.marked_by,
              a.attendance_date
       FROM children c
       LEFT JOIN attendance a
         ON a.child_id = c.id AND a.attendance_date = ?
       WHERE c.school_id = ?
       ORDER BY c.class_name ASC, c.full_name ASC`,
      [date, req.user.school_id]
    );

    if (String(req.query.csv || '').toLowerCase() === 'true') {
      const csvRows = [
        ['class_name', 'child_id', 'full_name', 'status', 'reason', 'marked_by', 'attendance_date'],
        ...rows.map((row) => [
          row.class_name,
          row.child_id,
          row.full_name,
          row.status,
          row.reason ?? '',
          row.marked_by ?? '',
          row.attendance_date ?? date,
        ]),
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${date}.csv"`);
      return res.send(toCsv(csvRows));
    }

    const byClass = {};
    for (const row of rows) {
      if (!byClass[row.class_name]) {
        byClass[row.class_name] = { class_name: row.class_name, present: 0, absent: 0, total: 0, learners: [] };
      }
      byClass[row.class_name].total += 1;
      if (row.status === 'present') byClass[row.class_name].present += 1;
      else byClass[row.class_name].absent += 1;
      byClass[row.class_name].learners.push(row);
    }

    return res.json({ date, classes: Object.values(byClass) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/admin/delegates', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;

    const status = String(req.query.status || 'pending');
    const rows =
      status === 'all'
        ? await query(
            `SELECT dg.id, dg.parent_id, dg.full_name AS delegate_name, dg.phone_number AS phone,
                    dg.relationship, dg.status, dg.approved_by_admin_id AS approved_by,
                    dg.created_at, p.full_name AS parent_name
             FROM delegated_guardians dg
             INNER JOIN users p ON p.id = dg.parent_id
             WHERE p.school_id = ?
             ORDER BY dg.created_at DESC`,
            [req.user.school_id]
          )
        : await query(
            `SELECT dg.id, dg.parent_id, dg.full_name AS delegate_name, dg.phone_number AS phone,
                    dg.relationship, dg.status, dg.approved_by_admin_id AS approved_by,
                    dg.created_at, p.full_name AS parent_name
             FROM delegated_guardians dg
             INNER JOIN users p ON p.id = dg.parent_id
             WHERE p.school_id = ? AND dg.status = ?
             ORDER BY dg.created_at DESC`,
            [req.user.school_id, status]
          );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/admin/parents', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;

    const rows = await query(
      `SELECT id, full_name, email, parent_identifier AS parent_id, role, school_id,
              is_active, frozen_at, frozen_reason, created_at
       FROM users
       WHERE school_id = ? AND role = 'parent'
       ORDER BY created_at DESC`,
      [req.user.school_id]
    );

    return res.json(rows.map((row) => ({
      ...mapUser(row),
      parent_id: row.parent_id,
      frozen_at: row.frozen_at,
      frozen_reason: row.frozen_reason,
      is_active: Boolean(row.is_active),
    })));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/admin/delegates/:delegateId/decision', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;
    const { decision } = req.body;
    const nextStatus = decision === 'approve' ? 'approved' : 'rejected';

    await query(
      `UPDATE delegated_guardians dg
       JOIN users p ON p.id = dg.parent_id
       SET dg.status = ?, dg.approved_by_admin_id = ?, dg.approved_at = NOW()
       WHERE dg.id = ? AND p.school_id = ?`,
      [nextStatus, req.user.sub, req.params.delegateId, req.user.school_id]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.school_id,
        req.user.sub,
        nextStatus === 'approved' ? 'delegate.approved' : 'delegate.rejected',
        req.params.delegateId,
        JSON.stringify({ decision: nextStatus }),
      ]
    );

    return res.json({ id: req.params.delegateId, status: nextStatus });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/admin/accounts/:userId/freeze', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;
    const { freeze = true, reason = null } = req.body;

    await query(
      `UPDATE users
       SET frozen_at = ?, frozen_by = ?, frozen_reason = ?
       WHERE id = ? AND school_id = ?`,
      [freeze ? new Date() : null, freeze ? req.user.sub : null, freeze ? reason : null, req.params.userId, req.user.school_id]
    );

    if (freeze) {
      await query(
        `UPDATE pickup_passes
         SET status = 'rejected', used_at = NOW(), used_by = ?
         WHERE issued_by_user_id = ? AND status = 'active'`,
        [req.user.sub, req.params.userId]
      );
    }

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'account.freeze.updated', ?, ?)`,
      [req.user.school_id, req.user.sub, req.params.userId, JSON.stringify({ freeze, reason })]
    );

    return res.json({ user_id: req.params.userId, freeze, reason });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/admin/teachers', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;

    const rows = await query(
      `SELECT id, full_name, email, role, school_id, teacher_identifier, is_active, created_at
       FROM users
       WHERE school_id = ? AND role = 'teacher'
       ORDER BY created_at DESC`,
      [req.user.school_id]
    );

    const assignments = await query(
      `SELECT teacher_id, class_name, grade_level
       FROM teacher_class_assignments
       WHERE school_id = ?
       ORDER BY class_name ASC, grade_level ASC`,
      [req.user.school_id]
    );

    const byTeacher = new Map();
    for (const row of assignments) {
      const key = toId(row.teacher_id);
      const list = byTeacher.get(key) || [];
      list.push({
        class_name: row.class_name,
        grade_level: Number(row.grade_level),
      });
      byTeacher.set(key, list);
    }

    return res.json(
      rows.map((row) => ({
        ...mapUser(row),
        teacher_id: row.teacher_identifier ?? null,
        is_active: Boolean(row.is_active),
        assignments: byTeacher.get(toId(row.id)) || [],
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/admin/teachers', authRequired, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;
    const { full_name, email, password = generateTemporaryPassword(12), teacher_id, assignments = [] } = req.body;
    if (!full_name || !email) {
      return res.status(400).json({ error: 'full_name and email are required' });
    }

    if (!Array.isArray(assignments)) {
      return res.status(400).json({ error: 'assignments must be an array' });
    }

    const normalizedTeacherId = teacher_id == null ? null : String(teacher_id).trim();
    if (normalizedTeacherId && normalizedTeacherId.length > 64) {
      return res.status(400).json({ error: 'teacher_id must be 64 characters or fewer' });
    }

    const normalizedAssignments = assignments
      .map((entry) => ({
        class_name: String(entry?.class_name ?? '').trim(),
        grade_level: parseGradeLevel(entry?.grade_level ?? entry?.grade),
      }))
      .filter((entry) => entry.class_name);

    for (const assignment of normalizedAssignments) {
      if (assignment.grade_level == null) {
        return res.status(400).json({ error: 'Each assigned class must have a valid grade value' });
      }
      if (assignment.grade_level > 7 || assignment.grade_level < 1) {
        return res.status(400).json({ error: 'Assigned classes cannot exceed Grade 7' });
      }
    }

    const dedupedAssignments = Array.from(
      new Map(
        normalizedAssignments.map((entry) => [
          `${entry.class_name.toLowerCase()}::${entry.grade_level}`,
          entry,
        ])
      ).values()
    );

    await connection.beginTransaction();

    if (normalizedTeacherId) {
      const [teacherIdRows] = await connection.execute(
        `SELECT id FROM users WHERE school_id = ? AND teacher_identifier = ? LIMIT 1`,
        [req.user.school_id, normalizedTeacherId]
      );
      if (teacherIdRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'This teacher_id is already in use for this school' });
      }
    }

    const hash = await bcrypt.hash(String(password), 12);

    const [result] = await connection.execute(
      `INSERT INTO users (full_name, email, teacher_identifier, password_hash, role, school_id, is_active)
       VALUES (?, ?, ?, ?, 'teacher', ?, 1)`,
      [full_name, email, normalizedTeacherId, hash, req.user.school_id]
    );

    const credentialsEmailed = await sendTemporaryCredentialsEmail({
      toEmail: email,
      fullName: full_name,
      temporaryPassword: password,
    });

    for (const assignment of dedupedAssignments) {
      await connection.execute(
        `INSERT INTO teacher_class_assignments (school_id, teacher_id, class_name, grade_level)
         VALUES (?, ?, ?, ?)`,
        [req.user.school_id, result.insertId, assignment.class_name, assignment.grade_level]
      );
    }

    await connection.execute(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'teacher.created', ?, ?)`,
      [
        req.user.school_id,
        req.user.sub,
        String(result.insertId),
        JSON.stringify({ email, teacher_id: normalizedTeacherId, assignments: dedupedAssignments, credentials_emailed: credentialsEmailed }),
      ]
    );

    await connection.commit();

    return res.status(201).json({
      id: result.insertId,
      full_name,
      email,
      teacher_id: normalizedTeacherId,
      role: 'teacher',
      assignments: dedupedAssignments,
      credentials_emailed: credentialsEmailed,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // no-op
    }
    return res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.post('/api/ops/admin/parents', authRequired, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;
    const { full_name, email, parent_id } = req.body;
    if (!full_name || !email) {
      return res.status(400).json({ error: 'full_name and email are required' });
    }

    const normalizedFullName = normalizeFullName(full_name);
    if (!isValidFullName(normalizedFullName)) {
      return res.status(400).json({ error: 'Please provide a valid full name (first and last name).' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedParentId = parent_id == null ? null : String(parent_id).trim();
    if (normalizedParentId && normalizedParentId.length > 64) {
      return res.status(400).json({ error: 'parent_id must be 64 characters or fewer' });
    }

    const temporaryPassword = generateTemporaryPassword(12);
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await connection.beginTransaction();

    const [existingRows] = await connection.execute(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [normalizedEmail]
    );

    if (existingRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    if (normalizedParentId) {
      const [parentIdRows] = await connection.execute(
        `SELECT id
         FROM users
         WHERE school_id = ? AND parent_identifier = ?
         LIMIT 1`,
        [req.user.school_id, normalizedParentId]
      );

      if (parentIdRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'This parent_id is already in use for this school' });
      }
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO users (full_name, email, parent_identifier, password_hash, role, school_id, is_active)
       VALUES (?, ?, ?, ?, 'parent', ?, 1)`,
      [normalizedFullName, normalizedEmail, normalizedParentId, passwordHash, req.user.school_id]
    );

    const credentialsEmailed = await sendTemporaryCredentialsEmail({
      toEmail: normalizedEmail,
      fullName: normalizedFullName,
      temporaryPassword,
    });

    await connection.execute(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'parent.created', ?, ?)`,
      [
        req.user.school_id,
        req.user.sub,
        String(insertResult.insertId),
        JSON.stringify({
          email: normalizedEmail,
          parent_id: normalizedParentId,
          sent_credentials_email: credentialsEmailed,
        }),
      ]
    );

    await connection.commit();

    return res.status(201).json({
      id: insertResult.insertId,
      full_name: normalizedFullName,
      email: normalizedEmail,
      role: 'parent',
      parent_id: normalizedParentId,
      credentials_emailed: credentialsEmailed,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // no-op
    }
    return res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.get('/api/ops/admin/classes', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;
    const rows = await query(
      `SELECT id, name, grade_level, capacity, created_at
       FROM classes
       WHERE school_id = ?
       ORDER BY name ASC`,
      [req.user.school_id]
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/admin/classes', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;
    const { name, grade_level, capacity } = req.body;
    
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Class name is required' });
    }

    if (!grade_level || !String(grade_level).trim()) {
      return res.status(400).json({ error: 'Grade level is required' });
    }

    if (capacity === undefined || capacity === null || capacity === '') {
      return res.status(400).json({ error: 'Capacity is required' });
    }

    const capacityNum = Number(capacity);
    if (isNaN(capacityNum) || capacityNum < 1) {
      return res.status(400).json({ error: 'Capacity must be a positive number' });
    }

    const normalizedName = String(name).trim();
    if (normalizedName.length > 80) {
      return res.status(400).json({ error: 'Class name must be 80 characters or fewer' });
    }

    const existing = await query(
      `SELECT id FROM classes WHERE school_id = ? AND LOWER(name) = LOWER(?)`,
      [req.user.school_id, normalizedName]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'A class with this name already exists in your school' });
    }

    const result = await query(
      `INSERT INTO classes (school_id, name, grade_level, capacity)
       VALUES (?, ?, ?, ?)`,
      [req.user.school_id, normalizedName, String(grade_level).trim(), capacityNum]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'class.created', ?, ?)`,
      [req.user.school_id, req.user.sub, String(result.insertId), JSON.stringify({ name: normalizedName, grade_level: String(grade_level).trim(), capacity: capacityNum })]
    );

    return res.status(201).json({
      id: result.insertId,
      name: normalizedName,
      grade_level: String(grade_level).trim(),
      capacity: capacityNum,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/ops/admin/classes/:classId', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;
    const { classId } = req.params;

    const classRows = await query(
      `SELECT id FROM classes WHERE school_id = ? AND id = ?`,
      [req.user.school_id, classId]
    );

    if (!classRows || classRows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    await query(`DELETE FROM classes WHERE id = ?`, [classId]);

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'class.deleted', ?, ?)`,
      [req.user.school_id, req.user.sub, String(classId), JSON.stringify({ deleted_at: new Date().toISOString() })]
    );

    return res.status(200).json({ id: classId, deleted: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/ops/admin/teachers/:teacherId', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;
    const { full_name, email, is_active } = req.body;

    await query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           is_active = COALESCE(?, is_active)
       WHERE id = ? AND school_id = ? AND role = 'teacher'`,
      [full_name ?? null, email ?? null, typeof is_active === 'boolean' ? Number(is_active) : null, req.params.teacherId, req.user.school_id]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'teacher.updated', ?, ?)`,
      [req.user.school_id, req.user.sub, req.params.teacherId, JSON.stringify({ full_name, email, is_active })]
    );

    return res.json({ id: req.params.teacherId, updated: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/admin/teachers/:teacherId/deactivate', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;

    await query(
      `UPDATE users SET is_active = 0 WHERE id = ? AND school_id = ? AND role = 'teacher'`,
      [req.params.teacherId, req.user.school_id]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'teacher.deactivated', ?, '{}')`,
      [req.user.school_id, req.user.sub, req.params.teacherId]
    );

    return res.json({ id: req.params.teacherId, active: false });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/admin/teachers/:teacherId/reactivate', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;

    await query(
      `UPDATE users SET is_active = 1 WHERE id = ? AND school_id = ? AND role = 'teacher'`,
      [req.params.teacherId, req.user.school_id]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'teacher.reactivated', ?, '{}')`,
      [req.user.school_id, req.user.sub, req.params.teacherId]
    );

    return res.json({ id: req.params.teacherId, active: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/ops/admin/teachers/:teacherId/assignments', authRequired, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!requireRoles(req, res, ['school_admin'])) return;

    const { assignments = [] } = req.body;

    if (!Array.isArray(assignments)) {
      return res.status(400).json({ error: 'assignments must be an array' });
    }

    const normalizedAssignments = assignments
      .map((entry) => ({
        class_name: String(entry?.class_name ?? '').trim(),
        grade_level: parseGradeLevel(entry?.grade_level ?? entry?.grade),
      }))
      .filter((entry) => entry.class_name);

    for (const assignment of normalizedAssignments) {
      if (assignment.grade_level == null) {
        return res.status(400).json({ error: 'Each assigned class must have a valid grade value' });
      }
      if (assignment.grade_level > 7 || assignment.grade_level < 1) {
        return res.status(400).json({ error: 'Assigned classes cannot exceed Grade 7' });
      }
    }

    const dedupedAssignments = Array.from(
      new Map(
        normalizedAssignments.map((entry) => [
          `${entry.class_name.toLowerCase()}::${entry.grade_level}`,
          entry,
        ])
      ).values()
    );

    await connection.beginTransaction();

    // Delete existing assignments for this teacher
    await connection.execute(
      `DELETE FROM teacher_class_assignments WHERE teacher_id = ?`,
      [req.params.teacherId]
    );

    // Insert new assignments
    for (const assignment of dedupedAssignments) {
      await connection.execute(
        `INSERT INTO teacher_class_assignments (school_id, teacher_id, class_name, grade_level)
         VALUES (?, ?, ?, ?)`,
        [req.user.school_id, req.params.teacherId, assignment.class_name, assignment.grade_level]
      );
    }

    await connection.execute(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'teacher.assignments_updated', ?, ?)`,
      [
        req.user.school_id,
        req.user.sub,
        String(req.params.teacherId),
        JSON.stringify({ assignments: dedupedAssignments }),
      ]
    );

    await connection.commit();

    return res.status(200).json({
      id: req.params.teacherId,
      assignments_updated: true,
      assignments: dedupedAssignments,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // no-op
    }
    return res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.get('/api/ops/admin/audit', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin', 'system_admin'])) return;

    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 25), 1), 100);

    // For now, return empty array to avoid query issues
    // TODO: Fix complex parameterized query with optional filters
    return res.json({ page, pageSize, rows: [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/admin/child-link-requests', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin', 'system_admin'])) return;
    
    const status = req.query.status ? String(req.query.status) : 'pending';
    
    // For now, return empty array as this feature is not yet implemented
    // This prevents 404 errors in the admin dashboard
    return res.json([]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/admin/child-link-requests/:requestId/decision', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['school_admin', 'system_admin'])) return;
    
    const { decision } = req.body;
    if (!decision || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }
    
    // For now, return success as this feature is not yet implemented
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/teacher/attendance/batch', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['teacher', 'school_admin'])) return;
    const { attendance_date, entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries are required' });
    }

    const date = attendance_date || new Date().toISOString().slice(0, 10);
    for (const entry of entries) {
      await query(
        `INSERT INTO attendance (child_id, school_id, attendance_date, recorded_by_teacher_id, marked_by, status, reason, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           reason = VALUES(reason),
           marked_by = VALUES(marked_by),
           recorded_by_teacher_id = VALUES(recorded_by_teacher_id),
           recorded_at = NOW()`,
        [
          entry.child_id,
          req.user.school_id,
          date,
          req.user.sub,
          req.user.sub,
          entry.status,
          entry.reason ?? null,
        ]
      );
    }

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'attendance.batch.submitted', ?, ?)`,
      [req.user.school_id, req.user.sub, date, JSON.stringify({ count: entries.length })]
    );

    return res.status(201).json({ attendance_date: date, count: entries.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/teacher/homework', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['teacher', 'school_admin'])) return;
    const { class_name, title, description = null, due_date = null, attachment_url = null } = req.body;
    if (!class_name || !title) {
      return res.status(400).json({ error: 'class_name and title are required' });
    }

    const result = await query(
      `INSERT INTO homework (school_id, teacher_id, class_name, title, description, attachment_url, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.school_id, req.user.sub, class_name, title, description, attachment_url, due_date]
    );

    await query(
      `INSERT INTO notifications (school_id, user_id, category, title, body, data)
       SELECT ?, pc.parent_id, 'homework', ?, ?, ?
       FROM children c
       INNER JOIN parent_children pc ON pc.child_id = c.id
       WHERE c.school_id = ? AND c.class_name = ?`,
      [
        req.user.school_id,
        `Homework: ${title}`,
        description,
        JSON.stringify({ homework_id: result.insertId, class_name, due_date }),
        req.user.school_id,
        class_name,
      ]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'homework.posted', ?, ?)`,
      [req.user.school_id, req.user.sub, String(result.insertId), JSON.stringify({ class_name, title })]
    );

    return res.status(201).json({ id: result.insertId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/teacher/homework', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['teacher', 'school_admin'])) return;
    const rows = await query(
      `SELECT h.*, COUNT(DISTINCT hr.parent_id) AS read_count
       FROM homework h
       LEFT JOIN homework_reads hr ON hr.homework_id = h.id
       WHERE h.school_id = ? AND h.teacher_id = ?
       GROUP BY h.id
       ORDER BY h.created_at DESC`,
      [req.user.school_id, req.user.sub]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/teacher/class-alerts', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['teacher', 'school_admin'])) return;
    const { class_name, title, message, priority = 'medium' } = req.body;
    if (!class_name || !title || !message) {
      return res.status(400).json({ error: 'class_name, title and message are required' });
    }

    const result = await query(
      `INSERT INTO class_alerts (school_id, created_by_user_id, class_name, title, message, priority)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.school_id, req.user.sub, class_name, title, message, priority]
    );

    await query(
      `INSERT INTO notifications (school_id, user_id, category, title, body, data)
       SELECT ?, pc.parent_id, 'class_alert', ?, ?, ?
       FROM children c
       INNER JOIN parent_children pc ON pc.child_id = c.id
       WHERE c.school_id = ? AND c.class_name = ?`,
      [
        req.user.school_id,
        `Class Alert: ${title}`,
        message,
        JSON.stringify({ class_alert_id: result.insertId, class_name, priority }),
        req.user.school_id,
        class_name,
      ]
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'class_alert.posted', ?, ?)`,
      [req.user.school_id, req.user.sub, String(result.insertId), JSON.stringify({ class_name, priority })]
    );

    return res.status(201).json({ id: result.insertId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/parent/homework', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent', 'delegate'])) return;

    const rows = await query(
      `SELECT DISTINCT h.id, h.title, h.description, h.class_name, h.due_date, h.attachment_url, h.created_at,
              hr.read_at
       FROM parent_children pc
       INNER JOIN children c ON c.id = pc.child_id
       INNER JOIN homework h ON h.school_id = c.school_id AND h.class_name = c.class_name
       LEFT JOIN homework_reads hr ON hr.homework_id = h.id AND hr.parent_id = ?
       WHERE pc.parent_id = ?
       ORDER BY h.created_at DESC`,
      [req.user.sub, req.user.sub]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/parent/homework/:homeworkId/read', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent', 'delegate'])) return;

    await query(
      `INSERT INTO homework_reads (homework_id, parent_id, read_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE read_at = NOW()`,
      [req.params.homeworkId, req.user.sub]
    );

    return res.status(201).json({ homework_id: req.params.homeworkId, read: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/parent/notifications', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent', 'delegate'])) return;
    const rows = await query(
      `SELECT id, category, title, body, data, read_at, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.sub]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/parent/attendance', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent'])) return;

    const rows = await query(
      `SELECT c.id AS child_id,
              c.full_name,
              c.class_name,
              c.grade,
              a.attendance_date,
              a.status,
              a.reason,
              a.marked_by
       FROM parent_children pc
       INNER JOIN children c ON c.id = pc.child_id
       LEFT JOIN attendance a ON a.child_id = c.id AND a.school_id = ?
       WHERE pc.parent_id = ?
       ORDER BY c.full_name ASC, a.attendance_date DESC
       LIMIT 400`,
      [req.user.school_id, req.user.sub]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/parent/teachers', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent'])) return;

    const rows = await query(
      `SELECT DISTINCT t.id, t.full_name, t.email, c.class_name
       FROM parent_children pc
       INNER JOIN children c ON c.id = pc.child_id
       INNER JOIN users t ON t.school_id = c.school_id AND t.role = 'teacher'
       WHERE pc.parent_id = ?
         AND (
           EXISTS (
             SELECT 1
             FROM homework h
             WHERE h.school_id = c.school_id AND h.class_name = c.class_name AND h.teacher_id = t.id
           )
           OR EXISTS (
             SELECT 1
             FROM class_alerts ca
             WHERE ca.school_id = c.school_id
               AND ca.class_name = c.class_name
               AND ca.created_by_user_id = t.id
           )
         )
       ORDER BY t.full_name ASC`,
      [req.user.sub]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/parent/messages', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent'])) return;
    const teacherId = Number(req.query.teacherId || 0);
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required' });
    }

    const allowed = await query(
      `SELECT COUNT(*) AS count
       FROM parent_children pc
       INNER JOIN children c ON c.id = pc.child_id
       WHERE pc.parent_id = ?
         AND (
           EXISTS (
             SELECT 1
             FROM homework h
             WHERE h.school_id = c.school_id AND h.class_name = c.class_name AND h.teacher_id = ?
           )
           OR EXISTS (
             SELECT 1
             FROM class_alerts ca
             WHERE ca.school_id = c.school_id
               AND ca.class_name = c.class_name
               AND ca.created_by_user_id = ?
           )
         )`,
      [req.user.sub, teacherId, teacherId]
    );

    if (Number(allowed[0]?.count ?? 0) === 0) {
      return res.status(403).json({ error: 'Teacher does not appear linked to your children classes' });
    }

    const rows = await query(
      `SELECT id, parent_id, teacher_id, sender_id, message, read_at, created_at
       FROM parent_teacher_messages
       WHERE parent_id = ? AND teacher_id = ?
       ORDER BY created_at ASC
       LIMIT 300`,
      [req.user.sub, teacherId]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/parent/messages', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent'])) return;
    const teacherId = Number(req.body.teacher_id || 0);
    const message = String(req.body.message || '').trim();

    if (!teacherId || !message) {
      return res.status(400).json({ error: 'teacher_id and message are required' });
    }

    const allowed = await query(
      `SELECT COUNT(*) AS count
       FROM parent_children pc
       INNER JOIN children c ON c.id = pc.child_id
       WHERE pc.parent_id = ?
         AND (
           EXISTS (
             SELECT 1
             FROM homework h
             WHERE h.school_id = c.school_id AND h.class_name = c.class_name AND h.teacher_id = ?
           )
           OR EXISTS (
             SELECT 1
             FROM class_alerts ca
             WHERE ca.school_id = c.school_id
               AND ca.class_name = c.class_name
               AND ca.created_by_user_id = ?
           )
         )`,
      [req.user.sub, teacherId, teacherId]
    );

    if (Number(allowed[0]?.count ?? 0) === 0) {
      return res.status(403).json({ error: 'Teacher does not appear linked to your children classes' });
    }

    const result = await query(
      `INSERT INTO parent_teacher_messages (school_id, parent_id, teacher_id, sender_id, message)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.school_id, req.user.sub, teacherId, req.user.sub, message]
    );

    await query(
      `INSERT INTO notifications (school_id, user_id, category, title, body, data)
       VALUES (?, ?, 'system', ?, ?, ?)`,
      [
        req.user.school_id,
        teacherId,
        'New parent message',
        message,
        JSON.stringify({ parent_id: req.user.sub, message_id: result.insertId }),
      ]
    );

    return res.status(201).json({ id: result.insertId, teacher_id: teacherId, message });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/parent/link-child', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent'])) return;
    const childId = Number(req.body.child_id || 0);
    const relationship = String(req.body.relationship || 'parent').trim() || 'parent';

    if (!childId) {
      return res.status(400).json({ error: 'child_id is required' });
    }

    const childRows = await query(
      `SELECT id, school_id, full_name
       FROM children
       WHERE id = ? AND school_id = ?
       LIMIT 1`,
      [childId, req.user.school_id]
    );

    if (childRows.length === 0) {
      return res.status(404).json({ error: 'Child not found in your school' });
    }

    await query(
      `INSERT INTO parent_children (parent_id, child_id, relationship)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE relationship = VALUES(relationship)`,
      [req.user.sub, childId, relationship]
    );

    return res.status(201).json({ linked: true, child_id: childId, relationship });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/parent/delegates', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent'])) return;
    const { delegate_name, phone, relationship } = req.body;
    if (!delegate_name || !phone || !relationship) {
      return res.status(400).json({ error: 'delegate_name, phone and relationship are required' });
    }

    const result = await query(
      `INSERT INTO delegated_guardians (parent_id, full_name, phone_number, relationship, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [req.user.sub, delegate_name, phone, relationship]
    );

    await query(
      `INSERT INTO notifications (school_id, user_id, category, title, body, data)
       SELECT ?, id, 'delegate', 'Delegate approval pending', ?, ?
       FROM users
       WHERE school_id = ? AND role = 'school_admin'`,
      [
        req.user.school_id,
        `${delegate_name} was submitted by a parent and requires approval.`,
        JSON.stringify({ delegate_id: result.insertId, parent_id: req.user.sub }),
        req.user.school_id,
      ]
    );

    return res.status(201).json({ id: result.insertId, status: 'pending' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/parent/absence', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent'])) return;
    const { child_id, attendance_date, reason } = req.body;
    if (!child_id) {
      return res.status(400).json({ error: 'child_id is required' });
    }

    const date = attendance_date || new Date().toISOString().slice(0, 10);
    await query(
      `INSERT INTO attendance (child_id, school_id, attendance_date, recorded_by_teacher_id, marked_by, status, reason, recorded_at)
       VALUES (?, ?, ?, ?, ?, 'absent', ?, NOW())
       ON DUPLICATE KEY UPDATE status = 'absent', reason = VALUES(reason), marked_by = VALUES(marked_by), recorded_at = NOW()`,
      [child_id, req.user.school_id, date, req.user.sub, req.user.sub, reason ?? 'Reported by parent']
    );

    await query(
      `INSERT INTO audit_logs (school_id, actor_id, action, target, metadata)
       VALUES (?, ?, 'attendance.absence.reported', ?, ?)`,
      [req.user.school_id, req.user.sub, String(child_id), JSON.stringify({ attendance_date: date, reason })]
    );

    return res.status(201).json({ child_id, attendance_date: date, status: 'absent' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/parent/deletion-request', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['parent', 'delegate'])) return;
    const { reason = null } = req.body;

    const result = await query(
      `INSERT INTO deletion_requests (school_id, requested_by, reason)
       VALUES (?, ?, ?)`,
      [req.user.school_id, req.user.sub, reason]
    );

    return res.status(201).json({ id: result.insertId, status: 'pending' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/ops/delegate/children', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['delegate'])) return;
    const rows = await query(
      `SELECT c.id, c.full_name, c.class_name, c.grade, c.school_id
       FROM delegated_guardians dg
       INNER JOIN parent_children pc ON pc.parent_id = dg.parent_id
       INNER JOIN children c ON c.id = pc.child_id
       WHERE dg.delegated_user_id = ? AND dg.status = 'approved'
       GROUP BY c.id
       ORDER BY c.full_name ASC`,
      [req.user.sub]
    );
    return res.json(rows.map(mapChild));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ops/delegate/passes', authRequired, async (req, res) => {
  try {
    if (!requireRoles(req, res, ['delegate'])) return;
    const { child_id } = req.body;
    if (!child_id) {
      return res.status(400).json({ error: 'child_id is required' });
    }

    const allowed = await query(
      `SELECT c.id, c.full_name, c.class_name
       FROM delegated_guardians dg
       INNER JOIN parent_children pc ON pc.parent_id = dg.parent_id
       INNER JOIN children c ON c.id = pc.child_id
       WHERE dg.delegated_user_id = ?
         AND dg.status = 'approved'
         AND c.id = ?
       LIMIT 1`,
      [req.user.sub, child_id]
    );

    if (allowed.length === 0) {
      return res.status(403).json({ error: 'No approved delegate access for this child' });
    }

    const expiryTime = new Date(Date.now() + 30 * 60 * 1000);
    const code = `PASS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    const result = await query(
      `INSERT INTO pickup_passes (child_id, child_name, issued_by_user_id, school_id, token_kind, code, otp, status, expires_at)
       VALUES (?, ?, ?, ?, 'qr', ?, ?, 'active', ?)`,
      [child_id, allowed[0].full_name, req.user.sub, req.user.school_id, code, otp, expiryTime]
    );

    return res.status(201).json({
      id: result.insertId,
      child_id,
      child_name: allowed[0].full_name,
      code,
      otp,
      status: 'active',
      expires_at: expiryTime,
      child: { full_name: allowed[0].full_name, class_name: allowed[0].class_name },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

async function bootstrap() {
  try {
    await ensureQuizSchema();
    await ensureOperationsSchema();
    app.listen(port, () => {
      console.log(`Local backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize backend schema:', error);
    process.exit(1);
  }
}

bootstrap();
