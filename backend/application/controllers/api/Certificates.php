<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Certificate & Credential Verification Controller
 * Manages certificate issuance, print-ready scorecard rendering, and public credential verification
 */
#[AllowDynamicProperties]
class Certificates extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Certificate_model', 'certificates');
    }

    /**
     * GET /api/certificates
     * Retrieve certificates awarded to the current learner
     */
    public function index() {
        $this->require_auth();

        $role = $this->current_user['role'];
        $user_id = (int)$this->current_user['id'];

        if ($role === 'learner') {
            $list = $this->certificates->get_learner_certificates($user_id);
        } else {
            // Admin and instructor can inspect learner ID via query param
            $learner_id = (int)($this->input->get('learner_id') ?: $user_id);
            $list = $this->certificates->get_learner_certificates($learner_id);
        }

        return $this->json_response($list, 'Certificates retrieved successfully.');
    }

    /**
     * GET /api/certificates/{id}
     * Get single certificate for viewing and printing
     */
    public function show($id) {
        $this->require_auth();

        $cert = $this->certificates->get_by_id((int)$id);
        if (!$cert) {
            return $this->error_response('Certificate not found.', 404);
        }

        // Learner access enforcement
        if ($this->current_user['role'] === 'learner' && (int)$cert['learner_id'] !== (int)$this->current_user['id']) {
            return $this->error_response('Access forbidden to this certificate.', 403);
        }

        return $this->json_response($cert, 'Certificate details retrieved.');
    }

    /**
     * GET /api/certificates/verify/{code}
     * Public credential verification (no authentication required)
     */
    public function verify($code = '') {
        $code = trim($code);
        if (empty($code)) {
            return $this->error_response('Certificate verification code is required.', 400);
        }

        $record = $this->certificates->get_by_code($code);
        if (!$record) {
            return $this->error_response('Invalid or unverified certificate code.', 404);
        }

        return $this->json_response($record, 'Certificate successfully verified.');
    }

    /**
     * POST /api/certificates/check-eligibility
     * Automatically evaluate completion and award certificate
     */
    public function check_eligibility() {
        $this->require_auth();

        $input = $this->get_json_input();
        $course_id = (int)($input['course_id'] ?? 0);
        $learner_id = (int)($this->current_user['role'] === 'learner' ? $this->current_user['id'] : ($input['learner_id'] ?? $this->current_user['id']));

        if ($course_id <= 0) {
            return $this->error_response('Course ID is required.', 422);
        }

        $cert = $this->certificates->auto_issue_if_eligible($learner_id, $course_id);
        if (!$cert) {
            return $this->error_response('Course completion or passing assessment requirements have not yet been satisfied.', 400);
        }

        return $this->json_response($cert, 'Certificate successfully awarded.', 201);
    }
}
