<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Modules REST API Controller
 * Manages curriculum chapters/sections within courses
 */
class Modules extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Course_model', 'courses');
        $this->load->model('Module_model', 'modules');
    }

    /**
     * POST /api/courses/{course_id}/modules
     */
    public function create($course_id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$course_id) {
            return $this->error_response('Course ID is required.', 400);
        }

        $course = $this->courses->get_by_id((int)$course_id);
        if (!$course) {
            return $this->error_response('Course not found.', 404);
        }

        // Ownership enforcement
        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$course['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden: You cannot modify another instructor\'s course.', 403);
        }

        $input = $this->get_json_input();
        $title = trim($input['title'] ?? '');

        if (empty($title)) {
            return $this->error_response('Module title is required.', 422, ['title' => 'Title is required']);
        }

        $module_id = $this->modules->create([
            'course_id'   => (int)$course_id,
            'title'       => $title,
            'description' => trim($input['description'] ?? ''),
            'order_index' => isset($input['order_index']) ? (int)$input['order_index'] : null,
        ]);

        $module = $this->modules->get_by_id($module_id);
        return $this->json_response($module, 'Module created successfully.', 201);
    }

    /**
     * PUT /api/modules/{id}
     */
    public function update($id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$id) {
            return $this->error_response('Module ID is required.', 400);
        }

        $module = $this->modules->get_by_id((int)$id);
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
        $update_data = [];
        if (isset($input['title'])) $update_data['title'] = trim($input['title']);
        if (isset($input['description'])) $update_data['description'] = trim($input['description']);
        if (isset($input['order_index'])) $update_data['order_index'] = (int)$input['order_index'];

        $this->modules->update((int)$id, $update_data);
        $updated = $this->modules->get_by_id((int)$id);

        return $this->json_response($updated, 'Module updated successfully.');
    }

    /**
     * DELETE /api/modules/{id}
     */
    public function delete($id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$id) {
            return $this->error_response('Module ID is required.', 400);
        }

        $module = $this->modules->get_by_id((int)$id);
        if (!$module) {
            return $this->error_response('Module not found.', 404);
        }

        $course = $this->courses->get_by_id((int)$module['course_id']);
        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$course['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden.', 403);
        }

        $this->modules->delete((int)$id);
        return $this->json_response(null, 'Module and child lessons deleted successfully.');
    }
}
