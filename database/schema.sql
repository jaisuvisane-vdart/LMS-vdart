-- ==============================================================================
-- Enterprise Employee Learning Management System (LMS)
-- Database Architecture & Schema Definition
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS assessment_answers;
DROP TABLE IF EXISTS assessment_attempts;
DROP TABLE IF EXISTS assessment_options;
DROP TABLE IF EXISTS assessment_questions;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS lesson_progress;
DROP TABLE IF EXISTS course_assignments;
DROP TABLE IF EXISTS lesson_materials;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS course_categories;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. ROLES TABLE
-- Stores standardized user permission levels (Admin, Instructor, Learner)
-- ------------------------------------------------------------------------------
CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. USERS TABLE
-- Stores employee credentials, contact info, status, and role reference
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id INT UNSIGNED NOT NULL,
    learner_type ENUM('trainee', 'recruiter') NULL DEFAULT NULL,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    department VARCHAR(100) NULL,
    batch VARCHAR(100) NULL DEFAULT NULL,
    designation VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    sync_source ENUM('manual', 'google_sheet') NOT NULL DEFAULT 'manual',
    google_sheet_row_id VARCHAR(100) NULL DEFAULT NULL,
    last_synced_at DATETIME NULL DEFAULT NULL,
    is_first_login TINYINT(1) NOT NULL DEFAULT 1,
    avatar_url VARCHAR(255) NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id) ON UPDATE CASCADE,
    INDEX idx_users_role (role_id),
    INDEX idx_users_learner_type (learner_type),
    INDEX idx_users_batch (batch),
    INDEX idx_users_status (status),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2.5 COURSE CATEGORIES TABLE
-- Master repository of curriculum categories
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. COURSES TABLE
-- Training programs authored by instructors or created by admins
-- ------------------------------------------------------------------------------
CREATE TABLE courses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    instructor_id INT UNSIGNED NOT NULL,
    category VARCHAR(100) NOT NULL,
    course_type ENUM('certified', 'non_certified') NOT NULL DEFAULT 'certified',
    access_type ENUM('open_enrollment', 'required_admin_access') NOT NULL DEFAULT 'open_enrollment',
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NULL,
    thumbnail_url VARCHAR(255) NULL,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    estimated_duration_minutes INT UNSIGNED NOT NULL DEFAULT 0,
    duration_days INT UNSIGNED NOT NULL DEFAULT 30,
    certificate_template VARCHAR(50) NOT NULL DEFAULT 'classic',
    passing_percentage DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    published_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_instructor FOREIGN KEY (instructor_id) REFERENCES users (id) ON UPDATE CASCADE,
    INDEX idx_courses_instructor (instructor_id),
    INDEX idx_courses_status (status),
    INDEX idx_courses_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. LESSONS TABLE
-- Granular training units containing instructions, text, video, or documents
-- ------------------------------------------------------------------------------
CREATE TABLE lessons (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NULL,
    lesson_type VARCHAR(50) NOT NULL DEFAULT 'text',
    order_index INT UNSIGNED NOT NULL DEFAULT 1,
    duration_minutes INT UNSIGNED NOT NULL DEFAULT 10,
    is_mandatory TINYINT(1) NOT NULL DEFAULT 1,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lessons_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_lessons_course (course_id, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. LESSON MATERIALS TABLE
-- Attached files (PDF, PPT, DOCX, Video MP4) or secure external resources
-- ------------------------------------------------------------------------------
CREATE TABLE lesson_materials (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT UNSIGNED NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size_kb INT UNSIGNED NOT NULL DEFAULT 0,
    external_url VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_materials_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_materials_lesson (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. COURSE ASSIGNMENTS TABLE
-- Tracks assigned training programs, due dates, and completion status per trainee
-- ------------------------------------------------------------------------------
CREATE TABLE course_assignments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    learner_id INT UNSIGNED NOT NULL,
    assigned_by INT UNSIGNED NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NULL,
    status ENUM('assigned', 'in_progress', 'completed', 'overdue') NOT NULL DEFAULT 'assigned',
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    completed_at DATETIME NULL,
    updated_by_admin TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignments_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_assignments_learner FOREIGN KEY (learner_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES users (id) ON UPDATE CASCADE,
    UNIQUE KEY uq_assignment_course_learner (course_id, learner_id),
    INDEX idx_assignments_learner (learner_id, status),
    INDEX idx_assignments_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. LESSON PROGRESS TABLE
-- Granular lesson-level completion records per assignment
-- ------------------------------------------------------------------------------
CREATE TABLE lesson_progress (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT UNSIGNED NOT NULL,
    lesson_id INT UNSIGNED NOT NULL,
    learner_id INT UNSIGNED NOT NULL,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    material_viewed TINYINT(1) NOT NULL DEFAULT 0,
    time_spent_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    completed_at DATETIME NULL,
    last_accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_progress_assignment FOREIGN KEY (assignment_id) REFERENCES course_assignments (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_progress_learner FOREIGN KEY (learner_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uq_progress_assignment_lesson (assignment_id, lesson_id),
    INDEX idx_progress_learner (learner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. ASSESSMENTS TABLE
-- Quizzes and final exams configured for specific courses
-- ------------------------------------------------------------------------------
CREATE TABLE assessments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    passing_percentage DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    time_limit_minutes INT UNSIGNED NOT NULL DEFAULT 30,
    max_attempts INT UNSIGNED NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    show_score_to_learner TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_assessments_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_assessments_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. ASSESSMENT QUESTIONS TABLE
-- Question bank items associated with assessments
-- ------------------------------------------------------------------------------
CREATE TABLE assessment_questions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT UNSIGNED NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false') NOT NULL DEFAULT 'multiple_choice',
    marks INT UNSIGNED NOT NULL DEFAULT 1,
    order_index INT UNSIGNED NOT NULL DEFAULT 1,
    explanation TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_questions_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_questions_assessment (assessment_id, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. ASSESSMENT OPTIONS TABLE
-- Multiple choice or true/false answer choices
-- ------------------------------------------------------------------------------
CREATE TABLE assessment_options (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_id INT UNSIGNED NOT NULL,
    option_text TEXT NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    order_index INT UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES assessment_questions (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_options_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. ASSESSMENT ATTEMPTS TABLE
-- Test execution instances by trainees with scores and completion status
-- ------------------------------------------------------------------------------
CREATE TABLE assessment_attempts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT UNSIGNED NOT NULL,
    learner_id INT UNSIGNED NOT NULL,
    assignment_id INT UNSIGNED NULL,
    attempt_number INT UNSIGNED NOT NULL DEFAULT 1,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME NULL,
    total_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status ENUM('in_progress', 'completed', 'timed_out') NOT NULL DEFAULT 'in_progress',
    is_passed TINYINT(1) NOT NULL DEFAULT 0,
    tab_switch_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_attempts_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_attempts_learner FOREIGN KEY (learner_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_attempts_assignment FOREIGN KEY (assignment_id) REFERENCES course_assignments (id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_attempts_assessment_learner (assessment_id, learner_id),
    INDEX idx_attempts_assignment (assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. ASSESSMENT ANSWERS TABLE
-- Trainee submissions for each individual question within an attempt
-- ------------------------------------------------------------------------------
CREATE TABLE assessment_answers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT UNSIGNED NOT NULL,
    question_id INT UNSIGNED NOT NULL,
    selected_option_id INT UNSIGNED NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    score_awarded DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_answers_attempt FOREIGN KEY (attempt_id) REFERENCES assessment_attempts (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES assessment_questions (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_answers_option FOREIGN KEY (selected_option_id) REFERENCES assessment_options (id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_answers_attempt (attempt_id),
    INDEX idx_answers_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. NOTIFICATIONS TABLE
-- Real-time system, assignment, and result notifications for users
-- ------------------------------------------------------------------------------
CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('assignment', 'deadline', 'completion', 'assessment_result', 'system') NOT NULL DEFAULT 'system',
    related_entity_type VARCHAR(50) NULL,
    related_entity_id INT UNSIGNED NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_notifications_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. AUDIT LOGS TABLE
-- Immutable trail of administrative, user, course, and security actions
-- ------------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT UNSIGNED NULL,
    old_values LONGTEXT NULL,
    new_values LONGTEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 16. CERTIFICATES TABLE
-- Official credential records awarded to trainees upon completing courses and passing assessments
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    certificate_code VARCHAR(64) UNIQUE NOT NULL,
    learner_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    assessment_attempt_id INT UNSIGNED NULL,
    final_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_certificates_learner FOREIGN KEY (learner_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_certificates_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_certificates_attempt FOREIGN KEY (assessment_attempt_id) REFERENCES assessment_attempts (id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_certificates_learner (learner_id),
    INDEX idx_certificates_code (certificate_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 17. ASSESSMENT IMPORTS TABLE
-- Tracks smart file imports, uploaded quiz documents, normalized extraction sessions, and confirmations
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_imports (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    assessment_id INT UNSIGNED NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_format VARCHAR(20) NOT NULL,
    file_size_kb DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    uploaded_by INT UNSIGNED NOT NULL,
    total_questions INT UNSIGNED NOT NULL DEFAULT 0,
    valid_questions INT UNSIGNED NOT NULL DEFAULT 0,
    invalid_questions INT UNSIGNED NOT NULL DEFAULT 0,
    session_token VARCHAR(64) NOT NULL UNIQUE,
    preview_payload LONGTEXT NULL,
    import_status ENUM('uploaded', 'parsed', 'confirmed', 'cancelled', 'failed') NOT NULL DEFAULT 'uploaded',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME NULL,
    CONSTRAINT fk_imports_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_imports_user FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_imports_session (session_token),
    INDEX idx_imports_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 18. USER OTPS TABLE
-- Stores email 6-digit OTP verification codes for first-time login onboarding and credential verification
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_otps (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose ENUM('first_login_verification', 'password_reset') NOT NULL DEFAULT 'first_login_verification',
    expires_at DATETIME NOT NULL,
    consumed TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_otps_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_user_otps_lookup (user_id, otp_code, consumed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 19. GOOGLE SHEET SYNC CONFIGS TABLE
-- Stores Google Spreadsheet synchronization parameters for trainees and recruiters
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS google_sheet_sync_configs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sheet_type ENUM('trainees', 'recruiters') NOT NULL UNIQUE,
    spreadsheet_id VARCHAR(255) NOT NULL DEFAULT '',
    sheet_tab_name VARCHAR(100) NOT NULL DEFAULT '',
    id_header_name VARCHAR(50) NOT NULL DEFAULT 'Employee ID',
    auto_sync_enabled TINYINT(1) NOT NULL DEFAULT 1,
    sync_interval_minutes INT UNSIGNED NOT NULL DEFAULT 15,
    last_synced_at DATETIME NULL,
    sync_status ENUM('idle', 'syncing', 'success', 'error') NOT NULL DEFAULT 'idle',
    sync_message TEXT NULL,
    webhook_secret VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- DEFAULT SEED DATA
-- Baseline roles and master administrator account
-- Initial admin credentials: admin@vdartinc.com / Admin@123
-- Password hash generated with PHP password_hash('Admin@123', PASSWORD_BCRYPT)
-- ------------------------------------------------------------------------------
INSERT INTO roles (id, name, display_name, description) VALUES
(1, 'admin', 'Admin', 'Full access to users, settings, system reports, courses, and audit logs'),
(2, 'instructor', 'Instructor', 'Author courses, manage curriculum, upload materials, create assessments, and assign courses'),
(3, 'learner', 'Learner', 'Access assigned courses, study lessons, complete materials, and take assessments');

INSERT INTO users (id, role_id, employee_id, first_name, last_name, email, password_hash, department, designation, phone, status) VALUES
(1, 1, 'EMP001', 'System', 'Admin', 'admin@vdartinc.com', '$2y$10$wT0lPZvZBgn/Y3R8b4h42eA.s743j2L73dsk.b.8xV0p6rZkyXG2S', 'Corporate Functions', 'LMS Administrator', '+1-555-0100', 'active'),
(2, 2, 'EMP002', 'Sarah', 'Jenkins', 'instructor@vdartinc.com', '$2y$10$wT0lPZvZBgn/Y3R8b4h42eA.s743j2L73dsk.b.8xV0p6rZkyXG2S', 'Corporate Functions', 'Lead Technical Trainer', '+1-555-0101', 'active'),
(3, 3, 'EMP003', 'Alex', 'Morgan', 'learner@vdartinc.com', '$2y$10$wT0lPZvZBgn/Y3R8b4h42eA.s743j2L73dsk.b.8xV0p6rZkyXG2S', 'Recruitment', 'Graduate Trainee', '+1-555-0102', 'active');

INSERT INTO course_categories (name) VALUES
('Fresher Training Program'),
('Lateral Training Program'),
('Continuous Learning Program'),
('Refresher Training Program'),
('ISMS'),
('EHS'),
('Assessment – Fresher'),
('Assessment – Lateral'),
('Assessment – Sourcing'),
('CEIPAL'),
('LinkedIn'),
('Communication'),
('Soft Skill'),
('Leadership'),
('Marketing');
