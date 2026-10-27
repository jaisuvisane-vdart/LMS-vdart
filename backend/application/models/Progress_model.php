<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Progress_model extends CI_Model {

    public function __construct() {
        parent::__construct();
    }

    /**
     * Mark a lesson complete or incomplete for a specific assignment, then re-calculate progress percentage.
     * Enforces sequential progression and 60-second minimum duration upon completion.
     * 
     * @param int $assignment_id
     * @param int $lesson_id
     * @param int $learner_id
     * @param int $is_completed (1 or 0)
     * @param int $time_spent_seconds
     * @return array Progress summary or error array
     */
    public function mark_lesson($assignment_id, $lesson_id, $learner_id, $is_completed = 1, $time_spent_seconds = 0) {
        $now = date('Y-m-d H:i:s');

        $assignment = $this->db->get_where('course_assignments', ['id' => $assignment_id])->row_array();
        if (!$assignment) {
            return ['error' => 'Assignment not found.'];
        }
        $course_id = (int)$assignment['course_id'];

        // Check if progress entry already exists
        $existing = $this->db->get_where('lesson_progress', [
            'assignment_id' => $assignment_id,
            'lesson_id'     => $lesson_id,
        ])->row_array();

        if ($is_completed) {
            // 1. Enforce Sequential Progression: verify all prior lessons in course order are completed
            $this->db->select('l.id, l.title, l.order_index');
            $this->db->from('lessons l');
            $this->db->where('l.course_id', $course_id);
            $this->db->order_by('l.order_index', 'ASC');
            $this->db->order_by('l.id', 'ASC');
            $curriculum = $this->db->get()->result_array();

            $current_idx = -1;
            foreach ($curriculum as $idx => $les) {
                if ((int)$les['id'] === (int)$lesson_id) {
                    $current_idx = $idx;
                    break;
                }
            }

            if ($current_idx > 0) {
                $preceding_ids = [];
                for ($i = 0; $i < $current_idx; $i++) {
                    $preceding_ids[] = (int)$curriculum[$i]['id'];
                }

                if (!empty($preceding_ids)) {
                    $this->db->where('assignment_id', $assignment_id);
                    $this->db->where_in('lesson_id', $preceding_ids);
                    $this->db->where('is_completed', 1);
                    $completed_prior_count = $this->db->count_all_results('lesson_progress');

                    if ($completed_prior_count < count($preceding_ids)) {
                        return [
                            'error' => 'Prerequisite Required: You must complete all prior lessons in sequence before completing this lesson.'
                        ];
                    }
                }
            }

            // 2. Enforce Minimum Duration: 60 seconds minimum
            $accumulated_time = max((int)($existing['time_spent_seconds'] ?? 0), (int)$time_spent_seconds);
            if ($accumulated_time < 60) {
                return [
                    'error' => 'Duration Required: A minimum study time of 60 seconds is required before completing this lesson.'
                ];
            }

            // 3. Enforce Material Viewing: if technical materials exist, ensure they have been reviewed
            $material_count = $this->db->where('lesson_id', $lesson_id)->count_all_results('lesson_materials');
            $material_viewed = (int)($existing['material_viewed'] ?? 0);
            if ($material_count > 0 && !$material_viewed) {
                return [
                    'error' => 'Prerequisite Required: You must view the attached lesson material before completing this lesson.'
                ];
            }
        }

        $recorded_time = max((int)($existing['time_spent_seconds'] ?? 0), (int)$time_spent_seconds);

        if ($existing) {
            $update_data = [
                'is_completed'        => $is_completed,
                'time_spent_seconds'  => $recorded_time,
                'completed_at'        => $is_completed ? $now : null,
                'last_accessed_at'    => $now,
                'updated_at'          => $now,
            ];
            if ($is_completed) {
                $update_data['material_viewed'] = 1;
            }
            $this->db->where('id', $existing['id']);
            $this->db->update('lesson_progress', $update_data);
        } else {
            $this->db->insert('lesson_progress', [
                'assignment_id'       => $assignment_id,
                'lesson_id'           => $lesson_id,
                'learner_id'          => $learner_id,
                'is_completed'        => $is_completed,
                'material_viewed'     => $is_completed ? 1 : 0,
                'time_spent_seconds'  => $recorded_time,
                'completed_at'        => $is_completed ? $now : null,
                'last_accessed_at'    => $now,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);
        }

        // Recalculate Course Assignment Progress
        return $this->recalculate_course_progress($assignment_id);
    }

    /**
     * Increment or update recorded active study time for a lesson
     * @param int $assignment_id
     * @param int $lesson_id
     * @param int $learner_id
     * @param int $seconds
     * @return array
     */
    public function update_time_spent($assignment_id, $lesson_id, $learner_id, $seconds) {
        $now = date('Y-m-d H:i:s');
        $existing = $this->db->get_where('lesson_progress', [
            'assignment_id' => $assignment_id,
            'lesson_id'     => $lesson_id,
        ])->row_array();

        $current_spent = (int)($existing['time_spent_seconds'] ?? 0);
        $new_spent = max($current_spent, (int)$seconds);

        if ($existing) {
            $this->db->where('id', $existing['id']);
            $this->db->update('lesson_progress', [
                'time_spent_seconds' => $new_spent,
                'last_accessed_at'   => $now,
                'updated_at'         => $now,
            ]);
        } else {
            $this->db->insert('lesson_progress', [
                'assignment_id'      => $assignment_id,
                'lesson_id'          => $lesson_id,
                'learner_id'         => $learner_id,
                'is_completed'       => 0,
                'material_viewed'    => 0,
                'time_spent_seconds' => $new_spent,
                'last_accessed_at'   => $now,
                'created_at'         => $now,
                'updated_at'         => $now,
            ]);
        }

        return [
            'lesson_id'          => (int)$lesson_id,
            'time_spent_seconds' => $new_spent,
        ];
    }

    /**
     * Compute total mandatory lessons vs completed mandatory lessons, and update course_assignments
     * @param int $assignment_id
     * @return array
     */
    public function recalculate_course_progress($assignment_id) {
        $assignment = $this->db->get_where('course_assignments', ['id' => $assignment_id])->row_array();
        if (!$assignment) return [];

        $course_id = (int)$assignment['course_id'];

        // Total mandatory lessons in this course
        $this->db->from('lessons l');
        $this->db->where('l.course_id', $course_id);
        $this->db->where('l.is_mandatory', 1);
        $total_mandatory = $this->db->count_all_results();

        // If no mandatory lessons, consider all lessons
        if ($total_mandatory === 0) {
            $this->db->from('lessons l');
            $this->db->where('l.course_id', $course_id);
            $total_mandatory = $this->db->count_all_results();
        }

        // Completed mandatory lessons for this assignment
        $this->db->from('lesson_progress lp');
        $this->db->join('lessons l', 'l.id = lp.lesson_id');
        $this->db->where('lp.assignment_id', $assignment_id);
        $this->db->where('lp.is_completed', 1);
        $this->db->where('l.course_id', $course_id);
        if ($total_mandatory > 0) {
            $this->db->where('l.is_mandatory', 1);
        }
        $completed_count = $this->db->count_all_results();

        $progress_percentage = 0.00;
        if ($total_mandatory > 0) {
            $progress_percentage = round(($completed_count / $total_mandatory) * 100, 2);
            if ($progress_percentage > 100.00) $progress_percentage = 100.00;
        }

        // Determine status
        $status = $assignment['status'];
        $now = date('Y-m-d H:i:s');
        $completed_at = $assignment['completed_at'];

        if ($progress_percentage >= 100.00) {
            $status = 'completed';
            $completed_at = $now;
        } elseif ($progress_percentage > 0.00) {
            $status = 'in_progress';
        }

        // Update assignment record
        $this->db->where('id', $assignment_id);
        $this->db->update('course_assignments', [
            'progress_percentage' => $progress_percentage,
            'status'              => $status,
            'completed_at'        => $completed_at,
            'updated_at'          => $now,
        ]);

        return [
            'assignment_id'       => $assignment_id,
            'course_id'           => $course_id,
            'total_lessons'       => $total_mandatory,
            'completed_lessons'   => $completed_count,
            'progress_percentage' => $progress_percentage,
            'status'              => $status,
            'completed_at'        => $completed_at,
        ];
    }

    /**
     * Record material viewing for a lesson
     * @param int $assignment_id
     * @param int $lesson_id
     * @param int $learner_id
     * @return array
     */
    public function record_material_view($assignment_id, $lesson_id, $learner_id) {
        $now = date('Y-m-d H:i:s');
        $existing = $this->db->get_where('lesson_progress', [
            'assignment_id' => $assignment_id,
            'lesson_id'     => $lesson_id,
        ])->row_array();

        if ($existing) {
            $this->db->where('id', $existing['id']);
            $this->db->update('lesson_progress', [
                'material_viewed'  => 1,
                'last_accessed_at' => $now,
                'updated_at'       => $now,
            ]);
        } else {
            $this->db->insert('lesson_progress', [
                'assignment_id'    => $assignment_id,
                'lesson_id'        => $lesson_id,
                'learner_id'       => $learner_id,
                'is_completed'     => 0,
                'material_viewed'  => 1,
                'time_spent_seconds' => 0,
                'last_accessed_at' => $now,
                'created_at'       => $now,
                'updated_at'       => $now,
            ]);
        }

        return [
            'lesson_id'       => $lesson_id,
            'material_viewed' => 1,
        ];
    }

    /**
     * Compute the next incomplete lesson ID (resumed lesson) for the assignment
     * @param int $course_id
     * @param int $assignment_id
     * @return int|null
     */
    public function get_resumed_lesson_id($course_id, $assignment_id) {
        $this->db->select('l.id');
        $this->db->from('lessons l');
        $this->db->where('l.course_id', (int)$course_id);
        $this->db->order_by('l.order_index', 'ASC');
        $this->db->order_by('l.id', 'ASC');
        $lessons = $this->db->get()->result_array();

        if (empty($lessons)) return null;

        $this->db->select('lesson_id');
        $this->db->where('assignment_id', (int)$assignment_id);
        $this->db->where('is_completed', 1);
        $completed_records = $this->db->get('lesson_progress')->result_array();

        $completed_map = [];
        foreach ($completed_records as $cr) {
            $completed_map[(int)$cr['lesson_id']] = true;
        }

        // Return first incomplete lesson
        foreach ($lessons as $l) {
            $lid = (int)$l['id'];
            if (!isset($completed_map[$lid])) {
                return $lid;
            }
        }

        // If all lessons completed, return the last lesson
        $last = end($lessons);
        return (int)$last['id'];
    }

    /**
     * Return map of lesson completion status and time spent for a given assignment
     * @param int $assignment_id
     * @return array [ lesson_id => [ 'is_completed' => 1, 'time_spent_seconds' => 60, ... ] ]
     */
    public function get_progress_map($assignment_id) {
        $this->db->where('assignment_id', (int)$assignment_id);
        $records = $this->db->get('lesson_progress')->result_array();

        $map = [];
        foreach ($records as $r) {
            $map[(int)$r['lesson_id']] = [
                'is_completed'        => (int)$r['is_completed'],
                'material_viewed'     => (int)($r['material_viewed'] ?? 0),
                'time_spent_seconds'  => (int)($r['time_spent_seconds'] ?? 0),
                'completed_at'        => $r['completed_at'],
                'last_accessed_at'    => $r['last_accessed_at'],
            ];
        }
        return $map;
    }
}
