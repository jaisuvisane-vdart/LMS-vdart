<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

#[AllowDynamicProperties]
class Google_sheets extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Google_sheet_model', 'sheets');
        $this->load->model('Audit_model', 'audits');
    }

    /**
     * POST /api/google-sheets/sync
     * Administrative on-demand synchronization
     */
    public function sync() {
        $this->require_role(['admin']);

        $input = $this->get_json_input();
        $sheet_type = !empty($input['sheet_type']) ? trim($input['sheet_type']) : null;

        $result = $this->sheets->sync($sheet_type);

        $admin_id = $this->current_user['id'] ?? null;
        $this->audits->log(
            $admin_id,
            'GOOGLE_SHEET_SYNCED',
            'google_sheet_sync_configs',
            null,
            null,
            $result
        );

        return $this->json_response($result, 'Google Sheet synchronization executed successfully.');
    }

    /**
     * POST /api/google-sheets/webhook
     * Webhook listener triggered by Google Apps Script onEdit / onChange
     */
    public function webhook() {
        // Optional webhook secret check
        $provided_secret = $this->input->get_request_header('X-Webhook-Secret', TRUE);
        $input = $this->get_json_input();
        $sheet_type = !empty($input['sheet_type']) ? trim($input['sheet_type']) : null;
        $pushed_rows = !empty($input['rows']) && is_array($input['rows']) ? $input['rows'] : null;

        // If secret is set in config, validate it
        if ($sheet_type) {
            $config = $this->sheets->get_config($sheet_type);
            if ($config && !empty($config['webhook_secret']) && $config['webhook_secret'] !== $provided_secret) {
                return $this->error_response('Invalid or missing webhook secret.', 401);
            }
        }

        $result = $this->sheets->sync($sheet_type, $pushed_rows);

        $this->audits->log(
            null,
            'GOOGLE_SHEET_WEBHOOK_SYNCED',
            'google_sheet_sync_configs',
            null,
            null,
            ['sheet_type' => $sheet_type, 'result' => $result]
        );

        return $this->json_response($result, 'Webhook sync processed successfully.');
    }

    /**
     * GET /api/google-sheets/status
     * Returns sync health, last sync timestamps, and row counts
     */
    public function status() {
        $this->require_role(['admin']);

        $configs = $this->sheets->get_configs();
        
        // Count current users by learner_type
        $this->db->select('learner_type, COUNT(*) as count');
        $this->db->where('role_id', 3);
        $this->db->group_by('learner_type');
        $counts = $this->db->get('users')->result_array();

        $learner_stats = ['trainees' => 0, 'recruiters' => 0];
        foreach ($counts as $c) {
            if ($c['learner_type'] === 'trainee') $learner_stats['trainees'] = (int)$c['count'];
            if ($c['learner_type'] === 'recruiter') $learner_stats['recruiters'] = (int)$c['count'];
        }

        $sa_info = $this->sheets->get_service_account_info();

        return $this->json_response([
            'configs'         => $configs,
            'service_account' => $sa_info,
            'learner_stats'   => $learner_stats,
        ], 'Google Sheet sync status retrieved.');
    }

    /**
     * GET /api/google-sheets/config
     */
    public function config() {
        $this->require_role(['admin']);
        $configs = $this->sheets->get_configs();
        return $this->json_response($configs, 'Google Sheet sync configurations retrieved.');
    }

    /**
     * PUT /api/google-sheets/config
     */
    public function update_config() {
        $this->require_role(['admin']);
        return $this->error_response('Google Sheet settings are configured in code (application/config/google_sheets.php or .env) and cannot be modified via the web interface.', 403);
    }
}
