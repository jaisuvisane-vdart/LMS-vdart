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

        // Option B: If email is provided without a password, check if account is awaiting first-time activation
        if (!empty($email) && empty($password)) {
            $user_lookup = $this->users->get_by_email($email);
            if ($user_lookup && !empty($user_lookup['is_first_login']) && $user_lookup['status'] === 'active') {
                return $this->request_first_login_otp();
            }
        }

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

        // First-Time Login Onboarding Verification
        if (!empty($user['is_first_login'])) {
            $this->load->library('Email_service', null, 'email_service');

            // Generate cryptographically secure 6-digit numeric OTP
            $otp_code = sprintf('%06d', random_int(100000, 999999));
            $expires_at = date('Y-m-d H:i:s', time() + 600); // 10 minutes

            // Invalidate any existing unconsumed first-login OTPs for this user
            $this->db->where('user_id', (int)$user['id'])
                     ->where('purpose', 'first_login_verification')
                     ->where('consumed', 0)
                     ->update('user_otps', ['consumed' => 1]);

            // Save new OTP
            $this->db->insert('user_otps', [
                'user_id'    => (int)$user['id'],
                'otp_code'   => $otp_code,
                'purpose'    => 'first_login_verification',
                'expires_at' => $expires_at,
                'consumed'   => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            // Dispatch HTML email
            $this->email_service->send_otp_email($user['email'], $user['first_name'], $otp_code);

            // Generate short-lived temporary token for OTP verification (valid 15 minutes)
            $temp_token = $this->jwt->encode([
                'user_id' => (int)$user['id'],
                'email'   => $user['email'],
                'action'  => 'first_login_otp'
            ], 900);

            // Mask email for UI display (e.g. da***@vdartinc.com)
            $email_parts = explode('@', $user['email']);
            $name_part = $email_parts[0];
            $domain_part = $email_parts[1] ?? 'vdartinc.com';
            $masked_name = strlen($name_part) > 2 
                ? substr($name_part, 0, 2) . str_repeat('*', max(3, strlen($name_part) - 2)) 
                : $name_part . '***';
            $masked_email = $masked_name . '@' . $domain_part;

            return $this->json_response([
                'requires_first_login_verification' => true,
                'temp_token'   => $temp_token,
                'email'        => $user['email'],
                'masked_email' => $masked_email,
                'dev_otp'      => (ENVIRONMENT !== 'production' ? $otp_code : null)
            ], 'A 6-digit verification code has been sent to your corporate email.');
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

    /**
     * POST /api/auth/check-email-status
     * Lightweight endpoint to inspect entered email and detect if account requires first-time onboarding
     */
    public function check_email_status() {
        if ($this->input->method(TRUE) !== 'POST') {
            return $this->error_response('Method not allowed. Use POST.', 405);
        }

        $input = $this->get_json_input();
        $email = trim($input['email'] ?? '');

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->error_response('A valid corporate email address is required.', 422);
        }

        $user = $this->users->get_by_email($email);

        if (!$user || $user['status'] !== 'active') {
            return $this->json_response([
                'exists'         => false,
                'is_first_login' => false
            ], 'Email analysis complete.');
        }

        return $this->json_response([
            'exists'         => true,
            'is_first_login' => !empty($user['is_first_login']),
            'first_name'     => $user['first_name']
        ], 'Email analysis complete.');
    }

    /**
     * POST /api/auth/request-first-login-otp
     * Option B: Passwordless First-Time Login / Account Activation Request
     * Accepts corporate email, verifies user has is_first_login == 1,
     * generates 6-digit OTP, sends email, and returns temp_token.
     * No default password (e.g. Welcome@123) is required from trainee.
     */
    public function request_first_login_otp() {
        if ($this->input->method(TRUE) !== 'POST') {
            return $this->error_response('Method not allowed. Use POST.', 405);
        }

        $input = $this->get_json_input();
        $email = trim($input['email'] ?? '');

        if (empty($email)) {
            return $this->error_response('Corporate email address is required.', 422);
        }

        $user = $this->users->get_by_email($email);
        if (!$user) {
            return $this->error_response('No registered employee account found with this email. Please contact your administrator.', 404);
        }

        if ($user['status'] !== 'active') {
            return $this->error_response('This employee account is suspended or inactive. Please contact your administrator.', 403);
        }

        // Check if user has already established their password
        if (empty($user['is_first_login'])) {
            return $this->error_response('This account has already completed initial activation. Please sign in with your corporate password.', 400);
        }

        $this->load->library('Email_service', null, 'email_service');

        // Generate cryptographically secure 6-digit numeric OTP
        $otp_code = sprintf('%06d', random_int(100000, 999999));
        $expires_at = date('Y-m-d H:i:s', time() + 600); // 10 minutes

        // Invalidate any existing unconsumed first-login OTPs for this user
        $this->db->where('user_id', (int)$user['id'])
                 ->where('purpose', 'first_login_verification')
                 ->where('consumed', 0)
                 ->update('user_otps', ['consumed' => 1]);

        // Save new OTP
        $this->db->insert('user_otps', [
            'user_id'    => (int)$user['id'],
            'otp_code'   => $otp_code,
            'purpose'    => 'first_login_verification',
            'expires_at' => $expires_at,
            'consumed'   => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Dispatch HTML email
        $mail_result = $this->email_service->send_otp_email($user['email'], $user['first_name'], $otp_code);

        // Generate short-lived temporary token for OTP verification (valid 15 minutes)
        $temp_token = $this->jwt->encode([
            'user_id' => (int)$user['id'],
            'email'   => $user['email'],
            'action'  => 'first_login_otp'
        ], 900);

        // Mask email for UI display (e.g. da***@vdartinc.com)
        $email_parts = explode('@', $user['email']);
        $name_part = $email_parts[0];
        $domain_part = $email_parts[1] ?? 'vdartinc.com';
        $masked_name = strlen($name_part) > 2 
            ? substr($name_part, 0, 2) . str_repeat('*', max(3, strlen($name_part) - 2)) 
            : $name_part . '***';
        $masked_email = $masked_name . '@' . $domain_part;

        return $this->json_response([
            'requires_first_login_verification' => true,
            'temp_token'   => $temp_token,
            'email'        => $user['email'],
            'masked_email' => $masked_email,
            'email_sent'   => !empty($mail_result['sent']),
            'dev_otp'      => (ENVIRONMENT !== 'production' ? $otp_code : null)
        ], 'A 6-digit verification code has been dispatched to your corporate email.');
    }

    /**
     * POST /api/auth/verify-first-login-otp
     * Validates 6-digit email OTP and issues single-use reset_token for password creation
     */
    public function verify_first_login_otp() {
        if ($this->input->method(TRUE) !== 'POST') {
            return $this->error_response('Method not allowed. Use POST.', 405);
        }

        $input = $this->get_json_input();
        $temp_token = trim($input['temp_token'] ?? '');
        $otp_code = trim($input['otp_code'] ?? '');

        if (empty($temp_token) || empty($otp_code)) {
            return $this->error_response('Verification session token and 6-digit code are required.', 422);
        }

        $payload = $this->jwt->decode($temp_token);
        if (!$payload || ($payload['action'] ?? '') !== 'first_login_otp' || empty($payload['user_id'])) {
            return $this->error_response('Verification session has expired. Please sign in again.', 401);
        }

        $user_id = (int)$payload['user_id'];
        $user = $this->users->get_by_id($user_id);
        if (!$user || $user['status'] !== 'active') {
            return $this->error_response('User account not found or inactive.', 403);
        }

        // Check OTP in database
        $otp_row = $this->db->where('user_id', $user_id)
                            ->where('otp_code', $otp_code)
                            ->where('purpose', 'first_login_verification')
                            ->where('consumed', 0)
                            ->order_by('id', 'DESC')
                            ->get('user_otps')
                            ->row_array();

        if (!$otp_row) {
            return $this->error_response('Invalid verification code. Please check your email and try again.', 400);
        }

        if (strtotime($otp_row['expires_at']) < time()) {
            return $this->error_response('Verification code has expired. Please request a new code.', 410);
        }

        // Mark OTP as consumed
        $this->db->where('id', $otp_row['id'])->update('user_otps', ['consumed' => 1]);

        // Issue single-use reset token for setting new password (valid 15 minutes)
        $reset_token = $this->jwt->encode([
            'user_id' => $user_id,
            'email'   => $user['email'],
            'action'  => 'first_login_password_reset'
        ], 900);

        return $this->json_response([
            'reset_token' => $reset_token,
            'user_name'   => $user['first_name'] . ' ' . $user['last_name']
        ], 'Email identity verified successfully. Please set your new corporate password.');
    }

    /**
     * POST /api/auth/resend-first-login-otp
     * Resends fresh 6-digit OTP with rate limiting
     */
    public function resend_first_login_otp() {
        if ($this->input->method(TRUE) !== 'POST') {
            return $this->error_response('Method not allowed. Use POST.', 405);
        }

        $input = $this->get_json_input();
        $temp_token = trim($input['temp_token'] ?? '');

        if (empty($temp_token)) {
            return $this->error_response('Verification session token is required.', 422);
        }

        $payload = $this->jwt->decode($temp_token);
        if (!$payload || ($payload['action'] ?? '') !== 'first_login_otp' || empty($payload['user_id'])) {
            return $this->error_response('Verification session has expired. Please sign in again.', 401);
        }

        $user_id = (int)$payload['user_id'];
        $user = $this->users->get_by_id($user_id);
        if (!$user || $user['status'] !== 'active') {
            return $this->error_response('User account not found or inactive.', 403);
        }

        // Rate limit: ensure at least 45 seconds since last OTP
        $last_otp = $this->db->where('user_id', $user_id)
                             ->where('purpose', 'first_login_verification')
                             ->order_by('id', 'DESC')
                             ->get('user_otps')
                             ->row_array();

        if ($last_otp && (time() - strtotime($last_otp['created_at'])) < 45) {
            $wait_seconds = 45 - (time() - strtotime($last_otp['created_at']));
            return $this->error_response("Please wait {$wait_seconds} seconds before requesting another code.", 429);
        }

        // Invalidate prior unconsumed OTPs
        $this->db->where('user_id', $user_id)
                 ->where('purpose', 'first_login_verification')
                 ->where('consumed', 0)
                 ->update('user_otps', ['consumed' => 1]);

        // Generate and store new OTP
        $otp_code = sprintf('%06d', random_int(100000, 999999));
        $this->db->insert('user_otps', [
            'user_id'    => $user_id,
            'otp_code'   => $otp_code,
            'purpose'    => 'first_login_verification',
            'expires_at' => date('Y-m-d H:i:s', time() + 600),
            'consumed'   => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $this->load->library('Email_service', null, 'email_service');
        $this->email_service->send_otp_email($user['email'], $user['first_name'], $otp_code);

        return $this->json_response([
            'dev_otp' => (ENVIRONMENT !== 'production' ? $otp_code : null)
        ], 'A fresh 6-digit verification code has been dispatched to your email.');
    }

    /**
     * POST /api/auth/complete-first-login
     * Updates user password, clears is_first_login, and returns active session JWT
     */
    public function complete_first_login() {
        if ($this->input->method(TRUE) !== 'POST') {
            return $this->error_response('Method not allowed. Use POST.', 405);
        }

        $input = $this->get_json_input();
        $reset_token = trim($input['reset_token'] ?? '');
        $new_password = $input['new_password'] ?? '';
        $confirm_password = $input['confirm_password'] ?? '';

        if (empty($reset_token) || empty($new_password)) {
            return $this->error_response('Reset token and new password are required.', 422);
        }

        if ($new_password !== $confirm_password) {
            return $this->error_response('Password confirmation does not match new password.', 422);
        }

        if (strlen($new_password) < 8) {
            return $this->error_response('New password must be at least 8 characters long.', 422);
        }

        $payload = $this->jwt->decode($reset_token);
        if (!$payload || ($payload['action'] ?? '') !== 'first_login_password_reset' || empty($payload['user_id'])) {
            return $this->error_response('Password creation session has expired. Please restart login.', 401);
        }

        $user_id = (int)$payload['user_id'];
        $user = $this->users->get_by_id($user_id);
        if (!$user || $user['status'] !== 'active') {
            return $this->error_response('User record not found or inactive.', 403);
        }

        // Update password and complete first-login onboarding
        $new_hash = password_hash($new_password, PASSWORD_BCRYPT);
        $this->users->update_user($user_id, [
            'password_hash'  => $new_hash,
            'is_first_login' => 0,
        ]);
        $this->users->update_last_login($user_id);

        // Record audit trail event
        $this->load->model('Audit_model', 'audit');
        $this->audit->log($user_id, 'FIRST_LOGIN_PASSWORD_SET', 'users', $user_id, null, [
            'email' => $user['email'],
            'note'  => 'First-time onboarding password established'
        ]);

        // Issue standard LMS session token
        $fresh_user = $this->users->get_by_id($user_id);
        $token_payload = [
            'id'                => (int)$fresh_user['id'],
            'employee_id'       => $fresh_user['employee_id'],
            'first_name'        => $fresh_user['first_name'],
            'last_name'         => $fresh_user['last_name'],
            'email'             => $fresh_user['email'],
            'role'              => strtolower($fresh_user['role']),
            'role_display_name' => $fresh_user['role_display_name'],
            'department'        => $fresh_user['department'],
            'designation'       => $fresh_user['designation'],
            'avatar_url'        => $fresh_user['avatar_url']
        ];

        $token = $this->jwt->encode($token_payload, 86400);

        return $this->json_response([
            'token' => $token,
            'user'  => $token_payload
        ], 'Your corporate password has been established successfully. Welcome to VDart-Learning.');
    }

    /**
     * POST /api/auth/google-login
     * Authenticate user with Google OAuth 2.0 ID Token (Policy A: Corporate Restrictive)
     */
    public function google_login() {
        if ($this->input->method(TRUE) !== 'POST') {
            return $this->error_response('Method not allowed. Use POST.', 405);
        }

        $input = $this->get_json_input();
        $token = trim($input['id_token'] ?? $input['access_token'] ?? $input['token'] ?? '');

        if (empty($token)) {
            return $this->error_response('Google authentication token is required.', 422);
        }

        // Verify ID token or Access token via Google API
        $google_user = $this->verify_google_token($token);
        if (!$google_user || empty($google_user['email'])) {
            return $this->error_response('Invalid or expired Google authentication credential.', 401);
        }

        if (empty($google_user['email_verified']) || ($google_user['email_verified'] !== 'true' && $google_user['email_verified'] !== true && $google_user['email_verified'] !== 1)) {
            return $this->error_response('Google email address has not been verified by Google.', 401);
        }

        $email = strtolower(trim($google_user['email']));

        // Policy A: Corporate Restrictive
        // Only existing registered users in the LMS database are authorized to sign in
        $user = $this->users->get_by_email($email);
        if (!$user) {
            return $this->error_response(
                'No corporate LMS account found for Google email: ' . $email . '. Please contact your system administrator to create your account.',
                403
            );
        }

        if ($user['status'] !== 'active') {
            return $this->error_response('Your LMS account is currently ' . $user['status'] . '. Contact your administrator for assistance.', 403);
        }

        // Generate stateless LMS JWT token valid for 24 hours
        $token_payload = [
            'id'                => (int)$user['id'],
            'employee_id'       => $user['employee_id'],
            'first_name'        => $user['first_name'],
            'last_name'         => $user['last_name'],
            'email'             => $user['email'],
            'role'              => strtolower($user['role']),
            'role_display_name' => $user['role_display_name'],
            'department'        => $user['department'],
            'designation'       => $user['designation'],
            'avatar_url'        => $user['avatar_url'] ?: ($google_user['picture'] ?? null)
        ];

        $token = $this->jwt->encode($token_payload, 86400);

        // Update last login timestamp
        $this->users->update_last_login($user['id']);

        // Update avatar from Google if not already set
        if (empty($user['avatar_url']) && !empty($google_user['picture'])) {
            $this->users->update_user($user['id'], ['avatar_url' => $google_user['picture']]);
        }

        // Record audit trail event
        $this->load->model('Audit_model', 'audit');
        $this->audit->log($user['id'], 'USER_LOGIN_GOOGLE', 'users', $user['id'], null, [
            'email' => $user['email'],
            'google_sub' => $google_user['sub'] ?? null
        ]);

        return $this->json_response([
            'token' => $token,
            'user'  => $token_payload
        ], 'Google authentication successful.');
    }

    /**
     * Validate Google credential (ID token or Access token) via Google API
     * @param string $token
     * @return array|false Returns verified Google token payload or FALSE
     */
    private function verify_google_token($token) {
        $expected_client_id = null;
        if (file_exists(APPPATH . 'config/google.php')) {
            $this->config->load('google', TRUE, TRUE);
            $google_config = $this->config->item('google');
            $expected_client_id = $google_config['google_client_id'] ?? null;
        }
        if (empty($expected_client_id)) {
            $expected_client_id = $this->config->item('google_client_id');
        }

        $is_jwt = count(explode('.', $token)) === 3;
        if ($is_jwt) {
            $payload = $this->fetch_google_url('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($token));
        } else {
            $tokeninfo = $this->fetch_google_url('https://oauth2.googleapis.com/tokeninfo?access_token=' . urlencode($token));
            if (!$tokeninfo || empty($tokeninfo['email'])) {
                return false;
            }
            $userinfo = $this->fetch_google_url('https://www.googleapis.com/oauth2/v3/userinfo', [
                'Authorization: Bearer ' . $token
            ]);
            $payload = array_merge($tokeninfo, is_array($userinfo) ? $userinfo : []);
        }

        if (!$payload || !is_array($payload) || empty($payload['email'])) {
            return false;
        }

        // Verify audience/azp if configured
        if (!empty($expected_client_id) && strpos($expected_client_id, 'YOUR_GOOGLE_CLIENT_ID') === false) {
            $aud = $payload['aud'] ?? $payload['azp'] ?? null;
            if ($aud !== $expected_client_id) {
                return false;
            }
        }

        // Verify email is verified
        if (empty($payload['email_verified']) || ($payload['email_verified'] !== 'true' && $payload['email_verified'] !== true && $payload['email_verified'] !== 1)) {
            return false;
        }

        return $payload;
    }

    /**
     * Helper to fetch and decode JSON from Google APIs
     * @param string $url
     * @param array $headers
     * @return array|false
     */
    private function fetch_google_url($url, $headers = []) {
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            if (!empty($headers)) {
                curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            }
            $body = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            return ($code === 200 && !empty($body)) ? json_decode($body, true) : false;
        }

        $opts = [
            'http' => [
                'timeout' => 10,
                'ignore_errors' => true,
                'header' => !empty($headers) ? implode("\r\n", $headers) . "\r\n" : ""
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false
            ]
        ];
        $body = @file_get_contents($url, false, stream_context_create($opts));
        return !empty($body) ? json_decode($body, true) : false;
    }
}
