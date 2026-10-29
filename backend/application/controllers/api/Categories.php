<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Categories REST API Controller
 * Provides course categories listing, creation from dropdown or standalone manager, and deletion
 */
class Categories extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->database();
        $this->ensure_table_exists();
    }

    /**
     * Ensure course_categories table exists and contains defaults
     */
    private function ensure_table_exists() {
        $this->db->query("
            CREATE TABLE IF NOT EXISTS course_categories (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_category_name (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        $count = $this->db->count_all('course_categories');
        if ($count === 0) {
            $defaults = [
                'Fresher Training Program',
                'Lateral Training Program',
                'Continuous Learning Program',
                'Refresher Training Program',
                'ISMS',
                'EHS',
                'Assessment – Fresher',
                'Assessment – Lateral',
                'Assessment – Sourcing',
                'CEIPAL',
                'LinkedIn',
                'Communication',
                'Soft Skill',
                'Leadership',
                'Marketing'
            ];
            foreach ($defaults as $cat) {
                $this->db->query("INSERT IGNORE INTO course_categories (name) VALUES (?)", [$cat]);
            }
        }
    }

    /**
     * GET /api/categories
     */
    public function index() {
        $this->require_auth();

        $query = $this->db->order_by('id', 'ASC')->get('course_categories');
        $categories = $query->result_array();

        return $this->json_response([
            'categories' => $categories
        ], 'Categories retrieved successfully.');
    }

    /**
     * POST /api/categories
     */
    public function create() {
        $this->require_role(['admin', 'instructor']);

        $input = $this->get_json_input();
        $name = trim($input['name'] ?? '');

        if (empty($name)) {
            return $this->error_response('Category name is required.', 422);
        }

        if (mb_strlen($name) > 100) {
            return $this->error_response('Category name must not exceed 100 characters.', 422);
        }

        // Check for duplicate
        $existing = $this->db->where('LOWER(name)', strtolower($name))->get('course_categories')->row_array();
        if ($existing) {
            return $this->json_response([
                'category' => $existing
            ], 'Category already exists.');
        }

        $this->db->insert('course_categories', ['name' => $name]);
        $new_id = $this->db->insert_id();

        $new_cat = $this->db->where('id', $new_id)->get('course_categories')->row_array();

        if (isset($this->audit)) {
            $this->audit->log(
                $this->current_user['id'],
                'CREATE_CATEGORY',
                "Created course category: {$name}",
                ['category_id' => $new_id, 'name' => $name]
            );
        }

        return $this->json_response([
            'category' => $new_cat
        ], 'Category created successfully.', 201);
    }

    /**
     * DELETE /api/categories/:id
     */
    public function delete($id) {
        $this->require_role(['admin']);
        $id = (int)$id;

        $category = $this->db->where('id', $id)->get('course_categories')->row_array();
        if (!$category) {
            return $this->error_response('Category not found.', 444);
        }

        // Check if any courses currently use this category
        $courses_count = $this->db->where('category', $category['name'])->count_all_results('courses');
        if ($courses_count > 0) {
            return $this->error_response("Cannot delete category '{$category['name']}' as it is currently assigned to {$courses_count} course(s).", 400);
        }

        $this->db->where('id', $id)->delete('course_categories');

        if (isset($this->audit)) {
            $this->audit->log(
                $this->current_user['id'],
                'DELETE_CATEGORY',
                "Deleted course category: {$category['name']}",
                ['category_id' => $id, 'name' => $category['name']]
            );
        }

        return $this->json_response(null, 'Category deleted successfully.');
    }
}
