<?php
defined('BASEPATH') OR exit('No direct script access allowed');

#[AllowDynamicProperties]
class Notification_model extends CI_Model {

    public function __construct() {
        parent::__construct();
        $this->load->database();
    }

    /**
     * Dispatch notification to user
     */
    public function create($user_id, $title, $message, $type = 'system', $entity_type = null, $entity_id = null) {
        $insert = [
            'user_id'             => (int)$user_id,
            'title'               => trim($title),
            'message'             => trim($message),
            'type'                => in_array($type, ['assignment', 'deadline', 'completion', 'assessment_result', 'system']) ? $type : 'system',
            'related_entity_type' => $entity_type,
            'related_entity_id'   => !empty($entity_id) ? (int)$entity_id : null,
            'is_read'             => 0,
            'created_at'          => date('Y-m-d H:i:s'),
        ];

        $this->db->insert('notifications', $insert);
        return $this->db->insert_id();
    }

    /**
     * Get user notifications
     */
    public function get_user_notifications($user_id, $unread_only = false, $limit = 30) {
        $this->db->where('user_id', (int)$user_id);
        if ($unread_only) {
            $this->db->where('is_read', 0);
        }
        $this->db->order_by('id', 'DESC');
        $this->db->limit($limit);

        return $this->db->get('notifications')->result_array();
    }

    /**
     * Get unread count
     */
    public function get_unread_count($user_id) {
        $this->db->where('user_id', (int)$user_id);
        $this->db->where('is_read', 0);
        return $this->db->count_all_results('notifications');
    }

    /**
     * Mark single notification read
     */
    public function mark_as_read($id, $user_id) {
        $this->db->where('id', (int)$id);
        $this->db->where('user_id', (int)$user_id);
        return $this->db->update('notifications', [
            'is_read' => 1,
            'read_at' => date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Mark all notifications read
     */
    public function mark_all_read($user_id) {
        $this->db->where('user_id', (int)$user_id);
        $this->db->where('is_read', 0);
        return $this->db->update('notifications', [
            'is_read' => 1,
            'read_at' => date('Y-m-d H:i:s')
        ]);
    }
}
