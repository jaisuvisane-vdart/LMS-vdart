<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * In-App Notifications REST API Controller
 * Provides real-time alert queries and status acknowledgments for all authenticated roles
 */
#[AllowDynamicProperties]
class Notifications extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Notification_model', 'notifications');
    }

    /**
     * GET /api/notifications
     * Retrieve user notifications
     */
    public function index() {
        $this->require_auth();

        $user_id = (int)$this->current_user['id'];
        $unread_only = (bool)$this->input->get('unread_only');

        $list = $this->notifications->get_user_notifications($user_id, $unread_only);
        $unread_count = $this->notifications->get_unread_count($user_id);

        return $this->json_response([
            'notifications' => $list,
            'unread_count'  => $unread_count,
        ], 'Notifications fetched successfully.');
    }

    /**
     * GET /api/notifications/unread-count
     */
    public function unread_count() {
        $this->require_auth();

        $user_id = (int)$this->current_user['id'];
        $count = $this->notifications->get_unread_count($user_id);

        return $this->json_response(['unread_count' => $count], 'Unread notification count.');
    }

    /**
     * PATCH /api/notifications/{id}/read
     */
    public function mark_read($id) {
        $this->require_auth();

        $user_id = (int)$this->current_user['id'];
        $this->notifications->mark_as_read((int)$id, $user_id);

        return $this->json_response(['id' => (int)$id, 'is_read' => 1], 'Notification marked as read.');
    }

    /**
     * POST /api/notifications/read-all
     */
    public function read_all() {
        $this->require_auth();

        $user_id = (int)$this->current_user['id'];
        $this->notifications->mark_all_read($user_id);

        return $this->json_response(null, 'All notifications marked as read.');
    }
}
