<?php
defined('BASEPATH') OR exit('No direct script access allowed');

#[AllowDynamicProperties]
class Report_model extends CI_Model {

    public function __construct() {
        parent::__construct();
        $this->load->database();
    }

    /**
     * Get system-wide executive KPI analytics
     */
    public function get_overview_stats() {
        $total_users = $this->db->count_all('users');
        
        $this->db->where('role_id', 3);
        $total_trainees = $this->db->count_all_results('users');

        $this->db->where('role_id', 2);
        $total_instructors = $this->db->count_all_results('users');

        $total_courses = $this->db->count_all('courses');

        $this->db->where('status', 'published');
        $published_courses = $this->db->count_all_results('courses');

        $total_assignments = $this->db->count_all('course_assignments');

        $this->db->where('status', 'in_progress');
        $active_enrollments = $this->db->count_all_results('course_assignments');

        $this->db->where('status', 'completed');
        $completed_enrollments = $this->db->count_all_results('course_assignments');

        $completion_rate = $total_assignments > 0
            ? round(($completed_enrollments / $total_assignments) * 100, 1)
            : 0.0;

        // Examination analytics
        $this->db->where('status', 'completed');
        $total_attempts = $this->db->count_all_results('assessment_attempts');

        $this->db->where('status', 'completed');
        $this->db->where('is_passed', 1);
        $passed_attempts = $this->db->count_all_results('assessment_attempts');

        $exam_pass_rate = $total_attempts > 0
            ? round(($passed_attempts / $total_attempts) * 100, 1)
            : 0.0;

        $this->db->select('AVG(percentage) as avg_score');
        $this->db->where('status', 'completed');
        $score_row = $this->db->get('assessment_attempts')->row_array();
        $avg_score = !empty($score_row['avg_score']) ? round((float)$score_row['avg_score'], 1) : 0.0;

        return [
            'total_users'           => $total_users,
            'total_trainees'        => $total_trainees,
            'total_instructors'     => $total_instructors,
            'total_courses'         => $total_courses,
            'published_courses'     => $published_courses,
            'total_assignments'     => $total_assignments,
            'active_enrollments'    => $active_enrollments,
            'completed_enrollments' => $completed_enrollments,
            'completion_rate'       => $completion_rate,
            'total_attempts'        => $total_attempts,
            'passed_attempts'       => $passed_attempts,
            'exam_pass_rate'        => $exam_pass_rate,
            'avg_score'             => $avg_score,
        ];
    }

    /**
     * Get departmental compliance breakdown
     */
    public function get_department_metrics() {
        $sql = "
            SELECT 
                COALESCE(NULLIF(TRIM(u.department), ''), 'Unassigned') AS department,
                COUNT(DISTINCT u.id) AS total_learners,
                COUNT(ca.id) AS total_assignments,
                SUM(CASE WHEN ca.status = 'completed' THEN 1 ELSE 0 END) AS completed_assignments,
                ROUND(
                    CASE 
                        WHEN COUNT(ca.id) > 0 THEN (SUM(CASE WHEN ca.status = 'completed' THEN 1 ELSE 0 END) / COUNT(ca.id)) * 100
                        ELSE 0
                    END, 1
                ) AS completion_percentage,
                ROUND(COALESCE(AVG(aa.percentage), 0), 1) AS avg_exam_score
            FROM users u
            LEFT JOIN course_assignments ca ON ca.learner_id = u.id
            LEFT JOIN assessment_attempts aa ON aa.learner_id = u.id AND aa.status = 'completed'
            WHERE u.role_id = 3
            GROUP BY COALESCE(NULLIF(TRIM(u.department), ''), 'Unassigned')
            ORDER BY total_assignments DESC
        ";

        return $this->db->query($sql)->result_array();
    }

    /**
     * Course-level completion and performance metrics
     */
    public function get_course_completion_report($filters = [], $role = 'admin', $user_id = null) {
        $this->db->select('
            c.id AS course_id,
            c.title AS course_title,
            c.category,
            c.status AS course_status,
            CONCAT(u.first_name, " ", u.last_name) AS instructor_name,
            COUNT(ca.id) AS enrolled_count,
            SUM(CASE WHEN ca.status = "in_progress" THEN 1 ELSE 0 END) AS in_progress_count,
            SUM(CASE WHEN ca.status = "completed" THEN 1 ELSE 0 END) AS completed_count,
            ROUND(
                CASE 
                    WHEN COUNT(ca.id) > 0 THEN (SUM(CASE WHEN ca.status = "completed" THEN 1 ELSE 0 END) / COUNT(ca.id)) * 100
                    ELSE 0
                END, 1
            ) AS completion_rate,
            (SELECT COUNT(*) FROM assessment_attempts aa 
             INNER JOIN assessments a ON a.id = aa.assessment_id 
             WHERE a.course_id = c.id AND aa.status = "completed" AND aa.is_passed = 1) AS passed_exams_count,
            (SELECT ROUND(COALESCE(AVG(aa.percentage), 0), 1) FROM assessment_attempts aa 
             INNER JOIN assessments a ON a.id = aa.assessment_id 
             WHERE a.course_id = c.id AND aa.status = "completed") AS avg_exam_score
        ');
        $this->db->from('courses c');
        $this->db->join('users u', 'u.id = c.instructor_id', 'left');
        $this->db->join('course_assignments ca', 'ca.course_id = c.id', 'left');

        if ($role === 'instructor' && $user_id) {
            $this->db->where('c.instructor_id', (int)$user_id);
        }

        if (!empty($filters['category'])) {
            $this->db->where('c.category', $filters['category']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $this->db->group_start();
            $this->db->like('c.title', $search);
            $this->db->or_like('u.first_name', $search);
            $this->db->or_like('u.last_name', $search);
            $this->db->group_end();
        }

        $this->db->group_by('c.id');
        $this->db->order_by('enrolled_count', 'DESC');

        return $this->db->get()->result_array();
    }

    /**
     * Trainee-level compliance tracking report
     */
    public function get_trainee_compliance_report($filters = []) {
        $this->db->select('
            u.id AS learner_id,
            u.employee_id,
            CONCAT(u.first_name, " ", u.last_name) AS learner_name,
            u.email,
            u.department,
            u.designation,
            u.status AS account_status,
            u.last_login_at,
            COUNT(ca.id) AS assigned_count,
            SUM(CASE WHEN ca.status = "completed" THEN 1 ELSE 0 END) AS completed_count,
            SUM(CASE WHEN ca.status = "in_progress" THEN 1 ELSE 0 END) AS in_progress_count,
            ROUND(
                CASE 
                    WHEN COUNT(ca.id) > 0 THEN (SUM(CASE WHEN ca.status = "completed" THEN 1 ELSE 0 END) / COUNT(ca.id)) * 100
                    ELSE 0
                END, 1
            ) AS compliance_rate,
            (SELECT COUNT(*) FROM assessment_attempts aa WHERE aa.learner_id = u.id AND aa.is_passed = 1) AS passed_assessments_count
        ');
        $this->db->from('users u');
        $this->db->join('course_assignments ca', 'ca.learner_id = u.id', 'left');
        $this->db->where('u.role_id', 3); // Trainees

        if (!empty($filters['department'])) {
            $this->db->where('u.department', $filters['department']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $this->db->group_start();
            $this->db->like('u.first_name', $search);
            $this->db->or_like('u.last_name', $search);
            $this->db->or_like('u.email', $search);
            $this->db->or_like('u.employee_id', $search);
            $this->db->group_end();
        }

        $this->db->group_by('u.id');
        $this->db->order_by('compliance_rate', 'ASC');

        return $this->db->get()->result_array();
    }
}
