<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Courses REST API Controller
 * Provides course catalog browsing, authoring, editing, hierarchy retrieval, and publishing
 */
class Courses extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Course_model', 'courses');
        $this->load->model('Module_model', 'modules');
        $this->load->model('Lesson_model', 'lessons');
    }

    /**
     * GET /api/courses
     */
    public function index() {
        $this->require_auth();

        $role = $this->current_user['role'] ?? 'learner';
        $user_id = (int)$this->current_user['id'];

        $filters = [
            'category'    => $this->input->get('category', TRUE),
            'course_type' => $this->input->get('course_type', TRUE),
            'status'      => $this->input->get('status', TRUE),
            'search'      => $this->input->get('search', TRUE),
            'my_courses'  => $this->input->get('my_courses', TRUE),
        ];

        $courses = $this->courses->get_all($filters, $role, $user_id);
        return $this->json_response($courses, 'Courses fetched successfully.');
    }

    /**
     * GET /api/courses/{id}
     */
    public function show($id = null) {
        $this->require_auth();

        if (!$id) {
            return $this->error_response('Course ID is required.', 400);
        }

        $course = $this->courses->get_full_curriculum((int)$id);
        if (!$course) {
            return $this->error_response('Course not found.', 404);
        }

        // Ownership/Access check for drafts
        $role = $this->current_user['role'] ?? 'learner';
        $user_id = (int)$this->current_user['id'];

        if ($course['status'] === 'draft') {
            if ($role === 'learner') {
                return $this->error_response('Draft courses cannot be accessed by learners.', 403);
            }
            if ($role === 'instructor' && (int)$course['instructor_id'] !== $user_id) {
                return $this->error_response('You do not have permission to view this instructor\'s draft course.', 403);
            }
        }

        return $this->json_response($course, 'Course curriculum loaded successfully.');
    }

    /**
     * POST /api/courses
     */
    public function create() {
        $this->require_role(['admin', 'instructor']);

        $input = $this->get_json_input();
        $title = trim($input['title'] ?? '');
        $category = trim($input['category'] ?? '');
        $course_type = strtolower(trim($input['course_type'] ?? ''));

        if (empty($title) || empty($category) || empty($course_type)) {
            return $this->error_response('Course title, category, and course type are required.', 422, [
                'title'       => empty($title) ? 'Title is required' : null,
                'category'    => empty($category) ? 'Category is required' : null,
                'course_type' => empty($course_type) ? 'Course type is required (certified or non_certified)' : null,
            ]);
        }

        if (!in_array($course_type, ['certified', 'non_certified'], true)) {
            return $this->error_response('Course type must be either certified or non_certified.', 422, [
                'course_type' => 'Invalid course type. Allowed values: certified, non_certified',
            ]);
        }

        $user_id = (int)$this->current_user['id'];
        $role = $this->current_user['role'] ?? 'instructor';

        // Admin can optionally assign a course to another instructor
        $instructor_id = ($role === 'admin' && !empty($input['instructor_id']))
            ? (int)$input['instructor_id']
            : $user_id;

        $insert_data = [
            'instructor_id'              => $instructor_id,
            'title'                      => $title,
            'category'                   => $category,
            'course_type'                => $course_type,
            'description'                => trim($input['description'] ?? ''),
            'thumbnail_url'              => trim($input['thumbnail_url'] ?? ''),
            'status'                     => 'draft',
            'estimated_duration_minutes' => (int)($input['estimated_duration_minutes'] ?? 60),
            'passing_percentage'         => (float)($input['passing_percentage'] ?? 70.00),
        ];

        $course_id = $this->courses->create($insert_data);
        $new_course = $this->courses->get_by_id($course_id);

        return $this->json_response($new_course, 'Course created successfully as draft.', 201);
    }

    /**
     * PUT /api/courses/{id}
     */
    public function update($id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$id) {
            return $this->error_response('Course ID is required.', 400);
        }

        $course = $this->courses->get_by_id((int)$id);
        if (!$course) {
            return $this->error_response('Course not found.', 404);
        }

        // Ownership enforcement for instructors
        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$course['instructor_id'] !== $user_id && !empty($course['instructor_id'])) {
            return $this->error_response('Access forbidden: You can only modify your own courses.', 403);
        }

        $input = $this->get_json_input();
        $update_data = [];

        if (isset($input['title'])) $update_data['title'] = trim($input['title']);
        if (isset($input['category'])) $update_data['category'] = trim($input['category']);
        if (isset($input['course_type'])) {
            $course_type = strtolower(trim($input['course_type']));
            if (in_array($course_type, ['certified', 'non_certified'], true)) {
                $update_data['course_type'] = $course_type;
            }
        }
        if (isset($input['description'])) $update_data['description'] = trim($input['description']);
        if (isset($input['estimated_duration_minutes'])) $update_data['estimated_duration_minutes'] = (int)$input['estimated_duration_minutes'];
        if (isset($input['passing_percentage'])) $update_data['passing_percentage'] = (float)$input['passing_percentage'];

        if (isset($input['status'])) {
            $status = strtolower(trim($input['status']));
            if (in_array($status, ['published', 'draft', 'archived'], true)) {
                $update_data['status'] = $status;
                if ($status === 'published') {
                    $update_data['published_at'] = date('Y-m-d H:i:s');
                } else if ($status === 'draft') {
                    $update_data['published_at'] = null;
                }
            }
        }

        if ($role === 'instructor' && empty($course['instructor_id'])) {
            $update_data['instructor_id'] = $user_id;
        }

        if (!empty($update_data)) {
            $this->courses->update((int)$id, $update_data);
        }
        $updated_course = $this->courses->get_by_id((int)$id);

        return $this->json_response($updated_course, 'Course updated successfully.');
    }

    /**
     * DELETE /api/courses/{id}
     */
    public function delete($id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$id) {
            return $this->error_response('Course ID is required.', 400);
        }

        $course = $this->courses->get_by_id((int)$id);
        if (!$course) {
            return $this->error_response('Course not found.', 404);
        }

        // Ownership enforcement for instructors
        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$course['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden: You can only delete your own courses.', 403);
        }

        $this->courses->delete((int)$id);
        return $this->json_response(null, 'Course and all curriculum components deleted successfully.');
    }

    /**
     * POST /api/courses/{id}/publish
     */
    public function publish($id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$id) {
            return $this->error_response('Course ID is required.', 400);
        }

        $course = $this->courses->get_by_id((int)$id);
        if (!$course) {
            return $this->error_response('Course not found.', 404);
        }

        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor') {
            if ((int)$course['instructor_id'] !== $user_id && !empty($course['instructor_id'])) {
                return $this->error_response('Access forbidden: You can only publish your own courses.', 403);
            }
            if (empty($course['instructor_id'])) {
                $this->courses->update((int)$id, ['instructor_id' => $user_id]);
            }
        }

        $this->courses->publish((int)$id);
        $updated = $this->courses->get_by_id((int)$id);

        return $this->json_response($updated, 'Course published to catalog successfully.');
    }

    /**
     * POST /api/courses/{id}/unpublish
     */
    public function unpublish($id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$id) {
            return $this->error_response('Course ID is required.', 400);
        }

        $course = $this->courses->get_by_id((int)$id);
        if (!$course) {
            return $this->error_response('Course not found.', 404);
        }

        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$course['instructor_id'] !== $user_id && !empty($course['instructor_id'])) {
            return $this->error_response('Access forbidden.', 403);
        }

        $this->courses->unpublish((int)$id);
        $updated = $this->courses->get_by_id((int)$id);

        return $this->json_response($updated, 'Course reverted to draft status.');
    }
}
