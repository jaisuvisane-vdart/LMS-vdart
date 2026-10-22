<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Word (.docx) Quiz Parser
 * Extracts paragraph streams from OpenXML document packages and segments questions, options, answers, and marks
 */
class Docx_quiz_parser {

    /**
     * Parse DOCX document file
     *
     * @param string $file_path Absolute path to uploaded .docx file
     * @return array List of raw question candidates
     */
    public function parse($file_path) {
        if (!file_exists($file_path)) {
            throw new Exception('Word document not found at specified path.');
        }

        $zip = new ZipArchive();
        if ($zip->open($file_path) !== true) {
            throw new Exception('Invalid or corrupted Word (.docx) file.');
        }

        $xml_content = $zip->getFromName('word/document.xml');
        $zip->close();

        if (empty($xml_content)) {
            throw new Exception('No readable document body found in Word archive.');
        }

        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $dom->loadXML($xml_content);
        libxml_clear_errors();

        $xpath = new DOMXPath($dom);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

        $p_nodes = $xpath->query('//w:p');
        $lines = [];

        foreach ($p_nodes as $p) {
            $t_nodes = $xpath->query('.//w:t', $p);
            $p_text = '';
            foreach ($t_nodes as $t) {
                $p_text .= $t->nodeValue;
            }
            $clean = trim(html_entity_decode($p_text, ENT_QUOTES, 'UTF-8'));
            if ($clean !== '') {
                $lines[] = $clean;
            }
        }

        if (empty($lines)) {
            return [];
        }

        return $this->segment_text_lines($lines);
    }

    /**
     * Segment a list of text lines into structured question blocks
     */
    public function segment_text_lines(array $lines) {
        $questions = [];
        $current_q = null;

        // Regular expressions for matching pattern tokens
        // Matches "Q1.", "Question 1:", "1.", "1)"
        $q_start_regex = '/^(?:Q(?:uestion)?\s*(\d+)[\.\:\)]|\b(\d+)[\.\)])\s*(.*)$/i';
        // Matches "A)", "A.", "[A]", "Option A:"
        $opt_regex = '/^(?:(?:Option\s*)?([A-Fa-f])[\.\)\]\:]|\[([A-Fa-f])\])\s*(.*)$/i';
        // Matches "Answer: A", "Correct Answer: B", "Ans: True"
        $ans_regex = '/^(?:Correct\s*)?(?:Answer|Ans)[\s\:\-]+([A-Za-z0-9\/\s]+)$/i';
        // Matches "Marks: 2", "Mark: 1", "Points: 5"
        $marks_regex = '/^(?:Marks?|Points?|Score)[\s\:\-]+(\d+)$/i';
        // Matches "Type: Multiple Choice", "Type: True/False"
        $type_regex = '/^(?:Question\s*)?Type[\s\:\-]+(.*)$/i';
        // Matches "Explanation: ...", "Rationale: ..."
        $exp_regex = '/^(?:Explanation|Rationale|Note)[\s\:\-]+(.*)$/i';

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            // Check if this line starts a new question
            if (preg_match($q_start_regex, $line, $matches)) {
                if ($current_q !== null) {
                    $questions[] = $current_q;
                }
                $q_text = trim($matches[3] ?? '');
                $current_q = [
                    'question_text'  => $q_text,
                    'question_type'  => 'multiple_choice',
                    'marks'          => 1,
                    'explanation'    => '',
                    'correct_answer' => '',
                    'options'        => [],
                ];
                continue;
            }

            if ($current_q === null) {
                // If text appears before any "Q1." prefix, initialize first candidate
                $current_q = [
                    'question_text'  => $line,
                    'question_type'  => 'multiple_choice',
                    'marks'          => 1,
                    'explanation'    => '',
                    'correct_answer' => '',
                    'options'        => [],
                ];
                continue;
            }

            // Check Question Type line
            if (preg_match($type_regex, $line, $matches)) {
                $raw_type = strtolower(trim($matches[1]));
                if (strpos($raw_type, 'true') !== false || strpos($raw_type, 'tf') !== false) {
                    $current_q['question_type'] = 'true_false';
                }
                continue;
            }

            // Check Marks line
            if (preg_match($marks_regex, $line, $matches)) {
                $current_q['marks'] = max(1, (int)$matches[1]);
                continue;
            }

            // Check Answer line
            if (preg_match($ans_regex, $line, $matches)) {
                $ans_val = strtoupper(trim($matches[1]));
                $current_q['correct_answer'] = $ans_val;
                continue;
            }

            // Check Explanation line
            if (preg_match($exp_regex, $line, $matches)) {
                $current_q['explanation'] = trim($matches[1]);
                continue;
            }

            // Check Option line (A, B, C, D)
            if (preg_match($opt_regex, $line, $matches)) {
                $letter = strtoupper(!empty($matches[1]) ? $matches[1] : $matches[2]);
                $opt_text = trim($matches[3] ?? '');
                $current_q['options'][] = [
                    'key'         => $letter,
                    'option_text' => $opt_text,
                    'is_correct'  => 0,
                ];
                continue;
            }

            // If none of the above and no options yet, append to question text
            if (empty($current_q['options'])) {
                $current_q['question_text'] .= ' ' . $line;
            } else {
                // If options already started, might be multi-line explanation or option continuation
                $last_opt_idx = count($current_q['options']) - 1;
                if ($last_opt_idx >= 0 && empty($current_q['correct_answer'])) {
                    $current_q['options'][$last_opt_idx]['option_text'] .= ' ' . $line;
                } elseif (!empty($current_q['explanation'])) {
                    $current_q['explanation'] .= ' ' . $line;
                }
            }
        }

        if ($current_q !== null) {
            $questions[] = $current_q;
        }

        return $questions;
    }
}
