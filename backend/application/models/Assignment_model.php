<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Assignment_model extends CI_Model {

    public function __construct() {
        parent::__construct();
    }

    /**
     * Assign a course to one or more trainee learners
     * @param int $course_id
     * @param array $learner_ids
     * @param int $assigned_by
     * @param string|null $due_date
     * @return array Assigned records
     */
    public function assign_learners($course_id, array $learner_ids, $assigned_by, $due_date = null) {
        $assigned = [];
        $course = $this->db->get_where('courses', ['id' => $course_id])->row_array();
        if (!$course) return [];

        foreach ($learner_ids as $lid) {
            $lid = (int)$lid;
            if ($lid <= 0) continue;

            // Check if active assignment exists
            $existing = $this->db->get_where('course_assignments', [
                'course_id'  => $course_id,
                'learner_id' => $lid
            ])->row_array();

            if ($existing) {
                // Update due date if changed
                if ($due_date) {
                    $this->db->where('id', $existing['id']);
                    $this->db->update('course_assignments', [
                        'due_date'   => $due_date,
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                }
                $assigned[] = $existing['id'];
                continue;
            }

            $insert_data = [
                'course_id'           => $course_id,
                'learner_id'          => $lid,
                'assigned_by'         => $assigned_by,
                'assigned_at'         => date('Y-m-d H:i:s'),
                'due_date'            => !empty($due_date) ? $due_date : null,
                'status'              => 'assigned',
                'progress_percentage' => 0.00,
                'created_at'          => date('Y-m-d H:i:s'),
                'updated_at'          => date('Y-m-d H:i:s')
            ];

            $this->db->insert('course_assignments', $insert_data);
            $assignment_id = $this->db->insert_id();
            $assigned[] = $assignment_id;

            // Create in-app notification for trainee
            $this->db->insert('notifications', [
                'user_id'             => $lid,
                'title'               => 'New Training Assigned: ' . $course['title'],
                'message'             => 'You have been enrolled in "' . $course['title'] . '".' . ($due_date ? ' Completion due by ' . date('M d, Y', strtotime($due_date)) . '.' : ''),
                'type'                => 'assignment',
                'related_entity_type' => 'course',
                'related_entity_id'   => $course_id,
                'is_read'             => 0,
                'created_at'          => date('Y-m-d H:i:s'),
                'updated_at'          => date('Y-m-d H:i:s')
            ]);
        }

        return $assigned;
    }

    /**
     * Get all assignments with filters (for Admin and Instructor)
     * @param array $filters
     * @param string $role
     * @param int $user_id
     * @return array
     */
    public function get_all_assignments($filters = [], $role = 'admin', $user_id = null) {
        $this->db->select('ca.*, c.course_type, c.title as course_title, c.category as course_category, c.status as course_status, c.instructor_id,
                           CONCAT(u.first_name, " ", u.last_name) as learner_name, u.email as learner_email, u.employee_id as learner_employee_id, u.department as learner_department,
                           CONCAT(ab.first_name, " ", ab.last_name) as assigned_by_name');
        $this->db->from('course_assignments ca');
        $this->db->join('courses c', 'c.id = ca.course_id');
        $this->db->join('users u', 'u.id = ca.learner_id');
        $this->db->join('users ab', 'ab.id = ca.assigned_by');

        if ($role === 'instructor') {
            $this->db->where('c.instructor_id', $user_id);
        }

        if (!empty($filters['course_id'])) {
            $this->db->where('ca.course_id', (int)$filters['course_id']);
        }

        if (!empty($filters['status'])) {
            $this->db->where('ca.status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $this->db->group_start();
            $this->db->like('u.first_name', $search);
            $this->db->or_like('u.last_name', $search);
            $this->db->or_like('u.email', $search);
            $this->db->or_like('c.title', $search);
            $this->db->group_end();
        }

        $this->db->order_by('ca.id', 'DESC');
        $assignments = $this->db->get()->result_array();

        // Check overdue status
        $now = date('Y-m-d H:i:s');
        foreach ($assignments as &$a) {
            if ($a['status'] !== 'completed' && !empty($a['due_date']) && $a['due_date'] < $now) {
                $a['status'] = 'overdue';
            }
        }

        return $assignments;
    }

    /**
     * Get courses assigned to a specific learner
     * @param int $learner_id
     * @param string|null $status
     * @return array
     */
    public function get_learner_assignments($learner_id, $status = null) {
        $this->db->select('ca.*, c.course_type, c.title as course_title, c.category as course_category, c.description as course_description, c.passing_percentage, c.estimated_duration_minutes,
                           CONCAT(inst.first_name, " ", inst.last_name) as instructor_name, inst.department as instructor_department');
        $this->db->from('course_assignments ca');
        $this->db->join('courses c', 'c.id = ca.course_id');
        $this->db->join('users inst', 'inst.id = c.instructor_id');
        $this->db->where('ca.learner_id', (int)$learner_id);

        if (!empty($status)) {
            $this->db->where('ca.status', $status);
        }

        $this->db->order_by('ca.id', 'DESC');
        $assignments = $this->db->get()->result_array();

        $now = date('Y-m-d H:i:s');
        foreach ($assignments as &$a) {
            // Count total and completed lessons for this course assignment
            $this->db->from('lessons l');
            $this->db->join('course_modules cm', 'cm.id = l.module_id');
            $this->db->where('cm.course_id', $a['course_id']);
            $a['total_lessons'] = $this->db->count_all_results();

            $this->db->where('assignment_id', $a['id']);
            $this->db->where('is_completed', 1);
            $a['completed_lessons'] = $this->db->count_all_results('lesson_progress');

            // Find resumed lesson ID
            $this->load->model('Progress_model', 'progress_mod');
            $a['resumed_lesson_id'] = $this->progress_mod->get_resumed_lesson_id($a['course_id'], $a['id']);

            if ($a['status'] !== 'completed' && !empty($a['due_date']) && $a['due_date'] < $now) {
                $a['status'] = 'overdue';
            }
        }

        return $assignments;
    }

    /**
     * Get single assignment with full details
     * @param int $assignment_id
     * @return array|null
     */
    public function get_by_id($assignment_id) {
        $this->db->select('ca.*, c.title as course_title, c.instructor_id');
        $this->db->from('course_assignments ca');
        $this->db->join('courses c', 'c.id = ca.course_id');
        $this->db->where('ca.id', $assignment_id);
        return $this->db->get()->row_array();
    }

    /**
     * Find assignment record by course ID and learner ID
     * @param int $course_id
     * @param int $learner_id
     * @return array|null
     */
    public function get_by_course_and_learner($course_id, $learner_id) {
        return $this->db->get_where('course_assignments', [
            'course_id'  => (int)$course_id,
            'learner_id' => (int)$learner_id
        ])->row_array();
    }

    /**
     * Delete assignment
     * @param int $id
     * @return bool
     */
    public function delete($id) {
        $this->db->where('id', (int)$id);
        return $this->db->delete('course_assignments');
    }
}
