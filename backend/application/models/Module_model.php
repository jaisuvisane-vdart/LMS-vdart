<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Module_model extends CI_Model {

    public function __construct() {
        parent::__construct();
    }

    public function get_by_id($id) {
        $this->db->where('id', $id);
        return $this->db->get('course_modules')->row_array();
    }

    public function get_by_course($course_id) {
        $this->db->where('course_id', $course_id);
        $this->db->order_by('order_index', 'ASC');
        return $this->db->get('course_modules')->result_array();
    }

    public function create($data) {
        if (!isset($data['order_index'])) {
            $this->db->where('course_id', $data['course_id']);
            $current_max = $this->db->select_max('order_index')->get('course_modules')->row_array();
            $data['order_index'] = (int)($current_max['order_index'] ?? 0) + 1;
        }

        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $this->db->insert('course_modules', $data);
        return $this->db->insert_id();
    }

    public function update($id, $data) {
        $data['updated_at'] = date('Y-m-d H:i:s');
        $this->db->where('id', $id);
        return $this->db->update('course_modules', $data);
    }

    public function delete($id) {
        $this->db->where('id', $id);
        return $this->db->delete('course_modules');
    }
}
