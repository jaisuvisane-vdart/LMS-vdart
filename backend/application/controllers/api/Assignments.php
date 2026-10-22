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
}
