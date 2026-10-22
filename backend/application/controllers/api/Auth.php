<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Authentication API Controller
 * Provides login, token validation, and current user profile retrieval
 */
class Auth extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('User_model', 'users');
    }

    /**
     * POST /api/auth/login
     */
    public function login() {
        if ($this->input->method(TRUE) !== 'POST') {
            return $this->error_response('Method not allowed. Use POST.', 405);
        }

        $input = $this->get_json_input();
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            return $this->error_response('Email and password are required.', 422, [
                'email' => empty($email) ? 'Email is required' : null,
                'password' => empty($password) ? 'Password is required' : null
            ]);
        }

        $user = $this->users->get_by_email($email);
        if (!$user) {
            return $this->error_response('Invalid email or password.', 401);
        }

        if ($user['status'] !== 'active') {
            return $this->error_response('Account is suspended or deactivated. Contact your administrator.', 403);
        }

        if (!password_verify($password, $user['password_hash'])) {
            return $this->error_response('Invalid email or password.', 401);
        }

        // Generate stateless JWT token valid for 24 hours
        $token_payload = [
            'id'                => (int)$user['id'],
            'employee_id'       => $user['employee_id'],
            'first_name'        => $user['first_name'],
            'last_name'         => $user['last_name'],
            'email'             => $user['email'],
            'role'              => strtolower($user['role']),
            'role_display_name' => $user['role_display_name'],
            'department'        => $user['department'],
            'designation'       => $user['designation']
        ];

        $token = $this->jwt->encode($token_payload, 86400);

        // Update last login timestamp
        $this->users->update_last_login($user['id']);

        // Record audit trail event
        $this->load->model('Audit_model', 'audit');
        $this->audit->log($user['id'], 'USER_LOGIN', 'users', $user['id'], null, ['email' => $user['email']]);

        return $this->json_response([
            'token' => $token,
            'user'  => $token_payload
        ], 'Authentication successful.');
    }

    /**
     * GET /api/auth/me
     */
    public function me() {
        $this->require_auth();

        $fresh_user = $this->users->get_by_id($this->current_user['id']);
        if (!$fresh_user) {
            return $this->error_response('User record not found.', 404);
        }

        return $this->json_response([
            'user' => $fresh_user
        ], 'Profile retrieved successfully.');
    }

    /**
     * PUT /api/auth/profile
     * Allows any authenticated user to update their own contact details and optionally their password
     */
    public function profile() {
        $this->require_auth();
        $user_id = (int)$this->current_user['id'];

        $input = $this->get_json_input();
        $update = [];

        if (isset($input['first_name']) && trim($input['first_name']) !== '') {
            $update['first_name'] = trim($input['first_name']);
        }
        if (isset($input['last_name']) && trim($input['last_name']) !== '') {
            $update['last_name'] = trim($input['last_name']);
        }
        if (isset($input['phone'])) {
            $update['phone'] = trim($input['phone']);
        }

        // Optional password change
        if (!empty($input['new_password'])) {
            $hash = $this->users->get_password_hash($user_id);
            if (empty($input['current_password']) || !password_verify($input['current_password'], $hash)) {
                return $this->error_response('Current password is incorrect.', 400);
            }
            if (strlen($input['new_password']) < 6) {
                return $this->error_response('New password must be at least 6 characters.', 400);
            }
            $update['password'] = $input['new_password'];
        }

        if (!empty($update)) {
            $this->users->update_user($user_id, $update);
        }

        $fresh_user = $this->users->get_by_id($user_id);
        return $this->json_response(['user' => $fresh_user], 'Profile updated successfully.');
    }

    /**
     * POST /api/auth/logout
     */
    public function logout() {
        return $this->json_response(null, 'Session terminated successfully.');
    }
}
