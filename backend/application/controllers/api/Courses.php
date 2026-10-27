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
            'duration_days'              => max(1, (int)($input['duration_days'] ?? 30)),
            'certificate_template'       => in_array($input['certificate_template'] ?? '', ['classic', 'modern', 'gold', 'crest']) ? $input['certificate_template'] : 'classic',
            'passing_percentage'         => (float)($input['passing_percentage'] ?? 70.00),
        ];

        $course_id = $this->courses->create($insert_data);

        // Process embedded lessons if provided during unified creation
        if (!empty($input['lessons']) && is_array($input['lessons'])) {
            $allowed_types = ['text', 'video', 'document', 'quiz', 'presentation', 'word', 'spreadsheet'];
            foreach ($input['lessons'] as $idx => $les) {
                $l_title = trim($les['title'] ?? '');
                if (empty($l_title)) continue;
                $lesson_type = strtolower(trim($les['lesson_type'] ?? 'text'));
                $lesson_type = in_array($lesson_type, $allowed_types, true) ? $lesson_type : 'text';
                $lesson_status = in_array($les['status'] ?? '', ['active', 'inactive'], true) ? $les['status'] : 'active';
                $this->lessons->create([
                    'course_id'        => $course_id,
                    'title'            => $l_title,
                    'content'          => $les['content'] ?? '',
                    'lesson_type'      => $lesson_type,
                    'status'           => $lesson_status,
                    'duration_minutes' => (int)($les['duration_minutes'] ?? 15),
                    'is_mandatory'     => isset($les['is_mandatory']) ? (int)$les['is_mandatory'] : 1,
                    'order_index'      => isset($les['order_index']) ? (int)$les['order_index'] : ($idx + 1),
                ]);
            }
        }

        // Process embedded certification quiz/assessment if certified course
        if ($course_type === 'certified' && !empty($input['assessment']) && is_array($input['assessment'])) {
            $this->load->model('Assessment_model', 'assessments');
            $ass_data = $input['assessment'];
            $ass_id = $this->assessments->create_assessment([
                'course_id'             => $course_id,
                'title'                 => !empty($ass_data['title']) ? trim($ass_data['title']) : $title . ' - Certification Examination',
                'description'           => $ass_data['description'] ?? 'Official certification assessment validating competency for ' . $title,
                'passing_percentage'    => isset($ass_data['passing_percentage']) ? (float)$ass_data['passing_percentage'] : (float)($input['passing_percentage'] ?? 70.00),
                'time_limit_minutes'    => isset($ass_data['time_limit_minutes']) ? (int)$ass_data['time_limit_minutes'] : 30,
                'max_attempts'          => isset($ass_data['max_attempts']) ? (int)$ass_data['max_attempts'] : 1,
                'is_active'             => 1,
                'show_score_to_learner' => isset($ass_data['show_score_to_learner']) ? (int)$ass_data['show_score_to_learner'] : 1,
            ]);

            if (!empty($ass_data['questions']) && is_array($ass_data['questions'])) {
                foreach ($ass_data['questions'] as $q_idx => $q) {
                    if (empty(trim($q['question_text'] ?? ''))) continue;
                    $this->assessments->add_question($ass_id, [
                        'question_text' => trim($q['question_text']),
                        'question_type' => in_array($q['question_type'] ?? '', ['multiple_choice', 'true_false']) ? $q['question_type'] : 'multiple_choice',
                        'marks'         => max(1, (int)($q['marks'] ?? 1)),
                        'order_index'   => $q_idx + 1,
                        'explanation'   => $q['explanation'] ?? null,
                        'options'       => $q['options'] ?? [],
                    ]);
                }
            }
        }

        $new_course = $this->courses->get_full_curriculum($course_id);

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
        if (isset($input['duration_days'])) $update_data['duration_days'] = max(1, (int)$input['duration_days']);
        if (isset($input['certificate_template']) && in_array($input['certificate_template'], ['classic', 'modern', 'gold', 'crest'], true)) {
            $update_data['certificate_template'] = $input['certificate_template'];
        }
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

        $course_id = (int)$id;

        // Process embedded lessons synchronization if provided
        if (isset($input['lessons']) && is_array($input['lessons'])) {
            $allowed_types = ['text', 'video', 'document', 'quiz', 'presentation', 'word', 'spreadsheet'];
            $existing_lessons = $this->db->get_where('lessons', ['course_id' => $course_id])->result_array();
            $existing_lesson_ids = array_column($existing_lessons, 'id');
            $updated_lesson_ids = [];

            foreach ($input['lessons'] as $idx => $les) {
                $l_title = trim($les['title'] ?? '');
                if (empty($l_title)) continue;

                $lesson_type = strtolower(trim($les['lesson_type'] ?? 'text'));
                $lesson_type = in_array($lesson_type, $allowed_types, true) ? $lesson_type : 'text';
                $lesson_status = in_array($les['status'] ?? '', ['active', 'inactive'], true) ? $les['status'] : 'active';
                $les_id = isset($les['id']) && is_numeric($les['id']) && in_array((int)$les['id'], $existing_lesson_ids) ? (int)$les['id'] : null;

                $les_data = [
                    'course_id'        => $course_id,
                    'title'            => $l_title,
                    'content'          => $les['content'] ?? '',
                    'lesson_type'      => $lesson_type,
                    'status'           => $lesson_status,
                    'duration_minutes' => (int)($les['duration_minutes'] ?? 15),
                    'is_mandatory'     => isset($les['is_mandatory']) ? (int)$les['is_mandatory'] : 1,
                    'order_index'      => isset($les['order_index']) ? (int)$les['order_index'] : ($idx + 1),
                ];

                if ($les_id) {
                    $this->lessons->update($les_id, $les_data);
                    $updated_lesson_ids[] = $les_id;
                } else {
                    $new_id = $this->lessons->create($les_data);
                    $updated_lesson_ids[] = $new_id;
                }
            }

            // Remove lessons deleted in UI
            foreach ($existing_lesson_ids as $ex_id) {
                if (!in_array($ex_id, $updated_lesson_ids)) {
                    $this->lessons->delete($ex_id);
                }
            }
        }

        // Process embedded certification assessment if certified course
        $effective_type = $update_data['course_type'] ?? $course['course_type'];
        if ($effective_type === 'certified' && isset($input['assessment']) && is_array($input['assessment'])) {
            $this->load->model('Assessment_model', 'assessments');
            $ass_data = $input['assessment'];
            $existing_ass = $this->db->get_where('assessments', ['course_id' => $course_id, 'is_active' => 1])->row_array();

            $ass_payload = [
                'course_id'             => $course_id,
                'title'                 => !empty($ass_data['title']) ? trim($ass_data['title']) : ($update_data['title'] ?? $course['title']) . ' - Certification Examination',
                'description'           => $ass_data['description'] ?? 'Official certification assessment validating competency for ' . ($update_data['title'] ?? $course['title']),
                'passing_percentage'    => isset($ass_data['passing_percentage']) ? (float)$ass_data['passing_percentage'] : (float)($update_data['passing_percentage'] ?? $course['passing_percentage'] ?? 70.00),
                'time_limit_minutes'    => isset($ass_data['time_limit_minutes']) ? (int)$ass_data['time_limit_minutes'] : 30,
                'max_attempts'          => isset($ass_data['max_attempts']) ? (int)$ass_data['max_attempts'] : 1,
                'is_active'             => 1,
                'show_score_to_learner' => isset($ass_data['show_score_to_learner']) ? (int)$ass_data['show_score_to_learner'] : 1,
            ];

            if ($existing_ass) {
                $ass_id = (int)$existing_ass['id'];
                $this->assessments->update_assessment($ass_id, $ass_payload);
            } else {
                $ass_id = $this->assessments->create_assessment($ass_payload);
            }

            // Sync questions and options
            if (isset($ass_data['questions']) && is_array($ass_data['questions'])) {
                $this->db->where('assessment_id', $ass_id)->delete('assessment_questions');

                foreach ($ass_data['questions'] as $q_idx => $q) {
                    if (empty(trim($q['question_text'] ?? ''))) continue;
                    $this->assessments->add_question($ass_id, [
                        'question_text' => trim($q['question_text']),
                        'question_type' => in_array($q['question_type'] ?? '', ['multiple_choice', 'true_false']) ? $q['question_type'] : 'multiple_choice',
                        'marks'         => max(1, (int)($q['marks'] ?? 1)),
                        'order_index'   => $q_idx + 1,
                        'explanation'   => $q['explanation'] ?? null,
                        'options'       => $q['options'] ?? [],
                    ]);
                }
            }
        } elseif ($effective_type === 'non_certified') {
            $this->db->where('course_id', $course_id)->update('assessments', ['is_active' => 0]);
        }

        $updated_course = $this->courses->get_full_curriculum((int)$id);

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
