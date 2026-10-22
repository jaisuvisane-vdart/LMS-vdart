<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Security & Activity Audit Log Controller
 * Provides read-only administrative inspection of immutable security, enrollment, and grading event logs
 */
#[AllowDynamicProperties]
class AuditLogs extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Audit_model', 'audit');
    }

    /**
     * GET /api/audit-logs
     * List audit events
     */
    public function index() {
        $this->require_role(['admin']);

        $limit = min(200, max(10, (int)($this->input->get('limit') ?: 50)));
        $offset = max(0, (int)($this->input->get('offset') ?: 0));

        $filters = [
            'user_id'     => $this->input->get('user_id', TRUE),
            'action'      => $this->input->get('action', TRUE),
            'entity_type' => $this->input->get('entity_type', TRUE),
            'search'      => $this->input->get('search', TRUE),
        ];

        $logs = $this->audit->get_logs($filters, $limit, $offset);

        return $this->json_response([
            'logs'   => $logs,
            'limit'  => $limit,
            'offset' => $offset,
        ], 'Audit trail retrieved successfully.');
    }
}
