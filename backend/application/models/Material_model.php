<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Material_model extends CI_Model {

    public function __construct() {
        parent::__construct();
    }

    public function get_by_id($id) {
        $this->db->select('lm.*, l.title as lesson_title, cm.course_id, c.title as course_title, c.instructor_id');
        $this->db->from('lesson_materials lm');
        $this->db->join('lessons l', 'l.id = lm.lesson_id');
        $this->db->join('course_modules cm', 'cm.id = l.module_id');
        $this->db->join('courses c', 'c.id = cm.course_id');
        $this->db->where('lm.id', $id);
        return $this->db->get()->row_array();
    }

    public function get_by_lesson($lesson_id) {
        $this->db->where('lesson_id', $lesson_id);
        $this->db->order_by('id', 'ASC');
        return $this->db->get('lesson_materials')->result_array();
    }

    public function create($data) {
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        $this->db->insert('lesson_materials', $data);
        return $this->db->insert_id();
    }

    public function delete($id) {
        $this->db->where('id', $id);
        return $this->db->delete('lesson_materials');
    }
}
