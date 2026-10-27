<?php
defined('BASEPATH') OR exit('No direct script access allowed');

#[AllowDynamicProperties]
class Certificate_model extends CI_Model {

    public function __construct() {
        parent::__construct();
        $this->load->database();
        $this->load->model('Notification_model', 'notifications');
        $this->load->model('Audit_model', 'audit');
    }

    /**
     * Issue an official credential certificate
     */
    public function issue_certificate($learner_id, $course_id, $attempt_id = null, $final_score = 100.00) {
        $learner_id = (int)$learner_id;
        $course_id = (int)$course_id;

        // Verify that the course is a certified training program
        $course = $this->db->get_where('courses', ['id' => $course_id])->row_array();
        if (!$course || ($course['course_type'] ?? 'certified') !== 'certified') {
            return false;
        }

        // Check if certificate already exists for this learner & course
        $existing = $this->db->get_where('certificates', [
            'learner_id' => $learner_id,
            'course_id'  => $course_id,
            'status'     => 'active'
        ])->row_array();

        if ($existing) {
            return $existing;
        }

        // Generate unique corporate certificate verification code
        $code = 'LMS-CERT-' . date('Y') . '-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));

        $now = date('Y-m-d H:i:s');
        $insert = [
            'certificate_code'       => $code,
            'learner_id'             => $learner_id,
            'course_id'              => $course_id,
            'assessment_attempt_id'  => !empty($attempt_id) ? (int)$attempt_id : null,
            'final_score'            => (float)$final_score,
            'issued_at'              => $now,
            'status'                 => 'active',
            'created_at'             => $now,
        ];

        $this->db->insert('certificates', $insert);
        $cert_id = $this->db->insert_id();

        // Get course title for alert
        $course = $this->db->get_where('courses', ['id' => $course_id])->row_array();
        $course_title = $course ? $course['title'] : 'Training Program';

        // Notify learner
        $this->notifications->create(
            $learner_id,
            'Certificate of Completion Issued',
            "Congratulations! Your official Certificate of Completion for '{$course_title}' has been issued (Code: {$code}).",
            'completion',
            'certificates',
            $cert_id
        );

        // Audit log
        $this->audit->log(
            $learner_id,
            'CERTIFICATE_ISSUED',
            'certificates',
            $cert_id,
            null,
            ['certificate_code' => $code, 'course_title' => $course_title, 'final_score' => $final_score]
        );

        return $this->get_by_id($cert_id);
    }

    /**
     * Retrieve all certificates awarded to a specific learner
     */
    public function get_learner_certificates($learner_id) {
        $this->db->select('
            cert.*,
            c.title AS course_title,
            c.category AS course_category,
            c.certificate_template,
            c.duration_days,
            CONCAT(u.first_name, " ", u.last_name) AS learner_name,
            u.email AS learner_email,
            u.employee_id AS learner_employee_id,
            u.department AS learner_department,
            CONCAT(inst.first_name, " ", inst.last_name) AS instructor_name,
            inst.designation AS instructor_designation
        ');
        $this->db->from('certificates cert');
        $this->db->join('courses c', 'c.id = cert.course_id');
        $this->db->join('users u', 'u.id = cert.learner_id');
        $this->db->join('users inst', 'inst.id = c.instructor_id', 'left');
        $this->db->where('cert.learner_id', (int)$learner_id);
        $this->db->where('cert.status', 'active');
        $this->db->order_by('cert.id', 'DESC');

        return $this->db->get()->result_array();
    }

    /**
     * Get certificate by ID
     */
    public function get_by_id($id) {
        $this->db->select('
            cert.*,
            c.title AS course_title,
            c.category AS course_category,
            c.description AS course_description,
            c.certificate_template,
            c.duration_days,
            CONCAT(u.first_name, " ", u.last_name) AS learner_name,
            u.email AS learner_email,
            u.employee_id AS learner_employee_id,
            u.department AS learner_department,
            CONCAT(inst.first_name, " ", inst.last_name) AS instructor_name,
            inst.designation AS instructor_designation
        ');
        $this->db->from('certificates cert');
        $this->db->join('courses c', 'c.id = cert.course_id');
        $this->db->join('users u', 'u.id = cert.learner_id');
        $this->db->join('users inst', 'inst.id = c.instructor_id', 'left');
        $this->db->where('cert.id', (int)$id);

        return $this->db->get()->row_array();
    }

    /**
     * Public credential verification by certificate code
     */
    public function get_by_code($code) {
        $this->db->select('
            cert.certificate_code,
            cert.issued_at,
            cert.final_score,
            cert.status,
            c.title AS course_title,
            c.category AS course_category,
            c.certificate_template,
            c.duration_days,
            CONCAT(u.first_name, " ", u.last_name) AS learner_name,
            u.department AS learner_department,
            CONCAT(inst.first_name, " ", inst.last_name) AS instructor_name
        ');
        $this->db->from('certificates cert');
        $this->db->join('courses c', 'c.id = cert.course_id');
        $this->db->join('users u', 'u.id = cert.learner_id');
        $this->db->join('users inst', 'inst.id = c.instructor_id', 'left');
        $this->db->where('cert.certificate_code', trim($code));

        return $this->db->get()->row_array();
    }

    /**
     * Automatically evaluate milestone eligibility and issue certificate if passed
     */
    public function auto_issue_if_eligible($learner_id, $course_id) {
        $learner_id = (int)$learner_id;
        $course_id = (int)$course_id;

        // Non-certified courses do not issue certificates
        $course = $this->db->get_where('courses', ['id' => $course_id])->row_array();
        if (!$course || ($course['course_type'] ?? 'certified') !== 'certified') {
            return false;
        }

        // Check course assignment completion
        $assignment = $this->db->get_where('course_assignments', [
            'learner_id' => $learner_id,
            'course_id'  => $course_id
        ])->row_array();

        if (!$assignment || (float)$assignment['progress_percentage'] < 100) {
            return false;
        }

        // Check if there is an assessment for this course
        $assessment = $this->db->get_where('assessments', ['course_id' => $course_id, 'is_active' => 1])->row_array();
        $best_attempt = null;

        if ($assessment) {
            $best_attempt = $this->db->where('assessment_id', $assessment['id'])
                                     ->where('learner_id', $learner_id)
                                     ->where('status', 'completed')
                                     ->where('is_passed', 1)
                                     ->order_by('percentage', 'DESC')
                                     ->get('assessment_attempts')
                                     ->row_array();

            if (!$best_attempt) {
                // Assessment exists but has not been passed yet
                return false;
            }
        }

        $final_score = $best_attempt ? (float)$best_attempt['percentage'] : 100.00;
        $attempt_id = $best_attempt ? (int)$best_attempt['id'] : null;

        return $this->issue_certificate($learner_id, $course_id, $attempt_id, $final_score);
    }
}
