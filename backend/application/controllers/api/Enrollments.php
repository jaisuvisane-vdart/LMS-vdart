<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Course Enrollment Management REST API Controller
 * Supports learner-side course catalog discovery and self-enrollment request submissions,
 * along with administrative review, approval, and rejection workflows.
 */
#[AllowDynamicProperties]
class Enrollments extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Enrollment_model', 'enrollments');
    }

    /**
     * GET /api/enrollments/catalog
     * Returns published courses with dynamic enrollment status for the authenticated user
     */
    public function catalog() {
        $this->require_auth();

        $learner_id = (int)$this->current_user['id'];
        $filters = [
            'category'    => $this->input->get('category', TRUE),
            'course_type' => $this->input->get('course_type', TRUE),
            'search'      => $this->input->get('search', TRUE),
        ];

        $catalog = $this->enrollments->get_catalog_for_learner($learner_id, $filters);
        return $this->json_response($catalog, 'Course catalog fetched successfully.');
    }

    /**
     * POST /api/enrollments/request
     * Allows learner to submit an enrollment request for an available course
     */
    public function request() {
        $this->require_role(['learner', 'admin']);

        $input = $this->get_json_input();
        $course_id = (int)($input['course_id'] ?? 0);
        $notes = trim($input['notes'] ?? $input['request_notes'] ?? '');

        if ($course_id <= 0) {
            return $this->error_response('Valid Course ID is required.', 422);
        }

        $learner_id = (int)$this->current_user['id'];
        $result = $this->enrollments->request_enrollment($course_id, $learner_id, $notes);

        if (!$result['success']) {
            return $this->error_response($result['error'], $result['status_code'] ?? 400);
        }

        return $this->json_response($result, $result['message'], 201);
    }

    /**
     * GET /api/enrollments/requests
     * Admin view of all enrollment requests with learner information and status
     */
    public function requests() {
        $this->require_role(['admin']);

        $filters = [
            'status'     => $this->input->get('status', TRUE),
            'course_id'  => $this->input->get('course_id', TRUE),
            'learner_id' => $this->input->get('learner_id', TRUE),
            'search'     => $this->input->get('search', TRUE),
        ];

        $list = $this->enrollments->get_requests($filters);
        return $this->json_response($list, 'Enrollment requests fetched successfully.');
    }

    /**
     * GET /api/enrollments/pending-count
     * Admin fast count of pending enrollment requests
     */
    public function pending_count() {
        $this->require_role(['admin']);

        $count = $this->enrollments->get_pending_count();
        return $this->json_response(['pending_count' => $count], 'Pending enrollment count fetched successfully.');
    }

    /**
     * POST /api/enrollments/{id}/approve
     * Admin approves an enrollment request and provisions access to the course
     */
    public function approve($id = null) {
        $this->require_role(['admin']);

        $request_id = (int)$id;
        if ($request_id <= 0) {
            return $this->error_response('Invalid enrollment request ID.', 422);
        }

        $input = $this->get_json_input();
        $due_date = !empty($input['due_date']) ? date('Y-m-d H:i:s', strtotime($input['due_date'])) : null;
        $admin_notes = !empty($input['admin_notes']) ? trim($input['admin_notes']) : null;
        $admin_id = (int)$this->current_user['id'];

        $result = $this->enrollments->approve_request($request_id, $admin_id, $due_date, $admin_notes);

        if (!$result['success']) {
            return $this->error_response($result['error'], $result['status_code'] ?? 400);
        }

        return $this->json_response($result, $result['message'], 200);
    }

    /**
     * POST /api/enrollments/{id}/reject
     * Admin rejects an enrollment request with optional notes
     */
    public function reject($id = null) {
        $this->require_role(['admin']);

        $request_id = (int)$id;
        if ($request_id <= 0) {
            return $this->error_response('Invalid enrollment request ID.', 422);
        }

        $input = $this->get_json_input();
        $admin_notes = !empty($input['admin_notes']) ? trim($input['admin_notes']) : null;
        $admin_id = (int)$this->current_user['id'];

        $result = $this->enrollments->reject_request($request_id, $admin_id, $admin_notes);

        if (!$result['success']) {
            return $this->error_response($result['error'], $result['status_code'] ?? 400);
        }

        return $this->json_response($result, $result['message'], 200);
    }
}
