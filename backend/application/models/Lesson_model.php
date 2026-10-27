<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Lesson_model extends CI_Model {

    public function __construct() {
        parent::__construct();
    }

    public function get_by_id($id) {
        $this->db->select('l.*, c.title as course_title, c.instructor_id');
        $this->db->from('lessons l');
        $this->db->join('courses c', 'c.id = l.course_id', 'left');
        $this->db->where('l.id', $id);
        $lesson = $this->db->get()->row_array();

        if ($lesson) {
            $this->db->where('lesson_id', $lesson['id']);
            $lesson['materials'] = $this->db->get('lesson_materials')->result_array();
        }

        return $lesson;
    }

    public function get_by_course($course_id) {
        $this->db->where('course_id', $course_id);
        $this->db->order_by('order_index', 'ASC');
        $this->db->order_by('id', 'ASC');
        $lessons = $this->db->get('lessons')->result_array();

        foreach ($lessons as &$l) {
            $this->db->where('lesson_id', $l['id']);
            $this->db->order_by('id', 'ASC');
            $l['materials'] = $this->db->get('lesson_materials')->result_array();
        }

        return $lessons;
    }

    public function get_by_module($module_id) {
        $this->db->where('module_id', $module_id);
        $this->db->order_by('order_index', 'ASC');
        $this->db->order_by('id', 'ASC');
        $lessons = $this->db->get('lessons')->result_array();

        foreach ($lessons as &$l) {
            $this->db->where('lesson_id', $l['id']);
            $this->db->order_by('id', 'ASC');
            $l['materials'] = $this->db->get('lesson_materials')->result_array();
        }

        return $lessons;
    }

    public function create($data) {
        if (!isset($data['order_index'])) {
            if (!empty($data['course_id'])) {
                $this->db->where('course_id', $data['course_id']);
            } elseif (!empty($data['module_id'])) {
                $this->db->where('module_id', $data['module_id']);
            }
            $current_max = $this->db->select_max('order_index')->get('lessons')->row_array();
            $data['order_index'] = (int)($current_max['order_index'] ?? 0) + 1;
        }

        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $this->db->insert('lessons', $data);
        return $this->db->insert_id();
    }

    public function update($id, $data) {
        $data['updated_at'] = date('Y-m-d H:i:s');
        $this->db->where('id', $id);
        return $this->db->update('lessons', $data);
    }

    public function delete($id) {
        $this->db->where('id', $id);
        return $this->db->delete('lessons');
    }
}
