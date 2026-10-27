<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Course_model extends CI_Model {

    public function __construct() {
        parent::__construct();
    }

    /**
     * Retrieve courses with optional category, status, and role-based filtering
     * @param array $filters
     * @param string $role
     * @param int $user_id
     * @return array
     */
    public function get_all($filters = [], $role = 'admin', $user_id = null) {
        $this->db->select('c.*, CONCAT(u.first_name, " ", u.last_name) as instructor_name, u.email as instructor_email, u.department as instructor_department');
        $this->db->from('courses c');
        $this->db->join('users u', 'u.id = c.instructor_id');

        if ($role === 'instructor' && !empty($filters['my_courses'])) {
            $this->db->where('c.instructor_id', $user_id);
        } elseif ($role === 'instructor') {
            // Instructors see all published courses plus their own drafts
            $this->db->group_start();
            $this->db->where('c.status', 'published');
            $this->db->or_where('c.instructor_id', $user_id);
            $this->db->group_end();
        } elseif ($role === 'learner') {
            // Learners see published courses only
            $this->db->where('c.status', 'published');
        }

        if (!empty($filters['category'])) {
            $this->db->where('c.category', $filters['category']);
        }

        if (!empty($filters['course_type'])) {
            $this->db->where('c.course_type', $filters['course_type']);
        }

        if (!empty($filters['status'])) {
            $this->db->where('c.status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $this->db->group_start();
            $this->db->like('c.title', $search);
            $this->db->or_like('c.description', $search);
            $this->db->or_like('c.category', $search);
            $this->db->group_end();
        }

        $this->db->order_by('c.id', 'DESC');
        $courses = $this->db->get()->result_array();

        // Enhance with module and lesson counts
        foreach ($courses as &$course) {
            $this->db->where('course_id', $course['id']);
            $course['lessons_count'] = $this->db->count_all_results('lessons');
            $course['modules_count'] = 0;

            $this->db->where('course_id', $course['id']);
            $course['enrolled_count'] = $this->db->count_all_results('course_assignments');
        }

        return $courses;
    }

    /**
     * Retrieve single course by ID
     * @param int $id
     * @return array|null
     */
    public function get_by_id($id) {
        $this->db->select('c.*, CONCAT(u.first_name, " ", u.last_name) as instructor_name, u.email as instructor_email, u.department as instructor_department');
        $this->db->from('courses c');
        $this->db->join('users u', 'u.id = c.instructor_id');
        $this->db->where('c.id', $id);
        return $this->db->get()->row_array();
    }

    /**
     * Retrieve complete course hierarchy: course -> lessons -> materials
     * @param int $course_id
     * @return array|null
     */
    public function get_full_curriculum($course_id) {
        $course = $this->get_by_id($course_id);
        if (!$course) return null;

        // Fetch lessons directly under course
        $this->db->where('course_id', $course_id);
        $this->db->order_by('order_index', 'ASC');
        $this->db->order_by('id', 'ASC');
        $lessons = $this->db->get('lessons')->result_array();

        foreach ($lessons as &$lesson) {
            // Fetch materials for each lesson
            $this->db->where('lesson_id', $lesson['id']);
            $this->db->order_by('id', 'ASC');
            $lesson['materials'] = $this->db->get('lesson_materials')->result_array();
        }

        $course['lessons'] = $lessons;

        // Provide backwards-compatible module representation
        $course['modules'] = [
            [
                'id'          => 0,
                'course_id'   => $course_id,
                'title'       => 'Curriculum Lessons',
                'order_index' => 1,
                'lessons'     => $lessons,
            ]
        ];

        // Fetch active certification assessment linked to this course only if certified
        if (($course['course_type'] ?? 'certified') === 'certified') {
            $this->db->where('course_id', $course_id);
            $this->db->where('is_active', 1);
            $ass_row = $this->db->get('assessments')->row_array();
            if ($ass_row) {
                $this->load->model('Assessment_model', 'assessments');
                $course['assessment'] = $this->assessments->get_assessment_by_id($ass_row['id'], false);
            } else {
                $course['assessment'] = null;
            }
        } else {
            $course['assessment'] = null;
        }

        return $course;
    }

    /**
     * Create a new course record
     * @param array $data
     * @return int Insert ID
     */
    public function create($data) {
        if (empty($data['slug'])) {
            $base_slug = url_title($data['title'], '-', TRUE);
            $data['slug'] = $base_slug . '-' . time();
        }

        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $this->db->insert('courses', $data);
        return $this->db->insert_id();
    }

    /**
     * Update an existing course record
     * @param int $id
     * @param array $data
     * @return bool
     */
    public function update($id, $data) {
        $data['updated_at'] = date('Y-m-d H:i:s');
        $this->db->where('id', $id);
        return $this->db->update('courses', $data);
    }

    /**
     * Delete a course record (cascades modules, lessons, materials)
     * @param int $id
     * @return bool
     */
    public function delete($id) {
        $this->db->where('id', $id);
        return $this->db->delete('courses');
    }

    /**
     * Set course status to published
     * @param int $id
     * @return bool
     */
    public function publish($id) {
        return $this->update($id, [
            'status' => 'published',
            'published_at' => date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Set course status to draft
     * @param int $id
     * @return bool
     */
    public function unpublish($id) {
        return $this->update($id, [
            'status' => 'draft'
        ]);
    }
}
