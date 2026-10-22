<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Quiz Normalizer & Validation Engine
 * Unifies raw extracted questions from XLSX, CSV, DOCX, and PDF into a consistent structure
 * Performs strict validation and provides actionable error details per question
 */
class Quiz_normalizer {

    /**
     * Normalize an array of parsed question candidate blocks
     *
     * @param array $raw_questions Array of raw parsed items
     * @return array [ 'items' => [...], 'summary' => [...] ]
     */
    public function normalize_and_validate(array $raw_questions) {
        $normalized_items = [];
        $total_marks = 0;
        $valid_count = 0;
        $invalid_count = 0;
        $type_breakdown = [
            'multiple_choice' => 0,
            'true_false'      => 0,
        ];

        $seen_questions = [];

        foreach ($raw_questions as $idx => $raw) {
            $item_number = $idx + 1;
            $errors = [];

            // 1. Question Text
            $question_text = trim($raw['question_text'] ?? '');
            if (empty($question_text)) {
                $errors[] = 'Question text cannot be empty.';
            }

            // Duplicate Question Check
            $normalized_key = strtolower(preg_replace('/[^a-z0-9]/', '', $question_text));
            if (!empty($normalized_key)) {
                if (isset($seen_questions[$normalized_key])) {
                    $errors[] = 'Duplicate question detected (matches item #' . $seen_questions[$normalized_key] . ').';
                } else {
                    $seen_questions[$normalized_key] = $item_number;
                }
            }

            // 2. Question Type
            $raw_type = strtolower(trim($raw['question_type'] ?? ''));
            if (in_array($raw_type, ['tf', 'true_false', 'true/false', 'true-false', 'boolean'], true)) {
                $question_type = 'true_false';
            } else {
                $question_type = 'multiple_choice';
            }

            // 3. Marks
            $marks = 1;
            if (isset($raw['marks']) && is_numeric($raw['marks'])) {
                $marks = max(1, min(50, (int)$raw['marks']));
            }

            // 4. Explanation
            $explanation = trim($raw['explanation'] ?? '');

            // 5. Options Normalization
            $raw_options = $raw['options'] ?? [];
            $options = [];
            $correct_keys = [];
            $option_texts_seen = [];

            if ($question_type === 'true_false') {
                // Ensure True and False options exist
                $tf_options = [
                    ['key' => 'A', 'option_text' => 'True', 'is_correct' => 0],
                    ['key' => 'B', 'option_text' => 'False', 'is_correct' => 0],
                ];

                // Detect correct answer
                $raw_ans = strtoupper(trim((string)($raw['correct_answer'] ?? '')));
                if ($raw_ans === 'A' || $raw_ans === 'TRUE' || $raw_ans === 'T' || $raw_ans === '1') {
                    $tf_options[0]['is_correct'] = 1;
                } elseif ($raw_ans === 'B' || $raw_ans === 'FALSE' || $raw_ans === 'F' || $raw_ans === '0') {
                    $tf_options[1]['is_correct'] = 1;
                } else {
                    // Check if specified in option array
                    $found_correct = false;
                    foreach ($raw_options as $o) {
                        if (!empty($o['is_correct'])) {
                            $txt = strtolower(trim($o['option_text'] ?? ''));
                            if (strpos($txt, 'true') !== false) {
                                $tf_options[0]['is_correct'] = 1;
                                $found_correct = true;
                            } elseif (strpos($txt, 'false') !== false) {
                                $tf_options[1]['is_correct'] = 1;
                                $found_correct = true;
                            }
                        }
                    }
                    if (!$found_correct) {
                        $errors[] = 'Correct answer missing or ambiguous for True/False question (expected True or False).';
                    }
                }
                $options = $tf_options;
            } else {
                // Multiple Choice Normalization
                $letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                $opt_idx = 0;

                foreach ($raw_options as $raw_opt) {
                    if (is_string($raw_opt)) {
                        $opt_text = trim($raw_opt);
                        $is_corr = 0;
                        $key = $letters[$opt_idx] ?? chr(65 + $opt_idx);
                    } else {
                        $opt_text = trim($raw_opt['option_text'] ?? '');
                        $is_corr = !empty($raw_opt['is_correct']) ? 1 : 0;
                        $key = strtoupper(trim($raw_opt['key'] ?? ($letters[$opt_idx] ?? chr(65 + $opt_idx))));
                    }

                    if ($opt_text === '') continue;

                    // Check for duplicate options
                    $norm_opt = strtolower($opt_text);
                    if (in_array($norm_opt, $option_texts_seen, true)) {
                        $errors[] = "Duplicate option text detected: '{$opt_text}'.";
                    }
                    $option_texts_seen[] = $norm_opt;

                    $options[] = [
                        'key'         => $key,
                        'option_text' => $opt_text,
                        'is_correct'  => $is_corr,
                    ];
                    if ($is_corr) {
                        $correct_keys[] = $key;
                    }
                    $opt_idx++;
                }

                // If correct answer was specified separately as a key (e.g. 'A', 'B', 'C', 'D')
                $raw_ans = strtoupper(trim((string)($raw['correct_answer'] ?? '')));
                if (!empty($raw_ans) && empty($correct_keys)) {
                    $matched = false;
                    foreach ($options as &$opt_item) {
                        if ($opt_item['key'] === $raw_ans || strtoupper($opt_item['option_text']) === $raw_ans) {
                            $opt_item['is_correct'] = 1;
                            $correct_keys[] = $opt_item['key'];
                            $matched = true;
                            break;
                        }
                    }
                    unset($opt_item);

                    if (!$matched) {
                        $errors[] = "Correct answer '{$raw_ans}' does not match any available option key.";
                    }
                }

                if (count($options) < 2) {
                    $errors[] = 'Multiple choice questions require at least 2 distinct answer options.';
                }

                if (empty($correct_keys)) {
                    $errors[] = 'No correct answer specified for this question.';
                } elseif (count($correct_keys) > 1) {
                    $errors[] = 'Multiple options are marked correct. Single-answer choice is currently required.';
                }
            }

            $is_valid = empty($errors);
            if ($is_valid) {
                $valid_count++;
                $total_marks += $marks;
            } else {
                $invalid_count++;
            }

            if (isset($type_breakdown[$question_type])) {
                $type_breakdown[$question_type]++;
            } else {
                $type_breakdown[$question_type] = 1;
            }

            $normalized_items[] = [
                'item_number'    => $item_number,
                'question_text'  => $question_text,
                'question_type'  => $question_type,
                'marks'          => $marks,
                'explanation'    => $explanation,
                'options'        => $options,
                'is_excluded'    => false,
                'is_valid'       => $is_valid,
                'validation_errors' => $errors,
            ];
        }

        return [
            'items' => $normalized_items,
            'summary' => [
                'total_questions'   => count($normalized_items),
                'valid_questions'   => $valid_count,
                'invalid_questions' => $invalid_count,
                'total_marks'       => $total_marks,
                'type_breakdown'    => $type_breakdown,
            ],
        ];
    }
}
