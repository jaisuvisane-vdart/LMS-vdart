<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * CSV Quiz Parser
 * Parses delimited spreadsheet files into raw candidate quiz questions
 */
class Csv_quiz_parser {

    /**
     * Parse CSV file
     *
     * @param string $file_path Absolute path to uploaded CSV
     * @return array List of raw question candidates
     */
    public function parse($file_path) {
        if (!file_exists($file_path)) {
            throw new Exception('File not found at specified path.');
        }

        $handle = @fopen($file_path, 'r');
        if ($handle === false) {
            throw new Exception('Unable to open CSV file for reading.');
        }

        // Detect delimiter: test first line
        $first_line = fgets($handle);
        rewind($handle);

        $delimiter = ',';
        if (strpos($first_line, "\t") !== false && substr_count($first_line, "\t") > substr_count($first_line, ',')) {
            $delimiter = "\t";
        } elseif (strpos($first_line, ';') !== false && substr_count($first_line, ';') > substr_count($first_line, ',')) {
            $delimiter = ';';
        }

        $raw_questions = [];
        $header_map = [];
        $row_index = 0;

        while (($row = fgetcsv($handle, 8192, $delimiter)) !== false) {
            $clean_row = array_map(function($v) {
                // Strip UTF-8 BOM if present
                $bom = pack('H*','EFBBBF');
                $val = preg_replace("/^$bom/", '', trim($v ?? ''));
                return html_entity_decode($val, ENT_QUOTES, 'UTF-8');
            }, $row);

            // Skip empty rows
            if (empty(array_filter($clean_row))) {
                continue;
            }

            if ($row_index === 0) {
                // Parse headers
                foreach ($clean_row as $col_idx => $header_name) {
                    $norm = strtolower(preg_replace('/[^a-z0-9]/', '', $header_name));
                    $header_map[$norm] = $col_idx;
                }
                $row_index++;
                continue;
            }

            $row_index++;

            // Extract fields based on header map or fallback position
            $get_col = function($keys, $fallback_idx = null) use ($header_map, $clean_row) {
                foreach ((array)$keys as $k) {
                    if (isset($header_map[$k]) && isset($clean_row[$header_map[$k]])) {
                        return trim($clean_row[$header_map[$k]]);
                    }
                }
                if ($fallback_idx !== null && isset($clean_row[$fallback_idx])) {
                    return trim($clean_row[$fallback_idx]);
                }
                return '';
            };

            $question_text = $get_col(['question', 'questiontext', 'q', 'item'], 0);
            $question_type = $get_col(['questiontype', 'type', 'qtype'], 1);

            $optA = $get_col(['optiona', 'opta', 'a', 'choicea', 'option1'], 2);
            $optB = $get_col(['optionb', 'optb', 'b', 'choiceb', 'option2'], 3);
            $optC = $get_col(['optionc', 'optc', 'c', 'choicec', 'option3'], 4);
            $optD = $get_col(['optiond', 'optd', 'd', 'choiced', 'option4'], 5);
            $optE = $get_col(['optione', 'opte', 'e', 'choicee', 'option5'], 6);
            $optF = $get_col(['optionf', 'optf', 'f', 'choicef', 'option6'], 7);

            $correct_answer = $get_col(['correctanswer', 'correct', 'answer', 'ans', 'key'], 6);
            $marks          = $get_col(['marks', 'mark', 'score', 'points'], 7);
            $explanation    = $get_col(['explanation', 'rationale', 'reason', 'notes'], 8);

            // Build options list
            $options = [];
            if ($optA !== '') $options[] = ['key' => 'A', 'option_text' => $optA, 'is_correct' => 0];
            if ($optB !== '') $options[] = ['key' => 'B', 'option_text' => $optB, 'is_correct' => 0];
            if ($optC !== '') $options[] = ['key' => 'C', 'option_text' => $optC, 'is_correct' => 0];
            if ($optD !== '') $options[] = ['key' => 'D', 'option_text' => $optD, 'is_correct' => 0];
            if ($optE !== '') $options[] = ['key' => 'E', 'option_text' => $optE, 'is_correct' => 0];
            if ($optF !== '') $options[] = ['key' => 'F', 'option_text' => $optF, 'is_correct' => 0];

            // If question type was not specified, infer from options
            if (empty($question_type)) {
                if (count($options) === 2 && 
                    ((strtolower($optA) === 'true' && strtolower($optB) === 'false') || 
                     (strtolower($optA) === 'false' && strtolower($optB) === 'true'))) {
                    $question_type = 'true_false';
                } else {
                    $question_type = 'multiple_choice';
                }
            }

            $raw_questions[] = [
                'question_text'  => $question_text,
                'question_type'  => $question_type,
                'marks'          => !empty($marks) ? (int)$marks : 1,
                'explanation'    => $explanation,
                'correct_answer' => $correct_answer,
                'options'        => $options,
            ];
        }

        fclose($handle);
        return $raw_questions;
    }
}
