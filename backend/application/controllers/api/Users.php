<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * User Governance REST API Controller
 * Provides enterprise administrative capabilities for user provisioning, role assignments, and directory management
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

        $filters = [
            'role_id'    => $this->input->get('role_id', TRUE),
            'status'     => $this->input->get('status', TRUE),
            'department' => $this->input->get('department', TRUE),
            'search'     => $this->input->get('search', TRUE),
        ];

        $list = $this->users->get_all_users($filters);
        return $this->json_response($list, 'Users directory retrieved successfully.');
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
     * Provision a new user account
     */
    public function create() {
        $this->require_role(['admin']);

        $input = $this->get_json_input();
        $email = strtolower(trim($input['email'] ?? ''));
        $first_name = trim($input['first_name'] ?? '');
        $last_name = trim($input['last_name'] ?? '');
        $password = $input['password'] ?? '';
        $role_id = (int)($input['role_id'] ?? 3);

        if (empty($email) || empty($first_name) || empty($last_name) || empty($password)) {
            return $this->error_response('First name, last name, email, and password are required.', 422);
        }

        if ($this->users->email_exists($email)) {
            return $this->error_response('An account with this email address already exists.', 409);
        }

        $user_id = $this->users->create_user($input);
        $new_user = $this->users->get_by_id($user_id);

        // Audit log
        $this->audit->log(
            $this->current_user['id'],
            'USER_PROVISIONED',
            'users',
            $user_id,
            null,
            ['email' => $email, 'role_id' => $role_id, 'name' => "$first_name $last_name"]
        );

        return $this->json_response($new_user, 'User account provisioned successfully.', 201);
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
}
