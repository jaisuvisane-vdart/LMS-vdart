<?php
defined('BASEPATH') OR exit('No direct script access allowed');

#[AllowDynamicProperties]
class Assessment_model extends CI_Model {

    public function __construct() {
        parent::__construct();
        $this->load->database();
    }

    /**
     * Get assessments with optional filters
     */
    public function get_assessments($filters = [], $role = 'admin', $user_id = null) {
        $this->db->select('
            a.*,
            c.title AS course_title,
            c.instructor_id,
            CONCAT(u.first_name, " ", u.last_name) AS instructor_name,
            cm.title AS module_title,
            (SELECT COUNT(*) FROM assessment_questions aq WHERE aq.assessment_id = a.id) AS total_questions,
            (SELECT COALESCE(SUM(marks), 0) FROM assessment_questions aq WHERE aq.assessment_id = a.id) AS total_marks,
            (SELECT COUNT(*) FROM assessment_attempts aa WHERE aa.assessment_id = a.id) AS total_attempts
        ');
        $this->db->from('assessments a');
        $this->db->join('courses c', 'c.id = a.course_id');
        $this->db->join('users u', 'u.id = c.instructor_id', 'left');
        $this->db->join('course_modules cm', 'cm.id = a.module_id', 'left');

        if ($role === 'instructor' && $user_id) {
            $this->db->where('c.instructor_id', $user_id);
        }

        if (!empty($filters['course_id'])) {
            $this->db->where('a.course_id', (int)$filters['course_id']);
        }

        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $this->db->where('a.is_active', (int)$filters['is_active']);
        }

        if (!empty($filters['search'])) {
            $this->db->group_start();
            $this->db->like('a.title', $filters['search']);
            $this->db->or_like('c.title', $filters['search']);
            $this->db->group_end();
        }

        $this->db->order_by('a.id', 'DESC');
        return $this->db->get()->result_array();
    }

    /**
     * Get single assessment with full questions and options
     * Strips answer keys if requested by learner
     */
    public function get_assessment_by_id($id, $is_learner = false) {
        $this->db->select('
            a.*,
            c.title AS course_title,
            c.instructor_id,
            CONCAT(u.first_name, " ", u.last_name) AS instructor_name,
            cm.title AS module_title
        ');
        $this->db->from('assessments a');
        $this->db->join('courses c', 'c.id = a.course_id');
        $this->db->join('users u', 'u.id = c.instructor_id', 'left');
        $this->db->join('course_modules cm', 'cm.id = a.module_id', 'left');
        $this->db->where('a.id', (int)$id);
        $assessment = $this->db->get()->row_array();

        if (!$assessment) {
            return null;
        }

        // Fetch questions
        $this->db->where('assessment_id', $assessment['id']);
        $this->db->order_by('order_index', 'ASC');
        $this->db->order_by('id', 'ASC');
        $questions = $this->db->get('assessment_questions')->result_array();

        foreach ($questions as &$q) {
            $this->db->select('id, question_id, option_text, order_index' . ($is_learner ? '' : ', is_correct'));
            $this->db->where('question_id', $q['id']);
            $this->db->order_by('order_index', 'ASC');
            $this->db->order_by('id', 'ASC');
            $q['options'] = $this->db->get('assessment_options')->result_array();

            // Sanitize boolean
            if (!$is_learner) {
                foreach ($q['options'] as &$opt) {
                    $opt['is_correct'] = (int)$opt['is_correct'];
                }
            }

            // Hide explanation during exam for learners
            if ($is_learner) {
                unset($q['explanation']);
            }
        }
        $assessment['questions'] = $questions;
        return $assessment;
    }

    /**
     * Create assessment
     */
    public function create_assessment($data) {
        $insert = [
            'course_id'          => (int)$data['course_id'],
            'module_id'          => !empty($data['module_id']) ? (int)$data['module_id'] : null,
            'title'              => trim($data['title']),
            'description'        => $data['description'] ?? null,
            'passing_percentage' => isset($data['passing_percentage']) ? (float)$data['passing_percentage'] : 70.00,
            'time_limit_minutes' => isset($data['time_limit_minutes']) ? (int)$data['time_limit_minutes'] : 30,
            'max_attempts'       => isset($data['max_attempts']) ? (int)$data['max_attempts'] : 1,
            'is_active'          => isset($data['is_active']) ? (int)$data['is_active'] : 1,
            'created_at'         => date('Y-m-d H:i:s'),
        ];

        $this->db->insert('assessments', $insert);
        return $this->db->insert_id();
    }

    /**
     * Update assessment
     */
    public function update_assessment($id, $data) {
        $update = [];
        if (isset($data['title'])) $update['title'] = trim($data['title']);
        if (isset($data['description'])) $update['description'] = $data['description'];
        if (isset($data['module_id'])) $update['module_id'] = !empty($data['module_id']) ? (int)$data['module_id'] : null;
        if (isset($data['passing_percentage'])) $update['passing_percentage'] = (float)$data['passing_percentage'];
        if (isset($data['time_limit_minutes'])) $update['time_limit_minutes'] = (int)$data['time_limit_minutes'];
        if (isset($data['max_attempts'])) $update['max_attempts'] = (int)$data['max_attempts'];
        if (isset($data['is_active'])) $update['is_active'] = (int)$data['is_active'];

        if (empty($update)) {
            return false;
        }

        $this->db->where('id', (int)$id);
        return $this->db->update('assessments', $update);
    }

    /**
     * Delete assessment
     */
    public function delete_assessment($id) {
        $this->db->where('id', (int)$id);
        return $this->db->delete('assessments');
    }

    /**
     * Add question with options
     */
    public function add_question($assessment_id, $data) {
        $q_insert = [
            'assessment_id' => (int)$assessment_id,
            'question_text' => trim($data['question_text']),
            'question_type' => in_array($data['question_type'], ['multiple_choice', 'true_false']) ? $data['question_type'] : 'multiple_choice',
            'marks'         => isset($data['marks']) ? max(1, (int)$data['marks']) : 1,
            'order_index'   => isset($data['order_index']) ? (int)$data['order_index'] : 1,
            'explanation'   => $data['explanation'] ?? null,
            'created_at'    => date('Y-m-d H:i:s'),
        ];

        $this->db->insert('assessment_questions', $q_insert);
        $question_id = $this->db->insert_id();

        if (!empty($data['options']) && is_array($data['options'])) {
            $opt_order = 1;
            foreach ($data['options'] as $opt) {
                if (empty(trim($opt['option_text'] ?? ''))) continue;
                $this->db->insert('assessment_options', [
                    'question_id' => $question_id,
                    'option_text' => trim($opt['option_text']),
                    'is_correct'  => !empty($opt['is_correct']) ? 1 : 0,
                    'order_index' => $opt_order++,
                    'created_at'  => date('Y-m-d H:i:s'),
                ]);
            }
        }

        return $question_id;
    }

    /**
     * Update question with options
     */
    public function update_question($question_id, $data) {
        $q_update = [];
        if (isset($data['question_text'])) $q_update['question_text'] = trim($data['question_text']);
        if (isset($data['question_type'])) $q_update['question_type'] = $data['question_type'];
        if (isset($data['marks'])) $q_update['marks'] = max(1, (int)$data['marks']);
        if (isset($data['order_index'])) $q_update['order_index'] = (int)$data['order_index'];
        if (isset($data['explanation'])) $q_update['explanation'] = $data['explanation'];

        if (!empty($q_update)) {
            $this->db->where('id', (int)$question_id);
            $this->db->update('assessment_questions', $q_update);
        }

        // Replace options if provided
        if (isset($data['options']) && is_array($data['options'])) {
            $this->db->where('question_id', (int)$question_id);
            $this->db->delete('assessment_options');

            $opt_order = 1;
            foreach ($data['options'] as $opt) {
                if (empty(trim($opt['option_text'] ?? ''))) continue;
                $this->db->insert('assessment_options', [
                    'question_id' => (int)$question_id,
                    'option_text' => trim($opt['option_text']),
                    'is_correct'  => !empty($opt['is_correct']) ? 1 : 0,
                    'order_index' => $opt_order++,
                    'created_at'  => date('Y-m-d H:i:s'),
                ]);
            }
        }

        return true;
    }

    /**
     * Delete question
     */
    public function delete_question($question_id) {
        $this->db->where('id', (int)$question_id);
        return $this->db->delete('assessment_questions');
    }

    /**
     * Get all assessments available to a learner based on active course assignments
     */
    public function get_learner_assessments($learner_id) {
        $sql = "
            SELECT 
                a.id,
                a.course_id,
                a.module_id,
                a.title,
                a.description,
                a.passing_percentage,
                a.time_limit_minutes,
                1 AS max_attempts,
                c.title AS course_title,
                CONCAT(u.first_name, ' ', u.last_name) AS instructor_name,
                ca.id AS assignment_id,
                ca.status AS assignment_status,
                ca.progress_percentage AS course_progress,
                ca.due_date,
                (ca.progress_percentage >= 100.00 OR ca.status = 'completed') AS is_unlocked,
                (SELECT COUNT(*) FROM assessment_questions aq WHERE aq.assessment_id = a.id) AS total_questions,
                (SELECT COALESCE(SUM(marks), 0) FROM assessment_questions aq WHERE aq.assessment_id = a.id) AS total_marks,
                (SELECT COUNT(*) FROM assessment_attempts aa WHERE aa.assessment_id = a.id AND aa.learner_id = ? AND aa.status IN ('completed', 'timed_out')) AS attempts_taken,
                (SELECT COALESCE(MAX(percentage), 0) FROM assessment_attempts aa WHERE aa.assessment_id = a.id AND aa.learner_id = ? AND aa.status = 'completed') AS highest_score,
                (SELECT COUNT(*) > 0 FROM assessment_attempts aa WHERE aa.assessment_id = a.id AND aa.learner_id = ? AND aa.is_passed = 1) AS is_passed,
                (SELECT MAX(submitted_at) FROM assessment_attempts aa WHERE aa.assessment_id = a.id AND aa.learner_id = ?) AS last_attempted_at,
                (SELECT id FROM assessment_attempts aa WHERE aa.assessment_id = a.id AND aa.learner_id = ? AND aa.status = 'in_progress' ORDER BY id DESC LIMIT 1) AS active_attempt_id,
                (SELECT id FROM assessment_attempts aa WHERE aa.assessment_id = a.id AND aa.learner_id = ? AND aa.status = 'completed' ORDER BY id DESC LIMIT 1) AS last_attempt_id
            FROM assessments a
            INNER JOIN courses c ON c.id = a.course_id
            INNER JOIN course_assignments ca ON ca.course_id = c.id AND ca.learner_id = ?
            LEFT JOIN users u ON u.id = c.instructor_id
            WHERE a.is_active = 1
            ORDER BY a.id DESC
        ";

        return $this->db->query($sql, [
            (int)$learner_id,
            (int)$learner_id,
            (int)$learner_id,
            (int)$learner_id,
            (int)$learner_id,
            (int)$learner_id,
            (int)$learner_id
        ])->result_array();
    }

    /**
     * Start or resume an assessment attempt for a learner
     */
    public function start_attempt($assessment_id, $learner_id) {
        $assessment = $this->db->get_where('assessments', ['id' => (int)$assessment_id, 'is_active' => 1])->row_array();
        if (!$assessment) {
            return ['status' => false, 'message' => 'Assessment not found or inactive.'];
        }

        // Get learner assignment
        $assignment = $this->db->get_where('course_assignments', [
            'course_id'  => $assessment['course_id'],
            'learner_id' => (int)$learner_id
        ])->row_array();

        if (!$assignment) {
            // Auto-enroll if Admin or Instructor for testing/evaluation
            $user = $this->db->get_where('users', ['id' => (int)$learner_id])->row_array();
            $role_id = (int)($user['role_id'] ?? 3);
            if (in_array($role_id, [1, 2])) {
                $this->load->model('Assignment_model', 'assign_mod');
                $assign_ids = $this->assign_mod->assign_learners($assessment['course_id'], [$learner_id], $learner_id);
                if (!empty($assign_ids)) {
                    $assignment = $this->assign_mod->get_by_id($assign_ids[0]);
                }
            }
        }

        if (!$assignment) {
            return ['status' => false, 'message' => 'You are not enrolled in the course associated with this assessment.'];
        }

        // Only certified courses have certification assessments
        $course = $this->db->get_where('courses', ['id' => $assessment['course_id']])->row_array();
        if ($course && ($course['course_type'] ?? 'certified') !== 'certified') {
            return [
                'status'  => false,
                'message' => 'Access Restricted: This course is a non-certified program and does not have a certification examination.'
            ];
        }

        // Enforce Prerequisite: Course curriculum must be 100% completed (Admin exempted for testing/oversight)
        $user = $this->db->get_where('users', ['id' => (int)$learner_id])->row_array();
        $is_admin = ((int)($user['role_id'] ?? 3) === 1);

        if (!$is_admin && $assignment['status'] !== 'completed' && (float)$assignment['progress_percentage'] < 100.00) {
            return [
                'status'  => false,
                'message' => 'Prerequisite Required: You must complete 100% of the course curriculum before taking the certification exam.'
            ];
        }

        // Check if there is an active in_progress attempt
        $active_attempt = $this->db->get_where('assessment_attempts', [
            'assessment_id' => $assessment['id'],
            'learner_id'    => (int)$learner_id,
            'status'        => 'in_progress'
        ])->row_array();

        if ($active_attempt) {
            // Check if timed out
            $started_ts = strtotime($active_attempt['started_at']);
            $max_duration = ($assessment['time_limit_minutes'] * 60) + 120; // 2 min grace period
            if (time() - $started_ts > $max_duration) {
                // Mark timed out
                $this->db->where('id', $active_attempt['id'])->update('assessment_attempts', [
                    'status'       => 'timed_out',
                    'submitted_at' => date('Y-m-d H:i:s'),
                ]);
            } else {
                // Resume existing active attempt
                $assessment_data = $this->get_assessment_by_id($assessment['id'], true);
                $remaining_seconds = max(0, ($assessment['time_limit_minutes'] * 60) - (time() - $started_ts));
                return [
                    'status'            => true,
                    'resumed'           => true,
                    'attempt_id'        => (int)$active_attempt['id'],
                    'attempt_number'    => (int)$active_attempt['attempt_number'],
                    'started_at'        => $active_attempt['started_at'],
                    'remaining_seconds' => $remaining_seconds,
                    'assessment'        => $assessment_data
                ];
            }
        }

        // Enforce Single Attempt Policy (strictly 1 attempt per certification exam)
        $attempts_taken = $this->db->where('assessment_id', $assessment['id'])
                                  ->where('learner_id', (int)$learner_id)
                                  ->where_in('status', ['completed', 'timed_out'])
                                  ->count_all_results('assessment_attempts');

        if ($attempts_taken >= 1) {
            return [
                'status'  => false,
                'message' => 'Single Attempt Restriction: You have already completed your 1 allowed attempt for this certification examination.'
            ];
        }

        $attempt_number = $attempts_taken + 1;

        // Insert new attempt
        $now = date('Y-m-d H:i:s');
        $this->db->insert('assessment_attempts', [
            'assessment_id'  => $assessment['id'],
            'learner_id'     => (int)$learner_id,
            'assignment_id'  => $assignment['id'],
            'attempt_number' => $attempt_number,
            'started_at'     => $now,
            'status'         => 'in_progress',
            'created_at'     => $now,
        ]);
        $attempt_id = $this->db->insert_id();

        $assessment_data = $this->get_assessment_by_id($assessment['id'], true);

        return [
            'status'            => true,
            'resumed'           => false,
            'attempt_id'        => $attempt_id,
            'attempt_number'    => $attempt_number,
            'started_at'        => $now,
            'remaining_seconds' => $assessment['time_limit_minutes'] * 60,
            'assessment'        => $assessment_data
        ];
    }

    /**
     * Retrieve the active certification assessment details for a specific course and learner
     * @param int $course_id
     * @param int $learner_id
     * @return array|null
     */
    public function get_course_assessment_for_learner($course_id, $learner_id) {
        $assessment = $this->db->get_where('assessments', [
            'course_id' => (int)$course_id,
            'is_active' => 1
        ])->row_array();

        if (!$assessment) return null;

        $assignment = $this->db->get_where('course_assignments', [
            'course_id'  => (int)$course_id,
            'learner_id' => (int)$learner_id
        ])->row_array();

        $course_completed = ($assignment && ($assignment['status'] === 'completed' || (float)$assignment['progress_percentage'] >= 100.00));

        $attempts = $this->db->where('assessment_id', $assessment['id'])
                             ->where('learner_id', (int)$learner_id)
                             ->order_by('id', 'DESC')
                             ->get('assessment_attempts')
                             ->result_array();

        $completed_attempts = array_filter($attempts, function($a) {
            return in_array($a['status'], ['completed', 'timed_out']);
        });

        $active_attempt = null;
        foreach ($attempts as $a) {
            if ($a['status'] === 'in_progress') {
                $active_attempt = $a;
                break;
            }
        }

        $last_attempt = null;
        foreach ($attempts as $a) {
            if ($a['status'] === 'completed') {
                $last_attempt = $a;
                break;
            }
        }
        if (!$last_attempt && !empty($attempts)) {
            $last_attempt = $attempts[0];
        }

        return [
            'id'                 => (int)$assessment['id'],
            'course_id'          => (int)$assessment['course_id'],
            'title'              => $assessment['title'],
            'description'        => $assessment['description'],
            'passing_percentage' => (float)$assessment['passing_percentage'],
            'time_limit_minutes' => (int)$assessment['time_limit_minutes'],
            'max_attempts'       => 1,
            'attempts_taken'     => count($completed_attempts),
            'attempts_remaining' => max(0, 1 - count($completed_attempts)),
            'is_unlocked'        => $course_completed,
            'is_passed'          => !empty(array_filter($attempts, function($a) { return (int)$a['is_passed'] === 1; })),
            'active_attempt_id'  => $active_attempt ? (int)$active_attempt['id'] : null,
            'last_attempt_id'    => $last_attempt ? (int)$last_attempt['id'] : null,
        ];
    }

    /**
     * Submit and auto-grade assessment attempt
     */
    public function submit_attempt($attempt_id, $learner_id, $submitted_answers = []) {
        $attempt = $this->db->get_where('assessment_attempts', [
            'id'         => (int)$attempt_id,
            'learner_id' => (int)$learner_id
        ])->row_array();

        if (!$attempt) {
            return ['status' => false, 'message' => 'Assessment attempt not found.'];
        }

        if ($attempt['status'] !== 'in_progress') {
            return ['status' => false, 'message' => 'This attempt has already been submitted or completed.'];
        }

        $assessment = $this->db->get_where('assessments', ['id' => $attempt['assessment_id']])->row_array();
        if (!$assessment) {
            return ['status' => false, 'message' => 'Parent assessment not found.'];
        }

        // Fetch all questions for this assessment
        $questions = $this->db->where('assessment_id', $assessment['id'])->get('assessment_questions')->result_array();

        // Convert submitted answers into a lookup: [ question_id => selected_option_id ]
        $answers_map = [];
        foreach ($submitted_answers as $ans) {
            if (isset($ans['question_id']) && isset($ans['selected_option_id'])) {
                $answers_map[(int)$ans['question_id']] = (int)$ans['selected_option_id'];
            }
        }

        $total_score = 0.00;
        $max_score = 0.00;
        $now = date('Y-m-d H:i:s');

        // Clean any existing answers for this attempt (idempotent)
        $this->db->where('attempt_id', $attempt['id'])->delete('assessment_answers');

        foreach ($questions as $q) {
            $q_id = (int)$q['id'];
            $marks = (float)$q['marks'];
            $max_score += $marks;

            $selected_option_id = $answers_map[$q_id] ?? null;
            $is_correct = 0;
            $score_awarded = 0.00;

            if ($selected_option_id) {
                // Verify if option is correct
                $correct_opt = $this->db->get_where('assessment_options', [
                    'id'          => $selected_option_id,
                    'question_id' => $q_id,
                    'is_correct'  => 1
                ])->row_array();

                if ($correct_opt) {
                    $is_correct = 1;
                    $score_awarded = $marks;
                    $total_score += $marks;
                }
            }

            // Save answer record
            $this->db->insert('assessment_answers', [
                'attempt_id'         => $attempt['id'],
                'question_id'        => $q_id,
                'selected_option_id' => $selected_option_id,
                'is_correct'         => $is_correct,
                'score_awarded'      => $score_awarded,
                'created_at'         => $now,
            ]);
        }

        $percentage = $max_score > 0 ? round(($total_score / $max_score) * 100, 2) : 0.00;
        $is_passed = ($percentage >= (float)$assessment['passing_percentage']) ? 1 : 0;

        // Update attempt
        $this->db->where('id', $attempt['id'])->update('assessment_attempts', [
            'submitted_at' => $now,
            'total_score'  => $total_score,
            'max_score'    => $max_score,
            'percentage'   => $percentage,
            'status'       => 'completed',
            'is_passed'    => $is_passed,
            'updated_at'   => $now,
        ]);

        return [
            'status'             => true,
            'attempt_id'         => (int)$attempt['id'],
            'total_score'        => $total_score,
            'max_score'          => $max_score,
            'percentage'         => $percentage,
            'passing_percentage' => (float)$assessment['passing_percentage'],
            'is_passed'          => $is_passed === 1,
            'submitted_at'       => $now,
        ];
    }

    /**
     * Get attempt results with full scorecard breakdown
     */
    public function get_attempt_result($attempt_id, $user_id, $role = 'learner') {
        $this->db->select('
            aa.*,
            a.title AS assessment_title,
            a.description AS assessment_description,
            a.passing_percentage,
            a.time_limit_minutes,
            a.max_attempts,
            c.id AS course_id,
            c.title AS course_title,
            CONCAT(u.first_name, " ", u.last_name) AS learner_name,
            u.email AS learner_email,
            u.department AS learner_department
        ');
        $this->db->from('assessment_attempts aa');
        $this->db->join('assessments a', 'a.id = aa.assessment_id');
        $this->db->join('courses c', 'c.id = a.course_id');
        $this->db->join('users u', 'u.id = aa.learner_id');
        $this->db->where('aa.id', (int)$attempt_id);

        if ($role === 'learner') {
            $this->db->where('aa.learner_id', (int)$user_id);
        }

        $attempt = $this->db->get()->row_array();
        if (!$attempt) {
            return null;
        }

        // Fetch question-by-question review
        $this->db->select('
            aq.id AS question_id,
            aq.question_text,
            aq.question_type,
            aq.marks,
            aq.order_index,
            aq.explanation,
            ans.selected_option_id,
            ans.is_correct,
            ans.score_awarded
        ');
        $this->db->from('assessment_questions aq');
        $this->db->join('assessment_answers ans', 'ans.question_id = aq.id AND ans.attempt_id = ' . (int)$attempt['id'], 'left');
        $this->db->where('aq.assessment_id', $attempt['assessment_id']);
        $this->db->order_by('aq.order_index', 'ASC');
        $this->db->order_by('aq.id', 'ASC');
        $questions = $this->db->get()->result_array();

        foreach ($questions as &$q) {
            $this->db->select('id, question_id, option_text, is_correct, order_index');
            $this->db->where('question_id', $q['question_id']);
            $this->db->order_by('order_index', 'ASC');
            $this->db->order_by('id', 'ASC');
            $q['options'] = $this->db->get('assessment_options')->result_array();

            foreach ($q['options'] as &$opt) {
                $opt['is_correct'] = (int)$opt['is_correct'];
            }
        }

        $attempt['questions'] = $questions;
        return $attempt;
    }

    /**
     * Get all attempts for instructor/admin performance review
     */
    public function get_performance_attempts($filters = [], $role = 'admin', $user_id = null) {
        $this->db->select('
            aa.*,
            a.title AS assessment_title,
            a.passing_percentage,
            c.id AS course_id,
            c.title AS course_title,
            CONCAT(u.first_name, " ", u.last_name) AS learner_name,
            u.email AS learner_email,
            u.department AS learner_department
        ');
        $this->db->from('assessment_attempts aa');
        $this->db->join('assessments a', 'a.id = aa.assessment_id');
        $this->db->join('courses c', 'c.id = a.course_id');
        $this->db->join('users u', 'u.id = aa.learner_id');

        if ($role === 'instructor' && $user_id) {
            $this->db->where('c.instructor_id', $user_id);
        }

        if (!empty($filters['course_id'])) {
            $this->db->where('c.id', (int)$filters['course_id']);
        }

        if (!empty($filters['assessment_id'])) {
            $this->db->where('a.id', (int)$filters['assessment_id']);
        }

        if (!empty($filters['status'])) {
            $this->db->where('aa.status', $filters['status']);
        }

        if (isset($filters['is_passed']) && $filters['is_passed'] !== '') {
            $this->db->where('aa.is_passed', (int)$filters['is_passed']);
        }

        if (!empty($filters['search'])) {
            $this->db->group_start();
            $this->db->like('u.first_name', $filters['search']);
            $this->db->or_like('u.last_name', $filters['search']);
            $this->db->or_like('u.email', $filters['search']);
            $this->db->or_like('a.title', $filters['search']);
            $this->db->or_like('c.title', $filters['search']);
            $this->db->group_end();
        }

        $this->db->order_by('aa.id', 'DESC');
        return $this->db->get()->result_array();
    }
}
