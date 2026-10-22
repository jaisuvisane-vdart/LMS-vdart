<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Enterprise Reports & Training Analytics Controller
 * Provides cross-organizational and course-level training compliance and performance analytics
 */
#[AllowDynamicProperties]
class Reports extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Report_model', 'reports');
    }

    /**
     * GET /api/reports/overview
     * High-level executive training KPIs and departmental compliance matrix
     */
    public function overview() {
        $this->require_role(['admin']);

        $overview = $this->reports->get_overview_stats();
        $departments = $this->reports->get_department_metrics();

        return $this->json_response([
            'overview'    => $overview,
            'departments' => $departments,
        ], 'Executive analytics overview retrieved.');
    }

    /**
     * GET /api/reports/courses
     * Course-level enrollment, completion rate, and examination pass rates
     */
    public function courses() {
        $this->require_role(['admin', 'instructor']);

        $role = $this->current_user['role'];
        $user_id = (int)$this->current_user['id'];

        $filters = [
            'category' => $this->input->get('category', TRUE),
            'search'   => $this->input->get('search', TRUE),
        ];

        $report = $this->reports->get_course_completion_report($filters, $role, $user_id);
        return $this->json_response($report, 'Course completion report retrieved.');
    }

    /**
     * GET /api/reports/compliance
     * Individual trainee training compliance status
     */
    public function compliance() {
        $this->require_role(['admin', 'instructor']);

        $filters = [
            'department' => $this->input->get('department', TRUE),
            'search'     => $this->input->get('search', TRUE),
        ];

        $report = $this->reports->get_trainee_compliance_report($filters);
        return $this->json_response($report, 'Trainee compliance report retrieved.');
    }
}
