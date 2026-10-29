<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Assessment Import Model
 * Manages import sessions, preview caches, and transactional persistence into the question bank
 */
class Assessment_import_model extends CI_Model {

    public function __construct() {
        parent::__construct();
        $this->load->model('Assessment_model', 'assessments');
        $this->load->model('Audit_model', 'audit');
    }

    /**
     * Create new import session record
     */
    public function create_session($data) {
        $insert_data = [
            'course_id'         => (int)$data['course_id'],
            'assessment_id'     => !empty($data['assessment_id']) ? (int)$data['assessment_id'] : null,
            'original_filename' => $data['original_filename'],
            'stored_filename'   => $data['stored_filename'],
            'file_format'       => $data['file_format'],
            'file_size_kb'      => $data['file_size_kb'],
            'uploaded_by'       => (int)$data['uploaded_by'],
            'total_questions'   => (int)($data['summary']['total_questions'] ?? 0),
            'valid_questions'   => (int)($data['summary']['valid_questions'] ?? 0),
            'invalid_questions' => (int)($data['summary']['invalid_questions'] ?? 0),
            'session_token'     => $data['session_token'],
            'preview_payload'   => json_encode($data['preview_payload']),
            'import_status'     => 'parsed',
            'created_at'        => date('Y-m-d H:i:s'),
        ];

        $this->db->insert('assessment_imports', $insert_data);
        return $this->db->insert_id();
    }

    /**
     * Retrieve import session by unique token
     */
    public function get_by_token($token) {
        $this->db->where('session_token', $token);
        $row = $this->db->get('assessment_imports')->row_array();
        if ($row && !empty($row['preview_payload'])) {
            $row['preview_payload'] = json_decode($row['preview_payload'], true);
        }
        return $row;
    }

    /**
     * Update an individual question inside a session's preview payload
     */
    public function update_session_question($session_id, array $payload, array $summary) {
        $this->db->where('id', (int)$session_id);
        $this->db->update('assessment_imports', [
            'total_questions'   => (int)$summary['total_questions'],
            'valid_questions'   => (int)$summary['valid_questions'],
            'invalid_questions' => (int)$summary['invalid_questions'],
            'preview_payload'   => json_encode($payload),
        ]);
    }

    /**
     * Execute transactional import confirmation
     * Persists validated questions into assessments, assessment_questions, and assessment_options
     *
     * @param array $session The import session record
     * @param array $config Assessment metadata (title, passing_percentage, time_limit, attempts, etc.)
     * @return int Created or updated assessment ID
     */
    public function confirm_import($session, $config) {
        $this->db->trans_start();

        $course_id = (int)$session['course_id'];
        $assessment_id = !empty($session['assessment_id']) ? (int)$session['assessment_id'] : null;

        if (!$assessment_id) {
            // Create new draft assessment
            $assessment_data = [
                'course_id'          => $course_id,
                'title'              => trim($config['title'] ?? 'Imported Assessment - ' . date('M j, Y')),
                'description'        => trim($config['description'] ?? 'Imported from ' . $session['original_filename']),
                'passing_percentage' => isset($config['passing_percentage']) ? max(1, min(100, (float)$config['passing_percentage'])) : 70.00,
                'time_limit_minutes' => isset($config['time_limit_minutes']) ? max(5, (int)$config['time_limit_minutes']) : 30,
                'max_attempts'       => isset($config['max_attempts']) ? max(1, (int)$config['max_attempts']) : 1,
                'is_active'          => 0, // Remains DRAFT until instructor explicitly publishes
                'created_at'         => date('Y-m-d H:i:s'),
                'updated_at'         => date('Y-m-d H:i:s'),
            ];

            $this->db->insert('assessments', $assessment_data);
            $assessment_id = $this->db->insert_id();
        }

        // Get current max order_index for this assessment's questions
        $this->db->select_max('order_index');
        $this->db->where('assessment_id', $assessment_id);
        $max_row = $this->db->get('assessment_questions')->row_array();
        $start_order = ($max_row && isset($max_row['order_index'])) ? (int)$max_row['order_index'] + 1 : 1;

        $items = $session['preview_payload']['items'] ?? [];
        $imported_count = 0;

        foreach ($items as $item) {
            // Skip excluded questions or invalid questions
            if (!empty($item['is_excluded'])) continue;
            if (empty($item['is_valid'])) continue;

            $q_insert = [
                'assessment_id' => $assessment_id,
                'question_text' => trim($item['question_text']),
                'question_type' => in_array($item['question_type'], ['multiple_choice', 'true_false']) ? $item['question_type'] : 'multiple_choice',
                'marks'         => max(1, (int)$item['marks']),
                'order_index'   => $start_order++,
                'explanation'   => !empty($item['explanation']) ? trim($item['explanation']) : null,
                'created_at'    => date('Y-m-d H:i:s'),
                'updated_at'    => date('Y-m-d H:i:s'),
            ];

            $this->db->insert('assessment_questions', $q_insert);
            $q_id = $this->db->insert_id();

            // Insert options
            if (!empty($item['options']) && is_array($item['options'])) {
                $opt_order = 1;
                foreach ($item['options'] as $opt) {
                    $opt_text = trim($opt['option_text'] ?? '');
                    if ($opt_text === '') continue;

                    $this->db->insert('assessment_options', [
                        'question_id' => $q_id,
                        'option_text' => $opt_text,
                        'is_correct'  => !empty($opt['is_correct']) ? 1 : 0,
                        'order_index' => $opt_order++,
                        'created_at'  => date('Y-m-d H:i:s'),
                        'updated_at'  => date('Y-m-d H:i:s'),
                    ]);
                }
            }

            $imported_count++;
        }

        // Update import session status
        $this->db->where('id', (int)$session['id']);
        $this->db->update('assessment_imports', [
            'assessment_id' => $assessment_id,
            'import_status' => 'confirmed',
            'confirmed_at'  => date('Y-m-d H:i:s'),
        ]);

        // Audit Log Entry
        if (class_exists('Audit_model') || isset($this->audit)) {
            $this->audit->log(
                $session['uploaded_by'],
                'ASSESSMENT_IMPORTED',
                'assessments',
                $assessment_id,
                null,
                [
                    'imported_questions' => $imported_count,
                    'file_name'          => $session['original_filename'],
                    'format'             => $session['file_format'],
                ]
            );
        }

        $this->db->trans_complete();

        if ($this->db->trans_status() === false) {
            throw new Exception('Database transaction failed while saving imported questions.');
        }

        return $assessment_id;
    }

    /**
     * Cancel an import session
     */
    public function cancel_session($session) {
        $this->db->where('id', (int)$session['id']);
        $this->db->update('assessment_imports', [
            'import_status' => 'cancelled',
        ]);

        // Safely delete temporary file if stored locally
        $stored_path = FCPATH . 'uploads/imports/' . $session['stored_filename'];
        if (file_exists($stored_path)) {
            @unlink($stored_path);
        }
    }
}
