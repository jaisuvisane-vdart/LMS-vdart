<?php
defined('BASEPATH') OR exit('No direct script access allowed');

#[AllowDynamicProperties]
class Audit_model extends CI_Model {

    public function __construct() {
        parent::__construct();
        $this->load->database();
    }

    /**
     * Record an audit trail action
     */
    public function log($user_id, $action, $entity_type, $entity_id = null, $old_values = null, $new_values = null) {
        $ip_address = $this->input->ip_address();
        $user_agent = substr($this->input->user_agent(), 0, 255);

        $insert = [
            'user_id'     => !empty($user_id) ? (int)$user_id : null,
            'action'      => strtoupper(trim($action)),
            'entity_type' => trim($entity_type),
            'entity_id'   => !empty($entity_id) ? (int)$entity_id : null,
            'old_values'  => is_array($old_values) ? json_encode($old_values) : $old_values,
            'new_values'  => is_array($new_values) ? json_encode($new_values) : $new_values,
            'ip_address'  => $ip_address,
            'user_agent'  => $user_agent,
            'created_at'  => date('Y-m-d H:i:s'),
        ];

        return $this->db->insert('audit_logs', $insert);
    }

    /**
     * Retrieve audit log trail
     */
    public function get_logs($filters = [], $limit = 100, $offset = 0) {
        $this->db->select('
            al.*,
            CONCAT(u.first_name, " ", u.last_name) AS actor_name,
            u.email AS actor_email,
            r.name AS actor_role,
            r.display_name AS actor_role_display
        ');
        $this->db->from('audit_logs al');
        $this->db->join('users u', 'u.id = al.user_id', 'left');
        $this->db->join('roles r', 'r.id = u.role_id', 'left');

        if (!empty($filters['user_id'])) {
            $this->db->where('al.user_id', (int)$filters['user_id']);
        }

        if (!empty($filters['action'])) {
            $this->db->where('al.action', strtoupper(trim($filters['action'])));
        }

        if (!empty($filters['entity_type'])) {
            $this->db->where('al.entity_type', trim($filters['entity_type']));
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $this->db->group_start();
            $this->db->like('al.action', $search);
            $this->db->or_like('al.entity_type', $search);
            $this->db->or_like('u.first_name', $search);
            $this->db->or_like('u.last_name', $search);
            $this->db->or_like('u.email', $search);
            $this->db->or_like('al.ip_address', $search);
            $this->db->group_end();
        }

        $this->db->order_by('al.id', 'DESC');
        $this->db->limit($limit, $offset);

        return $this->db->get()->result_array();
    }
}
