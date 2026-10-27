<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Assessments REST API Controller
 * Manages quizzes, question banks, timed test execution, server-side auto-grading, and performance analytics
 */
#[AllowDynamicProperties]
class Assessments extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Assessment_model', 'assessments');
        $this->load->model('Course_model', 'courses');
    }

    /**
     * GET /api/assessments
     * List assessments for instructor/admin
     */
    public function index() {
        $this->require_role(['admin', 'instructor']);

        $role = $this->current_user['role'];
        $user_id = (int)$this->current_user['id'];

        $filters = [
            'course_id' => $this->input->get('course_id', TRUE),
            'is_active' => $this->input->get('is_active', TRUE),
            'search'    => $this->input->get('search', TRUE),
        ];

        $list = $this->assessments->get_assessments($filters, $role, $user_id);
        return $this->json_response($list, 'Assessments retrieved successfully.');
    }

    /**
     * GET /api/assessments/{id}
     * Get assessment details with questions
     */
    public function show($id) {
        $this->require_auth();

        $id = (int)$id;
        $role = $this->current_user['role'];
        $is_learner = ($role === 'learner');

        $assessment = $this->assessments->get_assessment_by_id($id, $is_learner);
        if (!$assessment) {
            return $this->error_response('Assessment not found.', 404);
        }

        // Ownership verification for instructor
        if ($role === 'instructor' && (int)$assessment['instructor_id'] !== (int)$this->current_user['id']) {
            return $this->error_response('Unauthorized access to this assessment.', 403);
        }

        return $this->json_response($assessment, 'Assessment details retrieved successfully.');
    }

    /**
     * POST /api/assessments
     * Create assessment
     */
    public function create() {
        $this->require_role(['admin', 'instructor']);

        $input = $this->get_json_input();
        $course_id = (int)($input['course_id'] ?? 0);
        $title = trim($input['title'] ?? '');

        if ($course_id <= 0 || empty($title)) {
            return $this->error_response('Course ID and assessment title are required.', 422);
        }

        // Check course ownership
        $course = $this->courses->get_by_id($course_id);
        if (!$course) {
            return $this->error_response('Course not found.', 404);
        }

        if ($this->current_user['role'] === 'instructor' && (int)$course['instructor_id'] !== (int)$this->current_user['id']) {
            return $this->error_response('You can only create assessments for your authored courses.', 403);
        }

        $assessment_id = $this->assessments->create_assessment($input);
        $created = $this->assessments->get_assessment_by_id($assessment_id, false);

        return $this->json_response($created, 'Assessment created successfully.', 201);
    }

    /**
     * PUT /api/assessments/{id}
     * Update assessment
     */
    public function update($id) {
        $this->require_role(['admin', 'instructor']);

        $id = (int)$id;
        $assessment = $this->assessments->get_assessment_by_id($id, false);
        if (!$assessment) {
            return $this->error_response('Assessment not found.', 404);
        }

        if ($this->current_user['role'] === 'instructor' && (int)$assessment['instructor_id'] !== (int)$this->current_user['id']) {
            return $this->error_response('Unauthorized modification of this assessment.', 403);
        }

        $input = $this->get_json_input();
        $this->assessments->update_assessment($id, $input);

        $updated = $this->assessments->get_assessment_by_id($id, false);
        return $this->json_response($updated, 'Assessment updated successfully.');
    }

    /**
     * DELETE /api/assessments/{id}
     * Delete assessment
     */
    public function delete($id) {
        $this->require_role(['admin', 'instructor']);

        $id = (int)$id;
        $assessment = $this->assessments->get_assessment_by_id($id, false);
        if (!$assessment) {
            return $this->error_response('Assessment not found.', 404);
        }

        if ($this->current_user['role'] === 'instructor' && (int)$assessment['instructor_id'] !== (int)$this->current_user['id']) {
            return $this->error_response('Unauthorized deletion of this assessment.', 403);
        }

        $this->assessments->delete_assessment($id);
        return $this->json_response(null, 'Assessment deleted successfully.');
    }

    /**
     * POST /api/assessments/{id}/questions
     * Add question to assessment
     */
    public function add_question($assessment_id) {
        $this->require_role(['admin', 'instructor']);

        $assessment_id = (int)$assessment_id;
        $assessment = $this->assessments->get_assessment_by_id($assessment_id, false);
        if (!$assessment) {
            return $this->error_response('Assessment not found.', 404);
        }

        if ($this->current_user['role'] === 'instructor' && (int)$assessment['instructor_id'] !== (int)$this->current_user['id']) {
            return $this->error_response('Unauthorized access to this assessment.', 403);
        }

        $input = $this->get_json_input();
        $question_text = trim($input['question_text'] ?? '');
        $options = $input['options'] ?? [];

        if (empty($question_text)) {
            return $this->error_response('Question text is required.', 422);
        }

        if (empty($options) || !is_array($options) || count($options) < 2) {
            return $this->error_response('At least 2 answer options are required.', 422);
        }

        // Validate at least one correct option
        $has_correct = false;
        foreach ($options as $opt) {
            if (!empty($opt['is_correct'])) {
                $has_correct = true;
                break;
            }
        }
        if (!$has_correct) {
            return $this->error_response('At least one option must be designated as correct.', 422);
        }

        $question_id = $this->assessments->add_question($assessment_id, $input);
        $refreshed = $this->assessments->get_assessment_by_id($assessment_id, false);

        return $this->json_response($refreshed, 'Question added successfully.', 201);
    }

    /**
     * PUT /api/questions/{id}
     * Update question
     */
    public function update_question($id) {
        $this->require_role(['admin', 'instructor']);

        $id = (int)$id;
        $q = $this->db->get_where('assessment_questions', ['id' => $id])->row_array();
        if (!$q) {
            return $this->error_response('Question not found.', 404);
        }

        $assessment = $this->assessments->get_assessment_by_id($q['assessment_id'], false);
        if ($this->current_user['role'] === 'instructor' && (int)$assessment['instructor_id'] !== (int)$this->current_user['id']) {
            return $this->error_response('Unauthorized modification.', 403);
        }

        $input = $this->get_json_input();
        $this->assessments->update_question($id, $input);
        $refreshed = $this->assessments->get_assessment_by_id($q['assessment_id'], false);

        return $this->json_response($refreshed, 'Question updated successfully.');
    }

    /**
     * DELETE /api/questions/{id}
     * Delete question
     */
    public function delete_question($id) {
        $this->require_role(['admin', 'instructor']);

        $id = (int)$id;
        $q = $this->db->get_where('assessment_questions', ['id' => $id])->row_array();
        if (!$q) {
            return $this->error_response('Question not found.', 404);
        }

        $assessment = $this->assessments->get_assessment_by_id($q['assessment_id'], false);
        if ($this->current_user['role'] === 'instructor' && (int)$assessment['instructor_id'] !== (int)$this->current_user['id']) {
            return $this->error_response('Unauthorized deletion.', 403);
        }

        $this->assessments->delete_question($id);
        return $this->json_response(null, 'Question deleted successfully.');
    }

    /**
     * GET /api/my-assessments
     * List assessments for logged-in learner
     */
    public function my_assessments() {
        $this->require_role(['learner', 'instructor', 'admin']);

        $learner_id = (int)$this->current_user['id'];
        $list = $this->assessments->get_learner_assessments($learner_id);

        return $this->json_response($list, 'Learner assessments retrieved successfully.');
    }

    /**
     * POST /api/assessments/{id}/start
     * Start or resume an assessment attempt for trainee
     */
    public function start($id) {
        $this->require_role(['learner', 'instructor', 'admin']);

        $id = (int)$id;
        $learner_id = (int)$this->current_user['id'];

        $result = $this->assessments->start_attempt($id, $learner_id);
        if (!$result['status']) {
            return $this->error_response($result['message'], 400);
        }

        return $this->json_response($result, 'Assessment session initialized successfully.');
    }

    /**
     * POST /api/assessment-attempts/{id}/submit
     * Submit trainee answers for server-side evaluation
     */
    public function submit($attempt_id) {
        $this->require_role(['learner', 'instructor', 'admin']);

        $attempt_id = (int)$attempt_id;
        $learner_id = (int)$this->current_user['id'];
        $input = $this->get_json_input();
        $answers = $input['answers'] ?? [];
        $tab_switch_count = (int)($input['tab_switch_count'] ?? 0);

        $evaluation = $this->assessments->submit_attempt($attempt_id, $learner_id, $answers, $tab_switch_count);
        if (!$evaluation['status']) {
            return $this->error_response($evaluation['message'], 400);
        }

        // Record audit trail and dispatch outcome notification
        $this->load->model('Audit_model', 'audit');
        $this->load->model('Notification_model', 'notifications');

        $this->audit->log(
            $learner_id,
            'EXAM_SUBMITTED',
            'assessment_attempts',
            $attempt_id,
            null,
            ['score' => $evaluation['total_score'], 'percentage' => $evaluation['percentage'], 'passed' => $evaluation['is_passed']]
        );

        $this->notifications->create(
            $learner_id,
            $evaluation['is_passed'] ? 'Assessment Passed' : 'Assessment Attempt Recorded',
            "Your examination attempt was evaluated. Final score: " . $evaluation['percentage'] . "% (" . ($evaluation['is_passed'] ? "Passed" : "Benchmark Not Met") . ").",
            'assessment_result',
            'assessment_attempts',
            $attempt_id
        );

        // Auto-issue official certificate if passed and course completed
        if ($evaluation['is_passed']) {
            $this->load->model('Certificate_model', 'certificates');
            $this->certificates->auto_issue_if_eligible($learner_id, $assessment['course_id']);
        }

        return $this->json_response($evaluation, 'Assessment evaluated successfully.');
    }

    /**
     * GET /api/assessment-attempts/{id}/result
     * Get attempt results with scorecard and answer key review
     */
    public function result($attempt_id) {
        $this->require_auth();

        $attempt_id = (int)$attempt_id;
        $user_id = (int)$this->current_user['id'];
        $role = $this->current_user['role'];

        $result = $this->assessments->get_attempt_result($attempt_id, $user_id, $role);
        if (!$result) {
            return $this->error_response('Assessment attempt result not found.', 404);
        }

        return $this->json_response($result, 'Attempt scorecard retrieved successfully.');
    }

    /**
     * GET /api/trainee-performance
     * List all trainee assessment attempts for Instructor / Admin review
     */
    public function performance() {
        $this->require_role(['admin', 'instructor']);

        $role = $this->current_user['role'];
        $user_id = (int)$this->current_user['id'];

        $filters = [
            'course_id'     => $this->input->get('course_id', TRUE),
            'assessment_id' => $this->input->get('assessment_id', TRUE),
            'status'        => $this->input->get('status', TRUE),
            'is_passed'     => $this->input->get('is_passed', TRUE),
            'search'        => $this->input->get('search', TRUE),
        ];

        $list = $this->assessments->get_performance_attempts($filters, $role, $user_id);
        return $this->json_response($list, 'Trainee performance records retrieved successfully.');
    }

    /**
     * GET /api/courses/{course_id}/assessment
     * Get certification assessment linked to a course for the logged-in learner
     */
    public function course_assessment($course_id = null) {
        $this->require_auth();

        if (!$course_id) {
            return $this->error_response('Course ID is required.', 400);
        }

        $learner_id = (int)$this->current_user['id'];
        $assessment = $this->assessments->get_course_assessment_for_learner((int)$course_id, $learner_id);

        if (!$assessment) {
            return $this->json_response(null, 'No active certification assessment found for this course.');
        }

        return $this->json_response($assessment, 'Course assessment retrieved successfully.');
    }
}
