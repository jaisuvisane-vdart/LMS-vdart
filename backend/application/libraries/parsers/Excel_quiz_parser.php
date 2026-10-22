<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Excel (.xlsx) Quiz Parser
 * High-speed native OpenXML workbook parser utilizing ZipArchive and DOMXML
 * Handles shared strings, inline text, numerical values, and column mapping
 */
class Excel_quiz_parser {

    /**
     * Parse XLSX workbook file
     *
     * @param string $file_path Absolute path to uploaded .xlsx file
     * @return array List of raw question candidates
     */
    public function parse($file_path) {
        if (!file_exists($file_path)) {
            throw new Exception('Excel workbook not found at specified path.');
        }

        $zip = new ZipArchive();
        if ($zip->open($file_path) !== true) {
            throw new Exception('Invalid or corrupted Excel file (unable to unpack OpenXML archive).');
        }

        // 1. Parse Shared Strings table
        $shared_strings = [];
        $ss_xml = $zip->getFromName('xl/sharedStrings.xml');
        if (!empty($ss_xml)) {
            libxml_use_internal_errors(true);
            $dom_ss = new DOMDocument();
            $dom_ss->loadXML($ss_xml);
            libxml_clear_errors();

            $si_nodes = $dom_ss->getElementsByTagName('si');
            foreach ($si_nodes as $si) {
                $t_nodes = $si->getElementsByTagName('t');
                $val = '';
                foreach ($t_nodes as $t) {
                    $val .= $t->nodeValue;
                }
                $shared_strings[] = trim($val);
            }
        }

        // 2. Parse First Sheet
        $sheet_xml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if (empty($sheet_xml)) {
            // Try fallback sheet name
            $sheet_xml = $zip->getFromName('xl/worksheets/sheet.xml');
        }

        $zip->close();

        if (empty($sheet_xml)) {
            throw new Exception('Unable to locate worksheet data in Excel workbook.');
        }

        libxml_use_internal_errors(true);
        $dom_sheet = new DOMDocument();
        $dom_sheet->loadXML($sheet_xml);
        libxml_clear_errors();

        $row_nodes = $dom_sheet->getElementsByTagName('row');
        if ($row_nodes->length === 0) {
            return [];
        }

        $all_rows = [];
        foreach ($row_nodes as $r_node) {
            $c_nodes = $r_node->getElementsByTagName('c');
            $row_data = [];

            foreach ($c_nodes as $c_node) {
                $cell_ref = $c_node->getAttribute('r'); // e.g. 'A1', 'B2'
                $col_letter = preg_replace('/[0-9]/', '', $cell_ref);
                $col_idx = $this->column_letter_to_index($col_letter);

                $t_attr = $c_node->getAttribute('t');
                $v_nodes = $c_node->getElementsByTagName('v');
                $cell_val = '';

                if ($v_nodes->length > 0) {
                    $raw_val = $v_nodes->item(0)->nodeValue;
                    if ($t_attr === 's' && isset($shared_strings[(int)$raw_val])) {
                        $cell_val = $shared_strings[(int)$raw_val];
                    } else {
                        $cell_val = $raw_val;
                    }
                } else {
                    $is_nodes = $c_node->getElementsByTagName('is');
                    if ($is_nodes->length > 0) {
                        $t_nodes = $is_nodes->item(0)->getElementsByTagName('t');
                        $val = '';
                        foreach ($t_nodes as $t) {
                            $val .= $t->nodeValue;
                        }
                        $cell_val = $val;
                    }
                }

                $row_data[$col_idx] = html_entity_decode(trim($cell_val), ENT_QUOTES, 'UTF-8');
            }

            if (!empty(array_filter($row_data))) {
                // Fill any missing indices with empty strings
                $max_idx = !empty($row_data) ? max(array_keys($row_data)) : 0;
                $normalized_row = [];
                for ($i = 0; $i <= $max_idx; $i++) {
                    $normalized_row[$i] = $row_data[$i] ?? '';
                }
                $all_rows[] = $normalized_row;
            }
        }

        if (empty($all_rows)) {
            return [];
        }

        // Process rows: Row 0 is header
        $header_map = [];
        foreach ($all_rows[0] as $col_idx => $header_name) {
            $norm = strtolower(preg_replace('/[^a-z0-9]/', '', $header_name));
            $header_map[$norm] = $col_idx;
        }

        $raw_questions = [];
        $data_rows = array_slice($all_rows, 1);

        foreach ($data_rows as $clean_row) {
            if (empty(array_filter($clean_row))) continue;

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

            $options = [];
            if ($optA !== '') $options[] = ['key' => 'A', 'option_text' => $optA, 'is_correct' => 0];
            if ($optB !== '') $options[] = ['key' => 'B', 'option_text' => $optB, 'is_correct' => 0];
            if ($optC !== '') $options[] = ['key' => 'C', 'option_text' => $optC, 'is_correct' => 0];
            if ($optD !== '') $options[] = ['key' => 'D', 'option_text' => $optD, 'is_correct' => 0];
            if ($optE !== '') $options[] = ['key' => 'E', 'option_text' => $optE, 'is_correct' => 0];
            if ($optF !== '') $options[] = ['key' => 'F', 'option_text' => $optF, 'is_correct' => 0];

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

        return $raw_questions;
    }

    /**
     * Convert Excel column letter (A, B, ... Z, AA, AB) to zero-based integer index
     */
    private function column_letter_to_index($letter) {
        $letter = strtoupper(trim($letter));
        $len = strlen($letter);
        $index = 0;
        for ($i = 0; $i < $len; $i++) {
            $index = $index * 26 + (ord($letter[$i]) - 64);
        }
        return max(0, $index - 1);
    }
}
