<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * User Governance REST API Controller
 * Provides enterprise administrative capabilities for user creation, role assignments, and directory management
 */
#[AllowDynamicProperties]
class Users extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('User_model', 'users');
        $this->load->model('Audit_model', 'audit');
    }

    /**
     * GET /api/users
     * List all employee accounts with role, status, and assignment filters
     */
    public function index() {
        $this->require_role(['admin']);

        // Automated Periodic Synchronization:
        // Automatically sync from Google Sheets if never synced or if more than 5 minutes have elapsed
        $this->load->model('Google_sheet_model', 'sheets');
        $sheet_config = $this->sheets->get_config('trainees');
        if (!empty($sheet_config['spreadsheet_id'])) {
            $last_time = !empty($sheet_config['last_synced_at']) ? strtotime($sheet_config['last_synced_at']) : 0;
            $interval = 300; // 5 minutes interval
            if ((time() - $last_time) > $interval) {
                try {
                    $this->sheets->sync();
                } catch (Throwable $e) {
                    log_message('error', 'Auto sync failed in Users controller: ' . $e->getMessage());
                }
            }
        }

        $filters = [
            'role_id'      => $this->input->get('role_id', TRUE),
            'learner_type' => $this->input->get('learner_type', TRUE),
            'batch'        => $this->input->get('batch', TRUE),
            'status'       => $this->input->get('status', TRUE),
            'department'   => $this->input->get('department', TRUE),
            'search'       => $this->input->get('search', TRUE),
        ];

        $list = $this->users->get_all_users($filters);
        return $this->json_response($list, 'Users directory retrieved successfully.');
    }

    /**
     * GET /api/users/batches
     * List distinct trainee batches
     */
    public function batches() {
        $this->require_role(['admin', 'instructor']);
        $batches = $this->users->get_all_batches();
        return $this->json_response($batches, 'Batches retrieved successfully.');
    }

    /**
     * GET /api/users/roles
     * List available roles
     */
    public function roles() {
        $this->require_role(['admin']);
        $roles = $this->users->get_roles();
        return $this->json_response($roles, 'System roles retrieved.');
    }

    /**
     * GET /api/users/{id}
     * Get specific user details
     */
    public function show($id) {
        $this->require_role(['admin']);
        $user = $this->users->get_by_id((int)$id);
        if (!$user) {
            return $this->error_response('User not found.', 404);
        }
        return $this->json_response($user, 'User details retrieved.');
    }

    /**
     * POST /api/users
     * Create a new user account
     */
    public function create() {
        $this->require_role(['admin']);

        $input = $this->get_json_input();

        // Handle unified name input if supplied
        if (!empty($input['name'])) {
            $parts = preg_split('/\s+/', trim($input['name']), 2);
            $first_name = $parts[0];
            $last_name = isset($parts[1]) ? $parts[1] : '';
            $input['first_name'] = $first_name;
            $input['last_name'] = $last_name;
        } else {
            $first_name = trim($input['first_name'] ?? '');
            $last_name = trim($input['last_name'] ?? '');
        }

        $email = strtolower(trim($input['email'] ?? ''));
        $password = !empty($input['password']) ? $input['password'] : 'Welcome@123';
        $input['password'] = $password;
        $role_id = (int)($input['role_id'] ?? 3);

        if (empty($email) || empty($first_name)) {
            return $this->error_response('Name and email are required.', 422);
        }

        if ($this->users->email_exists($email)) {
            return $this->error_response('An account with this email address already exists.', 409);
        }

        $user_id = $this->users->create_user($input);
        $new_user = $this->users->get_by_id($user_id);

        // Audit log
        $fullName = trim("$first_name $last_name");
        $this->audit->log(
            $this->current_user['id'],
            'USER_CREATED',
            'users',
            $user_id,
            null,
            ['email' => $email, 'role_id' => $role_id, 'name' => $fullName]
        );

        return $this->json_response($new_user, 'User account created successfully.', 201);
    }

    /**
     * PUT /api/users/{id}
     * Update user details
     */
    public function update($id) {
        $this->require_role(['admin']);

        $id = (int)$id;
        $existing = $this->users->get_by_id($id);
        if (!$existing) {
            return $this->error_response('User not found.', 404);
        }

        $input = $this->get_json_input();

        // Handle unified name input if supplied
        if (!empty($input['name'])) {
            $parts = preg_split('/\s+/', trim($input['name']), 2);
            $input['first_name'] = $parts[0];
            $input['last_name'] = isset($parts[1]) ? $parts[1] : '';
        }

        if (!empty($input['email']) && strtolower(trim($input['email'])) !== strtolower($existing['email'])) {
            if ($this->users->email_exists($input['email'], $id)) {
                return $this->error_response('Email address is already in use by another account.', 409);
            }
        }

        $this->users->update_user($id, $input);
        $updated = $this->users->get_by_id($id);

        // Audit log
        $this->audit->log(
            $this->current_user['id'],
            'USER_UPDATED',
            'users',
            $id,
            $existing,
            $updated
        );

        return $this->json_response($updated, 'User profile updated successfully.');
    }

    /**
     * PATCH /api/users/{id}/status
     * Toggle status (active, inactive, suspended)
     */
    public function toggle_status($id) {
        $this->require_role(['admin']);

        $id = (int)$id;
        $existing = $this->users->get_by_id($id);
        if (!$existing) {
            return $this->error_response('User not found.', 404);
        }

        // Prevent admin deactivating own account
        if ($id === (int)$this->current_user['id']) {
            return $this->error_response('Administrators cannot alter their own account status.', 400);
        }

        $input = $this->get_json_input();
        $status = $input['status'] ?? 'active';

        $this->users->toggle_status($id, $status);

        // Audit log
        $this->audit->log(
            $this->current_user['id'],
            'USER_STATUS_CHANGED',
            'users',
            $id,
            ['status' => $existing['status']],
            ['status' => $status]
        );

        return $this->json_response(['id' => $id, 'status' => $status], "User status updated to $status.");
    }

    /**
     * DELETE /api/users/{id}
     * Permanently delete user account
     */
    public function delete($id) {
        $this->require_role(['admin']);

        $id = (int)$id;
        $existing = $this->users->get_by_id($id);
        if (!$existing) {
            return $this->error_response('User not found.', 404);
        }

        // Prevent admin deleting own account
        if ($id === (int)$this->current_user['id']) {
            return $this->error_response('Administrators cannot delete their own account.', 400);
        }

        $success = $this->users->delete_user($id, $this->current_user['id']);
        if (!$success) {
            return $this->error_response('Failed to delete user account due to a database error.', 500);
        }

        // Audit log
        $this->audit->log(
            $this->current_user['id'],
            'USER_DELETED',
            'users',
            $id,
            $existing,
            null
        );

        return $this->json_response(['id' => $id], 'User account permanently deleted.');
    }

    /**
     * GET /api/users/{id}/details
     * Comprehensive learner details: profile details, registered courses, completed courses, and certifications
     */
    public function learner_details($id = null) {
        $this->require_role(['admin']);

        $id = (int)$id;
        $user = $this->users->get_by_id($id);
        if (!$user) {
            return $this->error_response('User not found.', 404);
        }

        $this->load->model('Assignment_model', 'assignments');
        $this->load->model('Certificate_model', 'certificates');
        $this->load->model('Assessment_model', 'assessments');
        $this->load->model('Audit_model', 'audits');

        $courses = $this->assignments->get_learner_assignments($id);
        $certificates = $this->certificates->get_learner_certificates($id);
        $assessments = $this->assessments->get_learner_assessments($id);
        $activity_logs = $this->audits->get_logs(['user_id' => $id], 50);

        $completed_count = 0;
        $pending_count = 0;
        foreach ($courses as $c) {
            if ($c['status'] === 'completed') {
                $completed_count++;
            } else {
                $pending_count++;
            }
        }

        $stats = [
            'total_courses'      => count($courses),
            'completed_courses'  => $completed_count,
            'pending_courses'    => $pending_count,
            'total_certificates' => count($certificates),
            'total_assessments'  => count($assessments),
        ];

        // Consolidated chronological training completion timeline
        $timeline = [];
        foreach ($courses as $c) {
            if (!empty($c['assigned_at'])) {
                $timeline[] = [
                    'date'        => date('M d, Y', strtotime($c['assigned_at'])),
                    'raw_date'    => $c['assigned_at'],
                    'status'      => 'Enrolled',
                    'title'       => $c['course_title'],
                    'type'        => 'course',
                ];
            }
            if (!empty($c['completed_at'])) {
                $timeline[] = [
                    'date'        => date('M d, Y', strtotime($c['completed_at'])),
                    'raw_date'    => $c['completed_at'],
                    'status'      => 'Completed',
                    'title'       => $c['course_title'],
                    'type'        => 'course',
                ];
            }
        }

        foreach ($certificates as $cert) {
            if (!empty($cert['issued_at'])) {
                $timeline[] = [
                    'date'        => date('M d, Y', strtotime($cert['issued_at'])),
                    'raw_date'    => $cert['issued_at'],
                    'status'      => 'Completed',
                    'title'       => $cert['course_title'] . ' (Certificate Awarded)',
                    'type'        => 'certificate',
                ];
            }
        }

        foreach ($assessments as $a) {
            if (!empty($a['last_attempted_at'])) {
                $timeline[] = [
                    'date'        => date('M d, Y', strtotime($a['last_attempted_at'])),
                    'raw_date'    => $a['last_attempted_at'],
                    'status'      => !empty($a['is_passed']) ? 'Completed' : 'Failed',
                    'title'       => $a['title'] . ' (Score: ' . round($a['highest_score']) . '%)',
                    'type'        => 'assessment',
                ];
            }
        }

        usort($timeline, function($a, $b) {
            return strtotime($b['raw_date']) - strtotime($a['raw_date']);
        });

        return $this->json_response([
            'user'          => $user,
            'courses'       => $courses,
            'certificates'  => $certificates,
            'assessments'   => $assessments,
            'activity_logs' => $activity_logs,
            'timeline'      => $timeline,
            'stats'         => $stats,
        ], 'Learner details retrieved successfully.');
    }
}
