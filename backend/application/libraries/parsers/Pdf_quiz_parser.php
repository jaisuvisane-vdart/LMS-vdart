<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'libraries/parsers/Docx_quiz_parser.php';

/**
 * Text-Based PDF Quiz Parser
 * Decompresses stream objects and extracts text lines from searchable PDF documents
 */
class Pdf_quiz_parser {

    /**
     * Parse text-based PDF file
     *
     * @param string $file_path Absolute path to uploaded .pdf file
     * @return array List of raw question candidates
     */
    public function parse($file_path) {
        if (!file_exists($file_path)) {
            throw new Exception('PDF file not found at specified path.');
        }

        $content = @file_get_contents($file_path);
        if (empty($content)) {
            throw new Exception('Unable to read PDF file content or file is empty.');
        }

        $text = $this->extract_text_from_pdf($content);
        if (empty(trim($text))) {
            throw new Exception('No readable text found in PDF. Note: Scanned/image-only PDFs are not supported (OCR is disabled).');
        }

        // Split text into lines
        $raw_lines = preg_split('/[\r\n]+/', $text);
        $clean_lines = [];
        foreach ($raw_lines as $l) {
            $t = trim($l);
            if ($t !== '') {
                $clean_lines[] = $t;
            }
        }

        $segmenter = new Docx_quiz_parser();
        return $segmenter->segment_text_lines($clean_lines);
    }

    /**
     * Native PDF stream text extractor
     */
    private function extract_text_from_pdf($pdf_data) {
        $extracted_text = '';

        // Match stream ... endstream blocks
        if (preg_match_all('/stream[\r\n]+(.*?)[\r\n]+endstream/s', $pdf_data, $matches)) {
            foreach ($matches[1] as $stream) {
                // Try decompressing with gzuncompress or gzinflate
                $decompressed = @gzuncompress($stream);
                if ($decompressed === false) {
                    $decompressed = @gzinflate($stream);
                }
                if ($decompressed === false) {
                    $decompressed = $stream;
                }

                // Look for text blocks: BT ... ET
                if (preg_match_all('/BT[\s\S]*?ET/', $decompressed, $bt_matches)) {
                    foreach ($bt_matches[0] as $bt) {
                        // Extract text within parentheses: (text) Tj
                        if (preg_match_all('/\((.*?)\)\s*Tj/s', $bt, $tj_matches)) {
                            foreach ($tj_matches[1] as $chunk) {
                                $extracted_text .= $this->clean_pdf_string($chunk) . ' ';
                            }
                        }
                        // Extract text array: [(t1) 10 (t2)] TJ
                        if (preg_match_all('/\[(.*?)\]\s*TJ/s', $bt, $arr_matches)) {
                            foreach ($arr_matches[1] as $arr_chunk) {
                                if (preg_match_all('/\((.*?)\)/s', $arr_chunk, $sub_chunks)) {
                                    foreach ($sub_chunks[1] as $sub) {
                                        $extracted_text .= $this->clean_pdf_string($sub);
                                    }
                                }
                                $extracted_text .= ' ';
                            }
                        }
                        $extracted_text .= "\n";
                    }
                }
            }
        }

        // Fallback: search for direct text objects if streams were uncompressed
        if (empty(trim($extracted_text))) {
            if (preg_match_all('/\((.*?)\)\s*Tj/', $pdf_data, $direct_matches)) {
                foreach ($direct_matches[1] as $direct_str) {
                    $extracted_text .= $this->clean_pdf_string($direct_str) . "\n";
                }
            }
        }

        return $extracted_text;
    }

    private function clean_pdf_string($str) {
        $str = str_replace(['\\(', '\\)', '\\\\'], ['(', ')', '\\'], $str);
        // Replace octal escapes \ooo with characters
        $str = preg_replace_callback('/\\\([0-7]{1,3})/', function($m) {
            return chr(octdec($m[1]));
        }, $str);
        return $str;
    }
}
