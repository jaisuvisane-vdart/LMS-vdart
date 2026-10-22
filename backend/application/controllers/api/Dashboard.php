<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Dashboard Metrics API Controller
 * Delivers role-segregated KPI counters and statistics for Admin, Instructor, and Learner
 */
class Dashboard extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('User_model', 'users');
    }

    /**
     * GET /api/dashboard/stats
     */
    public function stats() {
        $this->require_auth();

        $role = $this->current_user['role'] ?? 'learner';
        $user_id = (int)$this->current_user['id'];

        $metrics = $this->users->get_dashboard_metrics($role, $user_id);

        return $this->json_response([
            'role'    => $role,
            'metrics' => $metrics
        ], 'Dashboard statistics retrieved successfully.');
    }
}
