<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Lessons REST API Controller
 * Manages granular lessons, reading content, durations, and materials
 */
class Lessons extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Course_model', 'courses');
        $this->load->model('Lesson_model', 'lessons');
    }

    /**
     * GET /api/lessons/{id}
     */
    public function show($id = null) {
        $this->require_auth();

        if (!$id) {
            return $this->error_response('Lesson ID is required.', 400);
        }

        $lesson = $this->lessons->get_by_id((int)$id);
        if (!$lesson) {
            return $this->error_response('Lesson not found.', 404);
        }

        return $this->json_response($lesson, 'Lesson retrieved successfully.');
    }

    /**
     * POST /api/courses/{course_id}/lessons
     * Create a lesson directly under a course
     */
    public function create_for_course($course_id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$course_id) {
            return $this->error_response('Course ID is required.', 400);
        }

        $course = $this->courses->get_by_id((int)$course_id);
        if (!$course) {
            return $this->error_response('Course not found.', 404);
        }

        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$course['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden.', 403);
        }

        $input = $this->get_json_input();
        $title = trim($input['title'] ?? '');

        if (empty($title)) {
            return $this->error_response('Lesson title is required.', 422, ['title' => 'Title is required']);
        }

        $allowed_types = ['text', 'video', 'document', 'quiz', 'presentation', 'word', 'spreadsheet'];
        $lesson_type = strtolower(trim($input['lesson_type'] ?? 'text'));
        $lesson_type = in_array($lesson_type, $allowed_types, true) ? $lesson_type : 'text';
        $lesson_status = in_array($input['status'] ?? '', ['active', 'inactive'], true) ? $input['status'] : 'active';

        $lesson_id = $this->lessons->create([
            'course_id'        => (int)$course_id,
            'title'            => $title,
            'content'          => $input['content'] ?? '',
            'lesson_type'      => $lesson_type,
            'status'           => $lesson_status,
            'duration_minutes' => (int)($input['duration_minutes'] ?? 10),
            'is_mandatory'     => isset($input['is_mandatory']) ? (int)$input['is_mandatory'] : 1,
            'order_index'      => isset($input['order_index']) ? (int)$input['order_index'] : null,
        ]);

        $lesson = $this->lessons->get_by_id($lesson_id);
        return $this->json_response($lesson, 'Lesson created successfully under course.', 201);
    }

    /**
     * GET /api/courses/{course_id}/lessons
     * List all lessons directly under a course
     */
    public function index_for_course($course_id = null) {
        $this->require_auth();

        if (!$course_id) {
            return $this->error_response('Course ID is required.', 400);
        }

        $lessons = $this->lessons->get_by_course((int)$course_id);
        return $this->json_response($lessons, 'Course lessons retrieved successfully.');
    }

    /**
     * POST /api/modules/{module_id}/lessons
     */
    public function create($module_id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$module_id) {
            return $this->error_response('Module ID is required.', 400);
        }

        $module = $this->modules->get_by_id((int)$module_id);
        if (!$module) {
            return $this->error_response('Module not found.', 404);
        }

        $course = $this->courses->get_by_id((int)$module['course_id']);
        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$course['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden.', 403);
        }

        $input = $this->get_json_input();
        $title = trim($input['title'] ?? '');

        if (empty($title)) {
            return $this->error_response('Lesson title is required.', 422, ['title' => 'Title is required']);
        }

        $allowed_types = ['text', 'video', 'document', 'quiz', 'presentation', 'word', 'spreadsheet'];
        $lesson_type = strtolower(trim($input['lesson_type'] ?? 'text'));
        $lesson_type = in_array($lesson_type, $allowed_types, true) ? $lesson_type : 'text';
        $lesson_status = in_array($input['status'] ?? '', ['active', 'inactive'], true) ? $input['status'] : 'active';

        $lesson_id = $this->lessons->create([
            'course_id'        => (int)$module['course_id'],
            'module_id'        => (int)$module_id,
            'title'            => $title,
            'content'          => $input['content'] ?? '',
            'lesson_type'      => $lesson_type,
            'status'           => $lesson_status,
            'duration_minutes' => (int)($input['duration_minutes'] ?? 10),
            'is_mandatory'     => isset($input['is_mandatory']) ? (int)$input['is_mandatory'] : 1,
            'order_index'      => isset($input['order_index']) ? (int)$input['order_index'] : null,
        ]);

        $lesson = $this->lessons->get_by_id($lesson_id);
        return $this->json_response($lesson, 'Lesson created successfully.', 201);
    }

    /**
     * PUT /api/lessons/{id}
     */
    public function update($id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$id) {
            return $this->error_response('Lesson ID is required.', 400);
        }

        $lesson = $this->lessons->get_by_id((int)$id);
        if (!$lesson) {
            return $this->error_response('Lesson not found.', 404);
        }

        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$lesson['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden.', 403);
        }

        $input = $this->get_json_input();
        $update_data = [];
        if (isset($input['title'])) $update_data['title'] = trim($input['title']);
        if (isset($input['content'])) $update_data['content'] = $input['content'];
        if (isset($input['lesson_type'])) {
            $l_type = strtolower(trim($input['lesson_type']));
            $allowed_types = ['text', 'video', 'document', 'quiz', 'presentation', 'word', 'spreadsheet'];
            if (in_array($l_type, $allowed_types, true)) {
                $update_data['lesson_type'] = $l_type;
            }
        }
        if (isset($input['status'])) {
            $status = strtolower(trim($input['status']));
            if (in_array($status, ['active', 'inactive'], true)) {
                $update_data['status'] = $status;
            }
        }
        if (isset($input['duration_minutes'])) $update_data['duration_minutes'] = (int)$input['duration_minutes'];
        if (isset($input['is_mandatory'])) $update_data['is_mandatory'] = (int)$input['is_mandatory'];
        if (isset($input['order_index'])) $update_data['order_index'] = (int)$input['order_index'];

        $this->lessons->update((int)$id, $update_data);
        $updated = $this->lessons->get_by_id((int)$id);

        return $this->json_response($updated, 'Lesson updated successfully.');
    }

    /**
     * DELETE /api/lessons/{id}
     */
    public function delete($id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$id) {
            return $this->error_response('Lesson ID is required.', 400);
        }

        $lesson = $this->lessons->get_by_id((int)$id);
        if (!$lesson) {
            return $this->error_response('Lesson not found.', 404);
        }

        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$lesson['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden.', 403);
        }

        $this->lessons->delete((int)$id);
        return $this->json_response(null, 'Lesson deleted successfully.');
    }
}
