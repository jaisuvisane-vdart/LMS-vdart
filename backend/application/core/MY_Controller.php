<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Base Application Controller
 * Provides universal CORS handling, JSON input parsing, and structured response methods
 */
#[AllowDynamicProperties]
class MY_Controller extends CI_Controller {

    public function __construct() {
        parent::__construct();
        $this->handle_cors();
    }

    /**
     * Cross-Origin Resource Sharing (CORS) handler
     */
    protected function handle_cors() {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
        header("Access-Control-Max-Age: 86400");

        if ($this->input->method(TRUE) === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }

    /**
     * Parse incoming JSON request payload
     * @return array
     */
    protected function get_json_input() {
        $raw = file_get_contents('php://input');
        if (empty($raw)) {
            return $this->input->post() ?: [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Standard success JSON response
     * @param mixed $data
     * @param string $message
     * @param int $status_code
     */
    protected function json_response($data = null, $message = 'Operation successful', $status_code = 200) {
        $this->output
            ->set_status_header($status_code)
            ->set_content_type('application/json', 'utf-8')
            ->set_output(json_encode([
                'status'    => 'success',
                'message'   => $message,
                'data'      => $data,
                'timestamp' => date('c')
            ]));
    }

    /**
     * Standard error JSON response
     * @param string $message
     * @param int $status_code
     * @param array $errors
     */
    protected function error_response($message = 'An error occurred', $status_code = 400, $errors = []) {
        $this->output
            ->set_status_header($status_code)
            ->set_content_type('application/json', 'utf-8')
            ->set_output(json_encode([
                'status'    => 'error',
                'message'   => $message,
                'errors'    => $errors,
                'timestamp' => date('c')
            ]));
    }
}
