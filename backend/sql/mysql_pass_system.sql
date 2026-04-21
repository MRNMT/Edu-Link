-- Guardian Link local MySQL schema (paste into MySQL client)
-- MySQL 8+

CREATE DATABASE IF NOT EXISTS guardian_link_local
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE guardian_link_local;

-- Dedicated application user for the backend.
-- If your local server blocks the 127.0.0.1 host entry, keep the localhost line and remove the other one.
CREATE USER IF NOT EXISTS 'guardian_link_app'@'127.0.0.1' IDENTIFIED BY 'system';
CREATE USER IF NOT EXISTS 'guardian_link_app'@'localhost' IDENTIFIED BY 'system';
GRANT ALL PRIVILEGES ON guardian_link_local.* TO 'guardian_link_app'@'127.0.0.1';
GRANT ALL PRIVILEGES ON guardian_link_local.* TO 'guardian_link_app'@'localhost';
FLUSH PRIVILEGES;

CREATE TABLE IF NOT EXISTS schools (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schools_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('parent', 'teacher', 'school_admin', 'delegate', 'system_admin', 'gate_security') NOT NULL DEFAULT 'parent',
  school_id BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_school_id (school_id),
  CONSTRAINT fk_users_school_id
    FOREIGN KEY (school_id) REFERENCES schools(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS children (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  school_id BIGINT UNSIGNED NOT NULL,
  class_name VARCHAR(80) NOT NULL DEFAULT '',
  grade VARCHAR(40) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_children_school_id (school_id),
  CONSTRAINT fk_children_school_id
    FOREIGN KEY (school_id) REFERENCES schools(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS parent_children (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  child_id BIGINT UNSIGNED NOT NULL,
  relationship VARCHAR(50) NOT NULL DEFAULT 'parent',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_parent_children_pair (parent_id, child_id),
  KEY idx_parent_children_child (child_id),
  CONSTRAINT fk_parent_children_parent_id
    FOREIGN KEY (parent_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_parent_children_child_id
    FOREIGN KEY (child_id) REFERENCES children(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pickup_passes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id BIGINT UNSIGNED NULL,
  child_name VARCHAR(160) NOT NULL,
  issued_by_user_id BIGINT UNSIGNED NOT NULL,
  school_id BIGINT UNSIGNED NULL,
  token_kind ENUM('qr', 'otp') NOT NULL DEFAULT 'qr',
  code VARCHAR(80) NOT NULL,
  otp VARCHAR(6) NULL,
  status ENUM('active', 'used', 'expired', 'rejected') NOT NULL DEFAULT 'active',
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  used_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pickup_passes_code (code),
  KEY idx_pickup_passes_child (child_id),
  KEY idx_pickup_passes_issued_by (issued_by_user_id),
  KEY idx_pickup_passes_school_status (school_id, status),
  CONSTRAINT fk_pickup_passes_child_id
    FOREIGN KEY (child_id) REFERENCES children(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pickup_passes_issued_by
    FOREIGN KEY (issued_by_user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pickup_passes_school_id
    FOREIGN KEY (school_id) REFERENCES schools(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pickup_passes_used_by
    FOREIGN KEY (used_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  school_id BIGINT UNSIGNED NULL,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  target VARCHAR(160) NULL,
  metadata JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_school_created (school_id, created_at),
  KEY idx_audit_logs_actor (actor_id),
  CONSTRAINT fk_audit_logs_school_id
    FOREIGN KEY (school_id) REFERENCES schools(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_audit_logs_actor_id
    FOREIGN KEY (actor_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Seed one demo school, demo users, and demo child links.
-- Password below corresponds to plain text: demo1234
INSERT INTO schools (name, code)
VALUES ('Sentinel Academy', 'DEMO')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO users (full_name, email, password_hash, role, school_id)
SELECT x.full_name, x.email, x.password_hash, x.role, s.id
FROM schools s
JOIN (
  SELECT 'Pat Parker' AS full_name, 'parent@demo.school' AS email, '$2a$12$JXBgFS5I.6GiiVLUPRsN1.AlmG9MFMnbg/Ww.rYgC6pllAeoR0nKO' AS password_hash, 'parent' AS role
  UNION ALL SELECT 'Tara Tan', 'teacher@demo.school', '$2a$12$JXBgFS5I.6GiiVLUPRsN1.AlmG9MFMnbg/Ww.rYgC6pllAeoR0nKO', 'teacher'
  UNION ALL SELECT 'Adrian Hale', 'admin@demo.school', '$2a$12$JXBgFS5I.6GiiVLUPRsN1.AlmG9MFMnbg/Ww.rYgC6pllAeoR0nKO', 'school_admin'
  UNION ALL SELECT 'Devon Kim', 'delegate@demo.school', '$2a$12$JXBgFS5I.6GiiVLUPRsN1.AlmG9MFMnbg/Ww.rYgC6pllAeoR0nKO', 'delegate'
  UNION ALL SELECT 'Sam Root', 'sysadmin@demo.school', '$2a$12$JXBgFS5I.6GiiVLUPRsN1.AlmG9MFMnbg/Ww.rYgC6pllAeoR0nKO', 'system_admin'
  UNION ALL SELECT 'Officer Vance', 'security@demo.school', '$2a$12$JXBgFS5I.6GiiVLUPRsN1.AlmG9MFMnbg/Ww.rYgC6pllAeoR0nKO', 'gate_security'
) AS x
WHERE s.code = 'DEMO'
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role), school_id = VALUES(school_id);

CREATE TABLE IF NOT EXISTS delegated_guardians (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  delegated_user_id BIGINT UNSIGNED NULL,
  phone_number VARCHAR(20) NULL,
  full_name VARCHAR(160) NOT NULL,
  relationship VARCHAR(50) NULL,
  status ENUM('pending', 'approved', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
  token VARCHAR(255) NULL,
  expires_at DATETIME NULL,
  approved_by_admin_id BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_delegated_guardians_parent (parent_id),
  KEY idx_delegated_guardians_delegated_user (delegated_user_id),
  KEY idx_delegated_guardians_status (status),
  CONSTRAINT fk_delegated_guardians_parent_id
    FOREIGN KEY (parent_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_delegated_guardians_delegated_user_id
    FOREIGN KEY (delegated_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_delegated_guardians_approved_by
    FOREIGN KEY (approved_by_admin_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id BIGINT UNSIGNED NOT NULL,
  school_id BIGINT UNSIGNED NOT NULL,
  recorded_by_teacher_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  marked_by BIGINT UNSIGNED NOT NULL,
  status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'present',
  reason VARCHAR(255) NULL,
  recorded_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_child_date (child_id, attendance_date),
  KEY idx_attendance_child_date (child_id, attendance_date),
  KEY idx_attendance_school_date (school_id, attendance_date),
  KEY idx_attendance_teacher (recorded_by_teacher_id),
  CONSTRAINT fk_attendance_child_id
    FOREIGN KEY (child_id) REFERENCES children(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_school_id
    FOREIGN KEY (school_id) REFERENCES schools(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_teacher_id
    FOREIGN KEY (recorded_by_teacher_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS homework (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  school_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  class_name VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  attachment_url VARCHAR(500) NULL,
  due_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_homework_school_date (school_id, created_at),
  KEY idx_homework_class (class_name),
  KEY idx_homework_teacher (teacher_id),
  CONSTRAINT fk_homework_school_id
    FOREIGN KEY (school_id) REFERENCES schools(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_homework_teacher_id
    FOREIGN KEY (teacher_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS homework_reads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  homework_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NOT NULL,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_homework_reads_pair (homework_id, parent_id),
  CONSTRAINT fk_homework_reads_homework_id
    FOREIGN KEY (homework_id) REFERENCES homework(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_homework_reads_parent_id
    FOREIGN KEY (parent_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quizzes (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id BIGINT UNSIGNED NOT NULL,
  prompt VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_quiz_questions_quiz (quiz_id, sort_order),
  CONSTRAINT fk_quiz_questions_quiz_id
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_options (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_attempts (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS class_alerts (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS delegate_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  delegated_guardian_id BIGINT UNSIGNED NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_delegate_sessions_token (session_token),
  KEY idx_delegate_sessions_guardian (delegated_guardian_id),
  CONSTRAINT fk_delegate_sessions_guardian_id
    FOREIGN KEY (delegated_guardian_id) REFERENCES delegated_guardians(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS frozen_at DATETIME NULL AFTER is_active,
  ADD COLUMN IF NOT EXISTS frozen_by BIGINT UNSIGNED NULL AFTER frozen_at,
  ADD COLUMN IF NOT EXISTS frozen_reason VARCHAR(255) NULL AFTER frozen_by;

-- fk_users_frozen_by is added by backend bootstrap for idempotent upgrades.

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS attendance_date DATE NULL AFTER school_id,
  ADD COLUMN IF NOT EXISTS marked_by BIGINT UNSIGNED NULL AFTER attendance_date,
  ADD COLUMN IF NOT EXISTS reason VARCHAR(255) NULL AFTER status;

UPDATE attendance SET attendance_date = DATE(recorded_at) WHERE attendance_date IS NULL;
ALTER TABLE attendance MODIFY attendance_date DATE NOT NULL;
UPDATE attendance SET marked_by = recorded_by_teacher_id WHERE marked_by IS NULL;

CREATE UNIQUE INDEX uq_attendance_child_date ON attendance (child_id, attendance_date);

ALTER TABLE pickup_passes
  ADD COLUMN IF NOT EXISTS rejected_attempts INT NOT NULL DEFAULT 0 AFTER status;

CREATE TABLE IF NOT EXISTS notifications (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS deletion_requests (
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
) ENGINE=InnoDB;

-- homework_reads is the canonical table name; backend bootstrap keeps legacy installs compatible.

INSERT INTO children (full_name, school_id, class_name, grade)
SELECT x.full_name, s.id, x.class_name, x.grade
FROM schools s
JOIN (
  SELECT 'Mia Parker' AS full_name, '4A' AS class_name, 'Grade 4' AS grade
  UNION ALL SELECT 'Leo Parker', '2B', 'Grade 2'
  UNION ALL SELECT 'Iris Chen', '4A', 'Grade 4'
  UNION ALL SELECT 'Noah Adams', '5C', 'Grade 5'
) AS x
WHERE s.code = 'DEMO'
ON DUPLICATE KEY UPDATE class_name = VALUES(class_name), grade = VALUES(grade), school_id = VALUES(school_id);

INSERT INTO parent_children (parent_id, child_id, relationship)
SELECT p.id, c.id, rel.relationship
FROM users p
JOIN children c ON c.school_id = p.school_id
JOIN (
  SELECT 'parent@demo.school' AS email, 'Mia Parker' AS child_name, 'parent' AS relationship
  UNION ALL SELECT 'parent@demo.school', 'Leo Parker', 'parent'
  UNION ALL SELECT 'delegate@demo.school', 'Mia Parker', 'delegate'
) AS rel
  ON rel.email = p.email AND rel.child_name = c.full_name
ON DUPLICATE KEY UPDATE relationship = VALUES(relationship);
