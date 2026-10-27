<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/MY_Controller.php';

/**
 * Protected REST API Controller
 * Enforces stateless JWT validation and Role-Based Access Control (RBAC)
 */
#[AllowDynamicProperties]
class API_Controller extends MY_Controller {

    protected $current_user = null;

    public function __construct() {
        parent::__construct();
        $this->load->library('jwt');
        $this->authenticate_request();
    }

    /**
     * Authenticate incoming request via Bearer token
     */
    protected function authenticate_request() {
        $token = $this->get_bearer_token();
        if (!$token) {
            $token = $this->input->get('token', TRUE);
        }
        if ($token) {
            $payload = $this->jwt->decode($token);
            if ($payload) {
                $this->current_user = $payload;
            }
        }
    }

    /**
     * Enforce authentication on sensitive endpoints
     */
    protected function require_auth() {
        if (!$this->current_user) {
            $this->error_response('Authentication required. Missing or expired token.', 401);
            $this->output->_display();
            exit();
        }
    }

    /**
     * Enforce role-based access control
     * @param string|array $allowed_roles
     */
    protected function require_role($allowed_roles) {
        $this->require_auth();

        if (is_string($allowed_roles)) {
            $allowed_roles = [$allowed_roles];
        }

        $user_role = strtolower($this->current_user['role'] ?? '');
        $normalized_allowed = array_map('strtolower', $allowed_roles);

        if (!in_array($user_role, $normalized_allowed, true)) {
            $this->error_response('Access forbidden: Insufficient permissions for this resource.', 403);
            $this->output->_display();
            exit();
        }
    }

    /**
     * Extract Bearer token from headers
     * @return string|null
     */
    private function get_bearer_token() {
        $header = $this->input->get_request_header('Authorization', TRUE);
        if (!$header) {
            $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
        }
        if (!$header && function_exists('apache_request_headers')) {
            $apache_headers = apache_request_headers();
            $header = $apache_headers['Authorization'] ?? $apache_headers['authorization'] ?? null;
        }

        if ($header && preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
            return $matches[1];
        }

        return null;
    }
}
