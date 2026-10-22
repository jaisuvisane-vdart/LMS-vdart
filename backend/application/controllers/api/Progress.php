<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Learning Progress REST API Controller
 * Records lesson completion and recalculates overall course assignment progress
 */
class Progress extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Progress_model', 'progress');
        $this->load->model('Assignment_model', 'assignments');
        $this->load->model('Lesson_model', 'lessons');
    }

    /**
     * POST /api/lessons/{lesson_id}/complete
     * Accepts time_spent_seconds and verifies sequential integrity and duration requirement
     */
    public function complete_lesson($lesson_id = null) {
        $this->require_auth();

        if (!$lesson_id) {
            return $this->error_response('Lesson ID is required.', 400);
        }

        $lesson = $this->lessons->get_by_id((int)$lesson_id);
        if (!$lesson) {
            return $this->error_response('Lesson not found.', 404);
        }

        $learner_id = (int)$this->current_user['id'];
        $course_id = (int)$lesson['course_id'];

        // Find active assignment
        $assignment = $this->assignments->get_by_course_and_learner($course_id, $learner_id);
        if (!$assignment) {
            // Auto-enroll if Admin or Instructor for previewing/testing
            $role = $this->current_user['role'] ?? 'learner';
            if (in_array($role, ['admin', 'instructor'])) {
                $assign_ids = $this->assignments->assign_learners($course_id, [$learner_id], $learner_id);
                $assignment = $this->assignments->get_by_id($assign_ids[0]);
            } else {
                return $this->error_response('You are not currently enrolled in this course.', 403);
            }
        }

        $input = $this->get_json_input();
        $time_spent = isset($input['time_spent_seconds']) ? (int)$input['time_spent_seconds'] : 60;

        $result = $this->progress->mark_lesson($assignment['id'], (int)$lesson_id, $learner_id, 1, $time_spent);
        if (isset($result['error'])) {
            return $this->error_response($result['error'], 422);
        }

        // Check and auto-award certificate if 100% course completion and assessment requirements met
        $this->load->model('Certificate_model', 'certificates');
        $this->certificates->auto_issue_if_eligible($learner_id, $course_id);

        // Include updated next resumed lesson ID in response
        $result['resumed_lesson_id'] = $this->progress->get_resumed_lesson_id($course_id, $assignment['id']);

        return $this->json_response($result, 'Lesson marked as completed.');
    }

    /**
     * POST /api/lessons/{lesson_id}/uncomplete
     */
    public function uncomplete_lesson($lesson_id = null) {
        $this->require_auth();

        if (!$lesson_id) {
            return $this->error_response('Lesson ID is required.', 400);
        }

        $lesson = $this->lessons->get_by_id((int)$lesson_id);
        if (!$lesson) {
            return $this->error_response('Lesson not found.', 404);
        }

        $learner_id = (int)$this->current_user['id'];
        $course_id = (int)$lesson['course_id'];

        $assignment = $this->assignments->get_by_course_and_learner($course_id, $learner_id);
        if (!$assignment) {
            return $this->error_response('No assignment found.', 404);
        }

        $result = $this->progress->mark_lesson($assignment['id'], (int)$lesson_id, $learner_id, 0);
        if (isset($result['error'])) {
            return $this->error_response($result['error'], 422);
        }

        $result['resumed_lesson_id'] = $this->progress->get_resumed_lesson_id($course_id, $assignment['id']);
        return $this->json_response($result, 'Lesson marked as incomplete.');
    }

    /**
     * POST /api/lessons/{lesson_id}/time-spent
     * Records elapsed active study time on the lesson
     */
    public function record_time_spent($lesson_id = null) {
        $this->require_auth();

        if (!$lesson_id) {
            return $this->error_response('Lesson ID is required.', 400);
        }

        $lesson = $this->lessons->get_by_id((int)$lesson_id);
        if (!$lesson) {
            return $this->error_response('Lesson not found.', 404);
        }

        $learner_id = (int)$this->current_user['id'];
        $course_id = (int)$lesson['course_id'];

        $assignment = $this->assignments->get_by_course_and_learner($course_id, $learner_id);
        if (!$assignment) {
            return $this->error_response('No assignment found.', 404);
        }

        $input = $this->get_json_input();
        $seconds = isset($input['time_spent_seconds']) ? (int)$input['time_spent_seconds'] : 0;

        $result = $this->progress->update_time_spent($assignment['id'], (int)$lesson_id, $learner_id, $seconds);
        return $this->json_response($result, 'Lesson study time recorded.');
    }

    /**
     * POST /api/lessons/{lesson_id}/view-material
     * Records that the learner has opened and viewed the technical materials
     */
    public function view_material($lesson_id = null) {
        $this->require_auth();

        if (!$lesson_id) {
            return $this->error_response('Lesson ID is required.', 400);
        }

        $lesson = $this->lessons->get_by_id((int)$lesson_id);
        if (!$lesson) {
            return $this->error_response('Lesson not found.', 404);
        }

        $learner_id = (int)$this->current_user['id'];
        $course_id = (int)$lesson['course_id'];

        // Find active assignment
        $assignment = $this->assignments->get_by_course_and_learner($course_id, $learner_id);
        if (!$assignment) {
            $role = $this->current_user['role'] ?? 'learner';
            if (in_array($role, ['admin', 'instructor'])) {
                $assign_ids = $this->assignments->assign_learners($course_id, [$learner_id], $learner_id);
                $assignment = $this->assignments->get_by_id($assign_ids[0]);
            } else {
                return $this->error_response('You are not currently enrolled in this course.', 403);
            }
        }

        $result = $this->progress->record_material_view($assignment['id'], (int)$lesson_id, $learner_id);
        return $this->json_response($result, 'Lesson material recorded as viewed.');
    }

    /**
     * GET /api/courses/{course_id}/progress
     */
    public function course_progress($course_id = null) {
        $this->require_auth();

        if (!$course_id) {
            return $this->error_response('Course ID is required.', 400);
        }

        $learner_id = (int)$this->current_user['id'];
        $assignment = $this->assignments->get_by_course_and_learner((int)$course_id, $learner_id);

        if (!$assignment) {
            // Auto-enroll if Admin or Instructor for previewing/learning/testing
            $role = $this->current_user['role'] ?? 'learner';
            if (in_array($role, ['admin', 'instructor'])) {
                $assign_ids = $this->assignments->assign_learners((int)$course_id, [$learner_id], $learner_id);
                if (!empty($assign_ids)) {
                    $assignment = $this->assignments->get_by_id($assign_ids[0]);
                }
            }
        }

        if (!$assignment) {
            return $this->json_response([
                'is_enrolled'        => false,
                'progress_map'       => [],
                'assignment'         => null,
                'resumed_lesson_id'  => null,
                'assessment'         => null,
            ], 'Not enrolled in this course.');
        }

        $progress_map = $this->progress->get_progress_map($assignment['id']);
        $resumed_lesson_id = $this->progress->get_resumed_lesson_id((int)$course_id, $assignment['id']);

        $this->load->model('Assessment_model', 'assessments_mod');
        $assessment = $this->assessments_mod->get_course_assessment_for_learner((int)$course_id, $learner_id);

        return $this->json_response([
            'is_enrolled'        => true,
            'assignment'         => $assignment,
            'progress_map'       => $progress_map,
            'resumed_lesson_id'  => $resumed_lesson_id,
            'assessment'         => $assessment,
        ], 'Course progress loaded.');
    }
}
