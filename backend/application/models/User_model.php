<?php
defined('BASEPATH') OR exit('No direct script access allowed');

#[AllowDynamicProperties]
class User_model extends CI_Model {

    public function __construct() {
        parent::__construct();
        $this->load->database();
    }

    /**
     * Find user by email with role details
     */
    public function get_by_email($email) {
        $this->db->select('u.*, r.name as role, r.display_name as role_display_name');
        $this->db->from('users u');
        $this->db->join('roles r', 'r.id = u.role_id');
        $this->db->where('u.email', $email);
        return $this->db->get()->row_array();
    }

    /**
     * Find user by ID
     */
    public function get_by_id($id) {
        $this->db->select('u.id, u.role_id, u.learner_type, u.trainee_id, u.employee_id, u.first_name, u.last_name, u.email, u.department, u.batch, u.designation, u.phone, u.status, u.sync_source, u.last_synced_at, u.is_first_login, u.avatar_url, u.last_login_at, r.name as role, r.display_name as role_display_name');
        $this->db->from('users u');
        $this->db->join('roles r', 'r.id = u.role_id');
        $this->db->where('u.id', (int)$id);
        return $this->db->get()->row_array();
    }

    /**
     * Get password hash for authentication or password verification
     */
    public function get_password_hash($id) {
        $row = $this->db->select('password_hash')->where('id', (int)$id)->get('users')->row_array();
        return $row['password_hash'] ?? null;
    }

    /**
     * Update last login timestamp
     */
    public function update_last_login($user_id) {
        $this->db->where('id', (int)$user_id);
        $this->db->update('users', ['last_login_at' => date('Y-m-d H:i:s')]);
    }

    /**
     * Get all users with filters for Admin User Management
     */
    public function get_all_users($filters = []) {
        $this->db->select('
            u.id, u.role_id, u.learner_type, u.trainee_id, u.employee_id, u.first_name, u.last_name, u.email, 
            u.department, u.batch, u.designation, u.phone, u.status, u.sync_source, u.last_synced_at, u.created_at, u.last_login_at,
            r.name as role, r.display_name as role_display_name,
            (SELECT COUNT(*) FROM course_assignments ca WHERE ca.learner_id = u.id) AS assigned_courses_count,
            (SELECT COUNT(*) FROM course_assignments ca WHERE ca.learner_id = u.id AND ca.status = "completed") AS completed_courses_count
        ');
        $this->db->from('users u');
        $this->db->join('roles r', 'r.id = u.role_id');

        if (!empty($filters['role_id'])) {
            $this->db->where('u.role_id', (int)$filters['role_id']);
        }

        if (!empty($filters['learner_type'])) {
            $this->db->where('u.learner_type', $filters['learner_type']);
        }

        if (!empty($filters['batch'])) {
            $this->db->where('u.batch', $filters['batch']);
        }

        if (!empty($filters['status'])) {
            $this->db->where('u.status', $filters['status']);
        }

        if (!empty($filters['department'])) {
            $this->db->where('u.department', $filters['department']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $this->db->group_start();
            $this->db->like('u.first_name', $search);
            $this->db->or_like('u.last_name', $search);
            $this->db->or_like('u.email', $search);
            $this->db->or_like('u.trainee_id', $search);
            $this->db->or_like('u.employee_id', $search);
            $this->db->or_like('u.department', $search);
            $this->db->or_like('u.batch', $search);
            $this->db->group_end();
        }

        $this->db->order_by('u.id', 'DESC');
        return $this->db->get()->result_array();
    }

    /**
     * Get distinct batches with trainee counts
     */
    public function get_all_batches() {
        $this->db->select('batch, COUNT(*) as trainee_count');
        $this->db->from('users');
        $this->db->where('batch IS NOT NULL', null, false);
        $this->db->where('batch !=', '');
        $this->db->group_by('batch');
        $this->db->order_by('batch', 'ASC');
        return $this->db->get()->result_array();
    }

    /**
     * Get all roles
     */
    public function get_roles() {
        $this->db->order_by('id', 'ASC');
        return $this->db->get('roles')->result_array();
    }

    /**
     * Create user account
     */
    public function create_user($data) {
        $role_id = (int)($data['role_id'] ?? 3);
        $learner_type = null;
        if ($role_id === 3) {
            $learner_type = in_array($data['learner_type'] ?? '', ['trainee', 'recruiter'], true) ? $data['learner_type'] : 'trainee';
        }

        $trainee_id = ($learner_type === 'trainee') ? trim($data['trainee_id'] ?? $data['employee_id'] ?? '') : null;
        $employee_id = trim($data['employee_id'] ?? ($trainee_id ?: ''));

        $insert = [
            'role_id'       => $role_id,
            'learner_type'  => $learner_type,
            'trainee_id'    => $trainee_id,
            'employee_id'   => $employee_id,
            'first_name'    => trim($data['first_name'] ?? ''),
            'last_name'     => trim($data['last_name'] ?? ''),
            'email'         => strtolower(trim($data['email'] ?? '')),
            'password_hash' => password_hash(!empty($data['password']) ? $data['password'] : 'Welcome@123', PASSWORD_BCRYPT),
            'department'    => trim($data['department'] ?? ''),
            'batch'         => ($learner_type === 'trainee' && !empty($data['batch'])) ? trim($data['batch']) : null,
            'designation'   => trim($data['designation'] ?? ''),
            'phone'         => trim($data['phone'] ?? ''),
            'status'        => in_array($data['status'] ?? '', ['active', 'inactive', 'suspended']) ? $data['status'] : 'active',
            'sync_source'   => in_array($data['sync_source'] ?? '', ['manual', 'google_sheet']) ? $data['sync_source'] : 'manual',
            'is_first_login'=> 1,
            'created_at'    => date('Y-m-d H:i:s'),
        ];

        $this->db->insert('users', $insert);
        return $this->db->insert_id();
    }

    /**
     * Update user account
     */
    public function update_user($id, $data) {
        $update = [];
        if (isset($data['role_id'])) $update['role_id'] = (int)$data['role_id'];
        if (isset($data['learner_type'])) $update['learner_type'] = in_array($data['learner_type'], ['trainee', 'recruiter'], true) ? $data['learner_type'] : null;
        if (isset($data['batch'])) $update['batch'] = !empty($data['batch']) ? trim($data['batch']) : null;
        if (isset($data['sync_source'])) $update['sync_source'] = $data['sync_source'];
        if (isset($data['last_synced_at'])) $update['last_synced_at'] = $data['last_synced_at'];
        if (isset($data['trainee_id'])) $update['trainee_id'] = trim($data['trainee_id']);
        if (isset($data['employee_id'])) $update['employee_id'] = trim($data['employee_id']);
        if (isset($data['first_name'])) $update['first_name'] = trim($data['first_name']);
        if (isset($data['last_name'])) $update['last_name'] = trim($data['last_name']);
        if (isset($data['email'])) $update['email'] = strtolower(trim($data['email']));
        if (isset($data['department'])) $update['department'] = trim($data['department']);
        if (isset($data['designation'])) $update['designation'] = trim($data['designation']);
        if (isset($data['phone'])) $update['phone'] = trim($data['phone']);
        if (isset($data['status'])) $update['status'] = $data['status'];
        if (isset($data['is_first_login'])) $update['is_first_login'] = (int)$data['is_first_login'];

        if (!empty($data['password_hash'])) {
            $update['password_hash'] = $data['password_hash'];
        } elseif (!empty($data['password'])) {
            $update['password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        if (empty($update)) {
            return false;
        }

        $this->db->where('id', (int)$id);
        return $this->db->update('users', $update);
    }

    /**
     * Toggle account status
     */
    public function toggle_status($id, $status) {
        if (!in_array($status, ['active', 'inactive', 'suspended'])) {
            return false;
        }
        $this->db->where('id', (int)$id);
        return $this->db->update('users', ['status' => $status]);
    }

    /**
     * Permanently delete a user account and reassign authored courses/assignments to admin
     */
    public function delete_user($id, $admin_id) {
        $id = (int)$id;
        $admin_id = (int)$admin_id;

        $this->db->trans_start();

        // 1. Reassign any courses authored by this user to the administering account
        $this->db->where('instructor_id', $id)->update('courses', ['instructor_id' => $admin_id]);

        // 2. Reassign course assignments where this user was the assigner
        $this->db->where('assigned_by', $id)->update('course_assignments', ['assigned_by' => $admin_id]);

        // 3. Delete the user (cascades to assignments, progress, attempts, notifications, certificates, otps)
        $this->db->where('id', $id)->delete('users');

        $this->db->trans_complete();

        return $this->db->trans_status();
    }

    /**
     * Check if email exists
     */
    public function email_exists($email, $exclude_id = null) {
        $this->db->where('email', strtolower(trim($email)));
        if ($exclude_id) {
            $this->db->where('id !=', (int)$exclude_id);
        }
        return $this->db->count_all_results('users') > 0;
    }

    /**
     * Get aggregate KPI statistics tailored for specific roles
     */
    public function get_dashboard_metrics($role, $user_id, $range = 'Week') {
        $role = strtolower($role);

        if ($role === 'admin') {
            $total_users = $this->db->count_all('users');

            $this->db->where('role_id', 2);
            $total_instructors = $this->db->count_all_results('users');

            $this->db->where('role_id', 3);
            $total_learners = $this->db->count_all_results('users');

            $total_courses = $this->db->count_all('courses');

            // Course assignment status counts according to the database
            $completed_count   = (int)$this->db->where('status', 'completed')->count_all_results('course_assignments');
            $in_progress_count = (int)$this->db->where('status', 'in_progress')->count_all_results('course_assignments');
            $not_started_count = (int)$this->db->where('status', 'assigned')->count_all_results('course_assignments');
            $not_passed_count  = (int)$this->db->where('status', 'overdue')->count_all_results('course_assignments');
            $total_assignments = $completed_count + $in_progress_count + $not_started_count + $not_passed_count;

            $completion_percentage = $total_assignments > 0 
                ? round(($completed_count / $total_assignments) * 100, 2) 
                : 0.0;

            $progress_status = [
                'completed'   => [
                    'count'      => $completed_count,
                    'percentage' => $total_assignments > 0 ? round(($completed_count / $total_assignments) * 100, 2) : 0.0,
                    'color'      => '#10B981',
                    'label'      => 'Completed',
                ],
                'in_progress' => [
                    'count'      => $in_progress_count,
                    'percentage' => $total_assignments > 0 ? round(($in_progress_count / $total_assignments) * 100, 2) : 0.0,
                    'color'      => '#F59E0B',
                    'label'      => 'In progress',
                ],
                'not_started' => [
                    'count'      => $not_started_count,
                    'percentage' => $total_assignments > 0 ? round(($not_started_count / $total_assignments) * 100, 2) : 0.0,
                    'color'      => '#94A3B8',
                    'label'      => 'Not started',
                ],
                'not_passed'  => [
                    'count'      => $not_passed_count,
                    'percentage' => $total_assignments > 0 ? round(($not_passed_count / $total_assignments) * 100, 2) : 0.0,
                    'color'      => '#EF4444',
                    'label'      => 'Not passed',
                ],
                'total'                 => $total_assignments,
                'completion_percentage' => $completion_percentage,
            ];

            // Dynamic portal activity time-series according to database audit logs and assignments
            $portal_activity = $this->get_portal_activity_series($range);

            return [
                'total_users'           => $total_users,
                'total_instructors'     => $total_instructors,
                'total_learners'        => $total_learners,
                'total_courses'         => $total_courses,
                'total_assignments'     => $total_assignments,
                'active_assignments'    => $in_progress_count,
                'completed_assignments' => $completed_count,
                'completion_percentage' => $completion_percentage,
                'progress_status'       => $progress_status,
                'portal_activity'       => $portal_activity,
            ];
        }

        if ($role === 'instructor') {
            $this->db->where('instructor_id', $user_id);
            $my_courses = $this->db->count_all_results('courses');

            $this->db->where('instructor_id', $user_id);
            $this->db->where('status', 'published');
            $published_courses = $this->db->count_all_results('courses');

            $this->db->select('COUNT(DISTINCT ca.learner_id) as assigned_learners');
            $this->db->from('course_assignments ca');
            $this->db->join('courses c', 'c.id = ca.course_id');
            $this->db->where('c.instructor_id', $user_id);
            $q1 = $this->db->get()->row_array();
            $assigned_learners = (int)($q1['assigned_learners'] ?? 0);

            $this->db->from('course_assignments ca');
            $this->db->join('courses c', 'c.id = ca.course_id');
            $this->db->where('c.instructor_id', $user_id);
            $this->db->where('ca.status !=', 'completed');
            $active_assignments = $this->db->count_all_results();

            $this->db->from('course_assignments ca');
            $this->db->join('courses c', 'c.id = ca.course_id');
            $this->db->where('c.instructor_id', $user_id);
            $this->db->where('ca.status', 'completed');
            $completed_training = $this->db->count_all_results();

            // Avg assessment score across authored courses
            $this->db->select('AVG(aa.percentage) as avg_score');
            $this->db->from('assessment_attempts aa');
            $this->db->join('assessments a', 'a.id = aa.assessment_id');
            $this->db->join('courses c', 'c.id = a.course_id');
            $this->db->where('c.instructor_id', $user_id);
            $this->db->where('aa.status', 'completed');
            $avg_q = $this->db->get()->row_array();
            $avg_score = !empty($avg_q['avg_score']) ? round((float)$avg_q['avg_score'], 1) : 0.0;

            return [
                'my_courses'           => $my_courses,
                'published_courses'    => $published_courses,
                'assigned_learners'    => $assigned_learners,
                'active_assignments'   => $active_assignments,
                'completed_training'   => $completed_training,
                'avg_assessment_score' => $avg_score
            ];
        }

        if ($role === 'learner') {
            $this->db->where('learner_id', $user_id);
            $assigned_courses = $this->db->count_all_results('course_assignments');

            $this->db->where('learner_id', $user_id);
            $this->db->where('status', 'in_progress');
            $in_progress_courses = $this->db->count_all_results('course_assignments');

            $this->db->where('learner_id', $user_id);
            $this->db->where('status', 'completed');
            $completed_courses = $this->db->count_all_results('course_assignments');

            $this->db->where('learner_id', $user_id);
            $this->db->where('status', 'completed');
            $this->db->where('is_passed', 1);
            $passed_assessments = $this->db->count_all_results('assessment_attempts');

            return [
                'assigned_courses'    => $assigned_courses,
                'in_progress_courses' => $in_progress_courses,
                'completed_courses'   => $completed_courses,
                'passed_assessments'  => $passed_assessments
            ];
        }

        return [];
    }

    /**
     * Build portal activity time series for clustered bar chart based on database logs
     */
    public function get_portal_activity_series($range = 'Week') {
        $range = ucfirst(strtolower(trim($range)));
        $series = [];

        if ($range === 'Day') {
            // Last 24 Hours in 6 time blocks of 4 hours each
            $now = time();
            for ($i = 5; $i >= 0; $i--) {
                $start_t  = $now - (($i + 1) * 4 * 3600);
                $end_t    = $now - ($i * 4 * 3600);
                $start_dt = date('Y-m-d H:i:s', $start_t);
                $end_dt   = date('Y-m-d H:i:s', $end_t);
                $label    = date('H:i', $start_t);
                $sublabel = date('M j', $start_t);

                $logins = (int)$this->db
                    ->where('action', 'USER_LOGIN')
                    ->where('created_at >=', $start_dt)
                    ->where('created_at <', $end_dt)
                    ->count_all_results('audit_logs');

                $completions = (int)$this->db
                    ->where('status', 'completed')
                    ->where('COALESCE(completed_at, updated_at) >=', $start_dt)
                    ->where('COALESCE(completed_at, updated_at) <', $end_dt)
                    ->count_all_results('course_assignments');

                $series[] = [
                    'label'       => $label,
                    'sublabel'    => $sublabel,
                    'logins'      => $logins,
                    'completions' => $completions,
                ];
            }
        } elseif ($range === 'Month') {
            // Last 4 weekly periods
            $now = time();
            for ($i = 3; $i >= 0; $i--) {
                $start_t  = $now - (($i + 1) * 7 * 86400);
                $end_t    = $now - ($i * 7 * 86400);
                $start_dt = date('Y-m-d 00:00:00', $start_t);
                $end_dt   = date('Y-m-d 23:59:59', $end_t);
                $week_num = 4 - $i;
                $label    = "Week {$week_num}";
                $sublabel = date('M j', $start_t) . ' - ' . date('M j', $end_t);

                $logins = (int)$this->db
                    ->where('action', 'USER_LOGIN')
                    ->where('created_at >=', $start_dt)
                    ->where('created_at <=', $end_dt)
                    ->count_all_results('audit_logs');

                $completions = (int)$this->db
                    ->where('status', 'completed')
                    ->where('COALESCE(completed_at, updated_at) >=', $start_dt)
                    ->where('COALESCE(completed_at, updated_at) <=', $end_dt)
                    ->count_all_results('course_assignments');

                $series[] = [
                    'label'       => $label,
                    'sublabel'    => $sublabel,
                    'logins'      => $logins,
                    'completions' => $completions,
                ];
            }
        } elseif ($range === 'Year') {
            // Last 6 months
            $now = time();
            for ($i = 5; $i >= 0; $i--) {
                $month_time = strtotime("-{$i} months", $now);
                $start_dt   = date('Y-m-01 00:00:00', $month_time);
                $end_dt     = date('Y-m-t 23:59:59', $month_time);
                $label      = date('M Y', $month_time);
                $sublabel   = date('Y', $month_time);

                $logins = (int)$this->db
                    ->where('action', 'USER_LOGIN')
                    ->where('created_at >=', $start_dt)
                    ->where('created_at <=', $end_dt)
                    ->count_all_results('audit_logs');

                $completions = (int)$this->db
                    ->where('status', 'completed')
                    ->where('COALESCE(completed_at, updated_at) >=', $start_dt)
                    ->where('COALESCE(completed_at, updated_at) <=', $end_dt)
                    ->count_all_results('course_assignments');

                $series[] = [
                    'label'       => $label,
                    'sublabel'    => $sublabel,
                    'logins'      => $logins,
                    'completions' => $completions,
                ];
            }
        } else {
            // Default: 'Week' - Last 7 Days
            $now = time();
            for ($i = 6; $i >= 0; $i--) {
                $day_time = strtotime("-{$i} days", $now);
                $date_str = date('Y-m-d', $day_time);
                $label    = date('l', $day_time);
                $sublabel = date('M j', $day_time);

                $logins = (int)$this->db
                    ->where('action', 'USER_LOGIN')
                    ->where('DATE(created_at)', $date_str)
                    ->count_all_results('audit_logs');

                $completions = (int)$this->db
                    ->where('status', 'completed')
                    ->where('DATE(COALESCE(completed_at, updated_at))', $date_str)
                    ->count_all_results('course_assignments');

                $series[] = [
                    'date'        => $date_str,
                    'label'       => $label,
                    'sublabel'    => $sublabel,
                    'logins'      => $logins,
                    'completions' => $completions,
                ];
            }
        }

        // Calculate max value across series for dynamic Y-axis scaling
        $max_val = 0;
        foreach ($series as $s) {
            if ($s['logins'] > $max_val) $max_val = $s['logins'];
            if ($s['completions'] > $max_val) $max_val = $s['completions'];
        }
        if ($max_val <= 6) {
            $max_val = 6;
        } else {
            $max_val = (int)(ceil($max_val / 5) * 5);
        }

        return [
            'range'     => $range,
            'series'    => $series,
            'max_value' => $max_val,
        ];
    }
}
