<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Course Assignments REST API Controller
 * Handles enrollment of trainees, deadline management, and assignment tracking
 */
class Assignments extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Assignment_model', 'assignments');
        $this->load->model('Course_model', 'courses');
    }

    /**
     * GET /api/course-assignments
     */
    public function index() {
        $this->require_role(['admin', 'instructor']);

        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];

        $filters = [
            'course_id' => $this->input->get('course_id', TRUE),
            'status'    => $this->input->get('status', TRUE),
            'search'    => $this->input->get('search', TRUE),
        ];

        $list = $this->assignments->get_all_assignments($filters, $role, $user_id);
        return $this->json_response($list, 'Assignments fetched successfully.');
    }

    /**
     * POST /api/course-assignments
     */
    public function create() {
        $this->require_role(['admin', 'instructor']);

        $input = $this->get_json_input();
        $course_id = (int)($input['course_id'] ?? 0);
        $learner_ids = $input['learner_ids'] ?? [];
        $due_date = !empty($input['due_date']) ? date('Y-m-d H:i:s', strtotime($input['due_date'])) : null;

        if ($course_id <= 0 || empty($learner_ids) || !is_array($learner_ids)) {
            return $this->error_response('Course ID and at least one trainee learner are required.', 422);
        }

        $course = $this->courses->get_by_id($course_id);
        if (!$course) {
            return $this->error_response('Course not found.', 404);
        }

        // Post-publication gating: courses must be published before they can be assigned to learners
        if (($course['status'] ?? 'draft') !== 'published') {
            return $this->error_response('Cannot assign course: The course must be published before it can be assigned to learners.', 422);
        }

        // Ownership enforcement for instructors
        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$course['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden: You cannot assign a course you do not own.', 403);
        }

        $assigned_by = $user_id;
        $assigned_ids = $this->assignments->assign_learners($course_id, $learner_ids, $assigned_by, $due_date);

        // Record audit trail and dispatch learner notifications
        $this->load->model('Audit_model', 'audit');
        $this->load->model('Notification_model', 'notifications');

        $this->audit->log(
            $user_id,
            'COURSE_ASSIGNED',
            'courses',
            $course_id,
            null,
            ['course_title' => $course['title'], 'learners_count' => count($assigned_ids)]
        );

        foreach ($learner_ids as $lid) {
            $this->notifications->create(
                $lid,
                'New Course Assigned',
                "You have been enrolled in '" . $course['title'] . "'. Complete lessons before the scheduled deadline.",
                'assignment',
                'courses',
                $course_id
            );
        }

        return $this->json_response([
            'course_id'       => $course_id,
            'assigned_count'  => count($assigned_ids),
            'assignment_ids'  => $assigned_ids,
        ], 'Training successfully assigned to ' . count($assigned_ids) . ' trainee(s).', 201);
    }

    /**
     * GET /api/my-courses
     * Returns courses assigned to the authenticated user
     */
    public function my_courses() {
        $this->require_auth();

        $user_id = (int)$this->current_user['id'];
        $status = $this->input->get('status', TRUE);

        $assigned_courses = $this->assignments->get_learner_assignments($user_id, $status);
        return $this->json_response($assigned_courses, 'My assigned training programs retrieved.');
    }

    /**
     * GET /api/course-assignments/learners
     * Returns list of all trainee employees available for assignment
     */
    public function learners() {
        $this->require_role(['admin', 'instructor']);

        $this->db->select('u.id, u.employee_id, u.first_name, u.last_name, u.email, u.department, u.designation');
        $this->db->from('users u');
        $this->db->where('u.role_id', 3); // Learner role
        $this->db->where('u.status', 'active');
        $this->db->order_by('u.first_name', 'ASC');
        $learners = $this->db->get()->result_array();

        return $this->json_response($learners, 'Active trainee learners fetched.');
    }

    /**
     * DELETE /api/course-assignments/{id}
     */
    public function delete($id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$id) {
            return $this->error_response('Assignment ID is required.', 400);
        }

        $assignment = $this->assignments->get_by_id((int)$id);
        if (!$assignment) {
            return $this->error_response('Assignment not found.', 404);
        }

        // Ownership enforcement for instructors
        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$assignment['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden.', 403);
        }

        $this->assignments->delete((int)$id);
        return $this->json_response(null, 'Training assignment revoked successfully.');
    }

    /**
     * POST /api/course-assignments/{id}/admin-complete
     * Administrator manually marks a course as completed for a learner
     */
    public function admin_complete($assignment_id = null) {
        $this->require_role(['admin']);

        if (!$assignment_id) {
            return $this->error_response('Assignment ID is required.', 400);
        }

        $assignment = $this->assignments->get_by_id((int)$assignment_id);
        if (!$assignment) {
            return $this->error_response('Assignment record not found.', 404);
        }

        $course_id = (int)$assignment['course_id'];
        $learner_id = (int)$assignment['learner_id'];
        $admin_id = (int)$this->current_user['id'];
        $now = date('Y-m-d H:i:s');

        $this->db->trans_start();

        // 1. Update assignment to completed with 100% progress and updated_by_admin = 1
        $this->db->where('id', (int)$assignment_id)->update('course_assignments', [
            'status'              => 'completed',
            'progress_percentage' => 100.00,
            'completed_at'        => $now,
            'updated_by_admin'    => 1,
            'updated_at'          => $now,
        ]);

        // 2. Mark all lessons in this course as completed
        $this->db->select('l.id');
        $this->db->from('lessons l');
        $this->db->join('course_modules cm', 'cm.id = l.module_id');
        $this->db->where('cm.course_id', $course_id);
        $lessons = $this->db->get()->result_array();

        foreach ($lessons as $les) {
            $lid = (int)$les['id'];
            $prog = $this->db->get_where('lesson_progress', [
                'assignment_id' => (int)$assignment_id,
                'lesson_id'     => $lid,
            ])->row_array();

            if ($prog) {
                $this->db->where('id', $prog['id'])->update('lesson_progress', [
                    'is_completed'     => 1,
                    'completed_at'     => $now,
                    'last_accessed_at' => $now,
                    'updated_at'       => $now,
                ]);
            } else {
                $this->db->insert('lesson_progress', [
                    'assignment_id'      => (int)$assignment_id,
                    'lesson_id'          => $lid,
                    'learner_id'         => $learner_id,
                    'is_completed'       => 1,
                    'material_viewed'    => 1,
                    'time_spent_seconds' => 60,
                    'completed_at'       => $now,
                    'last_accessed_at'   => $now,
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ]);
            }
        }

        // 3. Certified Course Verification & Certificate Issuance
        $course = $this->courses->get_by_id($course_id);
        $cert_issued = null;
        if ($course && ($course['course_type'] ?? 'certified') === 'certified') {
            $this->load->model('Certificate_model', 'certificates');
            $cert_issued = $this->certificates->issue_certificate($learner_id, $course_id, null, 100.00);
        }

        // 4. Audit Log
        $this->load->model('Audit_model', 'audit');
        $this->audit->log(
            $admin_id,
            'ADMIN_COURSE_COMPLETED',
            'course_assignments',
            $assignment_id,
            ['status' => $assignment['status'], 'progress_percentage' => $assignment['progress_percentage']],
            ['status' => 'completed', 'progress_percentage' => 100.00, 'updated_by_admin' => 1]
        );

        $this->db->trans_complete();

        if ($this->db->trans_status() === FALSE) {
            return $this->error_response('Database transaction failed while marking course completed.', 500);
        }

        return $this->json_response([
            'assignment_id' => (int)$assignment_id,
            'status'        => 'completed',
            'progress'      => 100.00,
            'certificate'   => $cert_issued,
        ], 'Course marked as completed successfully by Administrator.');
    }

    /**
     * POST /api/course-assignments/{id}/admin-reset
     * Administrator resets a completed course back to assigned / in progress
     */
    public function admin_reset($assignment_id = null) {
        $this->require_role(['admin']);

        if (!$assignment_id) {
            return $this->error_response('Assignment ID is required.', 400);
        }

        $assignment = $this->assignments->get_by_id((int)$assignment_id);
        if (!$assignment) {
            return $this->error_response('Assignment record not found.', 404);
        }

        $course_id = (int)$assignment['course_id'];
        $learner_id = (int)$assignment['learner_id'];
        $admin_id = (int)$this->current_user['id'];
        $now = date('Y-m-d H:i:s');

        $this->db->trans_start();

        // 1. Revert assignment to assigned / 0% progress and updated_by_admin = 1
        $this->db->where('id', (int)$assignment_id)->update('course_assignments', [
            'status'              => 'assigned',
            'progress_percentage' => 0.00,
            'completed_at'        => NULL,
            'updated_by_admin'    => 1,
            'updated_at'          => $now,
        ]);

        // 2. Reset lesson completion records
        $this->db->where('assignment_id', (int)$assignment_id)->update('lesson_progress', [
            'is_completed' => 0,
            'completed_at' => NULL,
            'updated_at'   => $now,
        ]);

        // 3. Revoke any certificate issued for this course and learner
        $this->db->where('learner_id', $learner_id)
                 ->where('course_id', $course_id)
                 ->update('certificates', [
                     'status'     => 'revoked',
                     'updated_at' => $now,
                 ]);

        // 4. Audit Log
        $this->load->model('Audit_model', 'audit');
        $this->audit->log(
            $admin_id,
            'ADMIN_COURSE_COMPLETION_RESET',
            'course_assignments',
            $assignment_id,
            ['status' => $assignment['status'], 'progress_percentage' => $assignment['progress_percentage']],
            ['status' => 'assigned', 'progress_percentage' => 0.00, 'updated_by_admin' => 1]
        );

        $this->db->trans_complete();

        if ($this->db->trans_status() === FALSE) {
            return $this->error_response('Database transaction failed while resetting course progress.', 500);
        }

        return $this->json_response([
            'assignment_id' => (int)$assignment_id,
            'status'        => 'assigned',
            'progress'      => 0.00,
        ], 'Course completion reset successfully by Administrator.');
    }
}
