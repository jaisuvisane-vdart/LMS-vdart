<?php
defined('BASEPATH') OR exit('No direct script access allowed');

#[AllowDynamicProperties]
class Enrollment_model extends CI_Model {

    public function __construct() {
        parent::__construct();
        $this->load->database();
        $this->load->model('Assignment_model', 'assignments');
        $this->load->model('Audit_model', 'audit_log');
        $this->load->model('Notification_model', 'notification');
    }

    /**
     * Get published courses catalog for a learner with their personalized enrollment status
     *
     * @param int $learner_id
     * @param array $filters
     * @return array
     */
    public function get_catalog_for_learner($learner_id, $filters = []) {
        $learner_id = (int)$learner_id;

        $this->db->select('
            c.id,
            c.title,
            c.slug,
            c.category,
            c.course_type,
            c.access_type,
            c.description,
            c.thumbnail_url,
            c.status,
            c.estimated_duration_minutes,
            c.duration_days,
            c.passing_percentage,
            c.published_at,
            CONCAT(u.first_name, " ", u.last_name) AS instructor_name,
            (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS total_lessons,
            ca.id AS assignment_id,
            ca.status AS assignment_status,
            ca.progress_percentage,
            ca.due_date,
            ca.completed_at,
            cer.id AS request_id,
            cer.status AS request_status,
            cer.request_notes,
            cer.admin_notes,
            cer.created_at AS requested_at,
            cer.reviewed_at
        ');
        $this->db->from('courses c');
        $this->db->join('users u', 'u.id = c.instructor_id', 'left');

        // Join active assignment if exists
        $this->db->join('course_assignments ca', 'ca.course_id = c.id AND ca.learner_id = ' . $learner_id, 'left');

        // Join most recent enrollment request if exists
        $this->db->join(
            'course_enrollment_requests cer',
            'cer.course_id = c.id AND cer.learner_id = ' . $learner_id . ' AND cer.id = (SELECT MAX(cer2.id) FROM course_enrollment_requests cer2 WHERE cer2.course_id = c.id AND cer2.learner_id = ' . $learner_id . ')',
            'left'
        );

        $this->db->where('c.status', 'published');

        if (!empty($filters['category'])) {
            $this->db->where('c.category', $filters['category']);
        }

        if (!empty($filters['course_type'])) {
            $this->db->where('c.course_type', $filters['course_type']);
        }

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            $this->db->group_start();
            $this->db->like('c.title', $search);
            $this->db->or_like('c.description', $search);
            $this->db->or_like('c.category', $search);
            $this->db->group_end();
        }

        $this->db->order_by('c.published_at', 'DESC');
        $this->db->order_by('c.id', 'DESC');

        $courses = $this->db->get()->result_array();

        // Calculate dynamic enrollment_state
        foreach ($courses as &$c) {
            $c['id'] = (int)$c['id'];
            $c['total_lessons'] = (int)$c['total_lessons'];
            $c['duration_days'] = (int)$c['duration_days'];
            $c['estimated_duration_minutes'] = (int)$c['estimated_duration_minutes'];
            $c['passing_percentage'] = (float)$c['passing_percentage'];

            if (!empty($c['assignment_id'])) {
                $c['assignment_id'] = (int)$c['assignment_id'];
                $c['progress_percentage'] = (float)$c['progress_percentage'];
                if ($c['assignment_status'] === 'completed') {
                    $c['enrollment_state'] = 'completed';
                } else {
                    $c['enrollment_state'] = 'enrolled';
                }
            } elseif (!empty($c['request_status']) && $c['request_status'] === 'pending') {
                $c['enrollment_state'] = 'pending';
            } elseif (!empty($c['request_status']) && $c['request_status'] === 'rejected') {
                $c['enrollment_state'] = 'rejected';
            } else {
                $c['enrollment_state'] = 'available';
            }
        }

        return $courses;
    }

    /**
     * Submit an enrollment request from a learner
     *
     * @param int $course_id
     * @param int $learner_id
     * @param string $notes
     * @return array
     */
    public function request_enrollment($course_id, $learner_id, $notes = '') {
        $course_id = (int)$course_id;
        $learner_id = (int)$learner_id;

        // Verify course exists and is published
        $course = $this->db->get_where('courses', ['id' => $course_id, 'status' => 'published'])->row_array();
        if (!$course) {
            return ['success' => false, 'error' => 'Course is not available or not published.', 'status_code' => 404];
        }

        // Verify learner is not already assigned
        $existing_assignment = $this->db->get_where('course_assignments', [
            'course_id'  => $course_id,
            'learner_id' => $learner_id
        ])->row_array();

        if ($existing_assignment) {
            return ['success' => false, 'error' => 'You are already enrolled in this course.', 'status_code' => 409];
        }

        // Check if there is already a pending request
        $pending_request = $this->db->get_where('course_enrollment_requests', [
            'course_id'  => $course_id,
            'learner_id' => $learner_id,
            'status'     => 'pending'
        ])->row_array();

        if ($pending_request) {
            return ['success' => false, 'error' => 'You already have a pending enrollment request for this course.', 'status_code' => 409];
        }

        // Get learner info for notification & audit
        $learner = $this->db->get_where('users', ['id' => $learner_id])->row_array();
        $learner_name = trim(($learner['first_name'] ?? '') . ' ' . ($learner['last_name'] ?? ''));
        if (empty($learner_name)) {
            $learner_name = $learner['email'] ?? 'Learner #' . $learner_id;
        }

        $identifier = !empty($learner['trainee_id']) ? $learner['trainee_id'] : (!empty($learner['employee_id']) ? $learner['employee_id'] : '');

        $access_type = $course['access_type'] ?? 'open_enrollment';

        // Case 1: Open for Enrollment (Direct Self-Registration without Admin Approval)
        if ($access_type === 'open_enrollment') {
            $duration_days = max(1, (int)($course['duration_days'] ?? 30));
            $due_date = date('Y-m-d H:i:s', strtotime("+{$duration_days} days"));

            $assignment_data = [
                'course_id'           => $course_id,
                'learner_id'          => $learner_id,
                'assigned_by'         => $learner_id, // Self-enrolled
                'due_date'            => $due_date,
                'status'              => 'assigned',
                'progress_percentage' => 0.00,
                'assigned_at'         => date('Y-m-d H:i:s'),
                'created_at'          => date('Y-m-d H:i:s'),
                'updated_at'          => date('Y-m-d H:i:s')
            ];
            $this->db->insert('course_assignments', $assignment_data);
            $assignment_id = (int)$this->db->insert_id();

            // Record auto-approved request for audit history
            $insert_data = [
                'course_id'     => $course_id,
                'learner_id'    => $learner_id,
                'status'        => 'approved',
                'request_notes' => !empty($notes) ? trim($notes) : 'Self-enrollment (Open for Enrollment policy)',
                'admin_notes'   => 'Auto-approved: Open for Enrollment course policy',
                'reviewed_by'   => $learner_id,
                'reviewed_at'   => date('Y-m-d H:i:s'),
                'created_at'    => date('Y-m-d H:i:s'),
                'updated_at'    => date('Y-m-d H:i:s')
            ];
            $this->db->insert('course_enrollment_requests', $insert_data);
            $request_id = (int)$this->db->insert_id();

            // Send notification to learner
            $this->notification->create(
                $learner_id,
                'Course Enrollment Confirmed: ' . $course['title'],
                "You have successfully enrolled in \"{$course['title']}\". You can begin learning immediately.",
                'system',
                'courses',
                $course_id
            );

            // Log audit
            $this->audit_log->log(
                $learner_id,
                'COURSE_SELF_ENROLLED',
                'course_assignments',
                $assignment_id,
                null,
                [
                    'course_id'    => $course_id,
                    'course_title' => $course['title'],
                    'access_type'  => 'open_enrollment'
                ]
            );

            return [
                'success'       => true,
                'auto_enrolled' => true,
                'access_type'   => 'open_enrollment',
                'assignment_id' => $assignment_id,
                'request_id'    => $request_id,
                'message'       => 'Successfully enrolled in course! You can now start learning immediately.'
            ];
        }

        // Case 2: Required Admin Access (Pending Administrator Review)
        $insert_data = [
            'course_id'     => $course_id,
            'learner_id'    => $learner_id,
            'status'        => 'pending',
            'request_notes' => !empty($notes) ? trim($notes) : null,
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s')
        ];

        $this->db->insert('course_enrollment_requests', $insert_data);
        $request_id = (int)$this->db->insert_id();

        // Notify admins
        $admins = $this->db->select('id')->from('users')->where('role_id', 1)->where('status', 'active')->get()->result_array();
        $ident_text = !empty($identifier) ? " ({$identifier})" : "";
        foreach ($admins as $admin) {
            $this->notification->create(
                $admin['id'],
                'New Enrollment Request: ' . $course['title'],
                "{$learner_name}{$ident_text} has requested enrollment for the course \"{$course['title']}\" (Admin approval required).",
                'system',
                'course_enrollment_request',
                $request_id
            );
        }

        // Log audit
        $this->audit_log->log(
            $learner_id,
            'ENROLLMENT_REQUESTED',
            'course_enrollment_request',
            $request_id,
            null,
            ['course_id' => $course_id, 'course_title' => $course['title'], 'notes' => $notes, 'access_type' => 'required_admin_access']
        );

        return [
            'success'       => true,
            'auto_enrolled' => false,
            'access_type'   => 'required_admin_access',
            'message'       => 'Enrollment request submitted successfully. Administrator approval is required before you can access this course.',
            'request_id'    => $request_id
        ];
    }

    /**
     * Get all enrollment requests for admin review
     *
     * @param array $filters
     * @return array
     */
    public function get_requests($filters = []) {
        $this->db->select('
            cer.*,
            c.title AS course_title,
            c.category AS course_category,
            c.course_type,
            c.duration_days,
            CONCAT(u.first_name, " ", u.last_name) AS learner_name,
            u.email AS learner_email,
            u.employee_id AS learner_employee_id,
            u.trainee_id AS learner_trainee_id,
            u.learner_type,
            u.batch AS learner_batch,
            u.department AS learner_department,
            CONCAT(rb.first_name, " ", rb.last_name) AS reviewed_by_name
        ');
        $this->db->from('course_enrollment_requests cer');
        $this->db->join('courses c', 'c.id = cer.course_id');
        $this->db->join('users u', 'u.id = cer.learner_id');
        $this->db->join('users rb', 'rb.id = cer.reviewed_by', 'left');

        if (!empty($filters['status']) && in_array($filters['status'], ['pending', 'approved', 'rejected'])) {
            $this->db->where('cer.status', $filters['status']);
        }

        if (!empty($filters['course_id'])) {
            $this->db->where('cer.course_id', (int)$filters['course_id']);
        }

        if (!empty($filters['learner_id'])) {
            $this->db->where('cer.learner_id', (int)$filters['learner_id']);
        }

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            $this->db->group_start();
            $this->db->like('u.first_name', $search);
            $this->db->or_like('u.last_name', $search);
            $this->db->or_like('u.email', $search);
            $this->db->or_like('u.trainee_id', $search);
            $this->db->or_like('u.employee_id', $search);
            $this->db->or_like('u.batch', $search);
            $this->db->or_like('c.title', $search);
            $this->db->group_end();
        }

        // Custom order: pending first, then by created_at DESC
        $this->db->order_by("FIELD(cer.status, 'pending', 'approved', 'rejected')", '', false);
        $this->db->order_by('cer.created_at', 'DESC');

        return $this->db->get()->result_array();
    }

    /**
     * Get count of pending enrollment requests
     *
     * @return int
     */
    public function get_pending_count() {
        return (int)$this->db->where('status', 'pending')->count_all_results('course_enrollment_requests');
    }

    /**
     * Approve an enrollment request
     *
     * @param int $request_id
     * @param int $admin_id
     * @param string|null $due_date
     * @param string|null $admin_notes
     * @return array
     */
    public function approve_request($request_id, $admin_id, $due_date = null, $admin_notes = null) {
        $request_id = (int)$request_id;
        $admin_id = (int)$admin_id;

        $request = $this->db->get_where('course_enrollment_requests', ['id' => $request_id])->row_array();
        if (!$request) {
            return ['success' => false, 'error' => 'Enrollment request not found.', 'status_code' => 404];
        }

        if ($request['status'] !== 'pending') {
            return ['success' => false, 'error' => 'Request has already been processed with status: ' . $request['status'], 'status_code' => 400];
        }

        $course = $this->db->get_where('courses', ['id' => $request['course_id']])->row_array();
        if (!$course) {
            return ['success' => false, 'error' => 'Associated course not found.', 'status_code' => 404];
        }

        $this->db->trans_start();

        // 1. Assign learner to course using Assignment_model
        $assignment_result = $this->assignments->assign_learners(
            $request['course_id'],
            [$request['learner_id']],
            $admin_id,
            $due_date
        );

        // 2. Update request status to approved
        $now = date('Y-m-d H:i:s');
        $this->db->where('id', $request_id);
        $this->db->update('course_enrollment_requests', [
            'status'      => 'approved',
            'reviewed_by' => $admin_id,
            'reviewed_at' => $now,
            'admin_notes' => !empty($admin_notes) ? trim($admin_notes) : null,
            'updated_at'  => $now
        ]);

        // 3. Notify learner
        $due_str = !empty($due_date) ? ' Completion due by ' . date('M d, Y', strtotime($due_date)) . '.' : '';
        $this->notification->create(
            $request['learner_id'],
            'Enrollment Approved: ' . $course['title'],
            "Your enrollment request for \"{$course['title']}\" has been approved!{$due_str} You can start learning now.",
            'assignment',
            'course',
            $request['course_id']
        );

        // 4. Record audit log
        $this->audit_log->log(
            $admin_id,
            'ENROLLMENT_APPROVED',
            'course_enrollment_request',
            $request_id,
            ['status' => 'pending'],
            ['status' => 'approved', 'admin_notes' => $admin_notes, 'due_date' => $due_date]
        );

        $this->db->trans_complete();

        if ($this->db->trans_status() === FALSE) {
            return ['success' => false, 'error' => 'Database transaction failed while approving request.', 'status_code' => 500];
        }

        return [
            'success'       => true,
            'message'       => 'Enrollment request approved successfully. Course assigned to learner.',
            'request_id'    => $request_id,
            'assignment_id' => $assignment_result[0] ?? null
        ];
    }

    /**
     * Reject an enrollment request
     *
     * @param int $request_id
     * @param int $admin_id
     * @param string|null $admin_notes
     * @return array
     */
    public function reject_request($request_id, $admin_id, $admin_notes = null) {
        $request_id = (int)$request_id;
        $admin_id = (int)$admin_id;

        $request = $this->db->get_where('course_enrollment_requests', ['id' => $request_id])->row_array();
        if (!$request) {
            return ['success' => false, 'error' => 'Enrollment request not found.', 'status_code' => 404];
        }

        if ($request['status'] !== 'pending') {
            return ['success' => false, 'error' => 'Request has already been processed with status: ' . $request['status'], 'status_code' => 400];
        }

        $course = $this->db->get_where('courses', ['id' => $request['course_id']])->row_array();
        $course_title = $course ? $course['title'] : 'the course';

        $now = date('Y-m-d H:i:s');
        $this->db->where('id', $request_id);
        $this->db->update('course_enrollment_requests', [
            'status'      => 'rejected',
            'reviewed_by' => $admin_id,
            'reviewed_at' => $now,
            'admin_notes' => !empty($admin_notes) ? trim($admin_notes) : null,
            'updated_at'  => $now
        ]);

        // Notify learner
        $reason_str = !empty($admin_notes) ? ' Reason: ' . trim($admin_notes) : '';
        $this->notification->create(
            $request['learner_id'],
            'Enrollment Request Declined',
            "Your enrollment request for \"{$course_title}\" was not approved.{$reason_str}",
            'system',
            'course',
            $request['course_id']
        );

        // Audit log
        $this->audit_log->log(
            $admin_id,
            'ENROLLMENT_REJECTED',
            'course_enrollment_request',
            $request_id,
            ['status' => 'pending'],
            ['status' => 'rejected', 'admin_notes' => $admin_notes]
        );

        return [
            'success'    => true,
            'message'    => 'Enrollment request rejected.',
            'request_id' => $request_id
        ];
    }
}
