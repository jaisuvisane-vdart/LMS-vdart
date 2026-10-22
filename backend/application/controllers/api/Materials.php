<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';

/**
 * Materials REST API Controller
 * Secure file upload, metadata tracking, and authorized file streaming
 */
class Materials extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Lesson_model', 'lessons');
        $this->load->model('Material_model', 'materials');
    }

    /**
     * POST /api/lessons/{lesson_id}/materials
     * Accepts multipart/form-data upload with strictly enforced file format and size limits:
     * - Documents (PPT, PDF, Word, Excel): Max 200MB (204,800 KB)
     * - Video (MP4, WEBM, MKV, AVI, MOV): Max 300MB (307,200 KB)
     */
    public function upload($lesson_id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$lesson_id) {
            return $this->error_response('Lesson ID is required.', 400);
        }

        $lesson = $this->lessons->get_by_id((int)$lesson_id);
        if (!$lesson) {
            return $this->error_response('Lesson not found.', 404);
        }

        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$lesson['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden: You cannot upload materials to another instructor\'s lesson.', 403);
        }

        // Check if server post_max_size was exceeded (PHP empties $_POST and $_FILES)
        if (empty($_FILES) && empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > 0) {
            return $this->error_response('The uploaded payload exceeds the server limit (360MB). Please select a file within the allowed size limit.', 422);
        }

        $upload_dir = FCPATH . 'uploads/materials/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        // Check if file is uploaded under 'file', 'material_file', or any key in $_FILES
        $file_key = null;
        if (!empty($_FILES['file']['name'])) {
            $file_key = 'file';
        } elseif (!empty($_FILES['material_file']['name'])) {
            $file_key = 'material_file';
        } else {
            foreach ($_FILES as $k => $f) {
                if (!empty($f['name'])) {
                    $file_key = $k;
                    break;
                }
            }
        }

        if ($file_key === null) {
            return $this->error_response('No file selected for upload. Please select a valid document or video file.', 400);
        }

        // Verify PHP upload error status
        if (isset($_FILES[$file_key]['error']) && $_FILES[$file_key]['error'] !== UPLOAD_ERR_OK) {
            $err_code = $_FILES[$file_key]['error'];
            if ($err_code === UPLOAD_ERR_INI_SIZE || $err_code === UPLOAD_ERR_FORM_SIZE) {
                return $this->error_response('The uploaded file exceeds the maximum allowed server limit.', 422);
            }
            if ($err_code === UPLOAD_ERR_NO_FILE) {
                return $this->error_response('No file was received. Please select a file to upload.', 400);
            }
            return $this->error_response('File upload failed with error code: ' . $err_code, 422);
        }

        $original_name = $_FILES[$file_key]['name'];
        $ext = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));

        // Define allowed categories and size limits
        $video_extensions = ['mp4', 'webm', 'mkv', 'avi', 'mov'];
        $doc_extensions   = ['ppt', 'pptx', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'];

        if (in_array($ext, $video_extensions, true)) {
            $file_category = 'video';
            $max_size_kb = 307200; // 300 MB
        } elseif (in_array($ext, $doc_extensions, true)) {
            $file_category = 'document';
            $max_size_kb = 204800; // 200 MB
        } else {
            return $this->error_response('Invalid file format. Allowed types: PPT (ppt, pptx), PDF (pdf), Word (doc, docx), Excel (xls, xlsx, csv), and Video (mp4, webm, mkv, avi, mov).', 422);
        }

        // Validate byte size against categorized limit
        $file_size_bytes = (int)($_FILES[$file_key]['size'] ?? 0);
        if ($file_size_bytes > ($max_size_kb * 1024)) {
            $limit_mb = $max_size_kb / 1024;
            return $this->error_response("File size exceeds the allowable limit of {$limit_mb}MB for " . ($file_category === 'video' ? 'video' : 'document') . " files.", 422);
        }

        $config['upload_path']   = $upload_dir;
        $config['allowed_types'] = implode('|', array_merge($video_extensions, $doc_extensions));
        $config['max_size']      = $max_size_kb;
        $config['encrypt_name']  = TRUE;

        $this->load->library('upload', $config);
        $this->upload->initialize($config);

        if (!$this->upload->do_upload($file_key)) {
            return $this->error_response($this->upload->display_errors('', ''), 422);
        }

        $upload_data = $this->upload->data();

        $material_id = $this->materials->create([
            'lesson_id'    => (int)$lesson_id,
            'file_name'    => $original_name,
            'file_path'    => 'uploads/materials/' . $upload_data['file_name'],
            'file_type'    => $upload_data['file_type'] ?: 'application/octet-stream',
            'file_size_kb' => (int)($upload_data['file_size'] ?? round($file_size_bytes / 1024)),
            'external_url' => null,
        ]);

        $material = $this->materials->get_by_id($material_id);
        return $this->json_response($material, 'Material file uploaded and attached to lesson successfully.', 201);
    }

    /**
     * GET /api/materials/{id}/preview
     * Returns structured preview data (slides for PPTX, stream paths for PDF/media, etc.)
     */
    public function preview($id = null) {
        $this->require_auth();

        if (!$id) {
            return $this->error_response('Material ID is required.', 400);
        }

        $material = $this->materials->get_by_id((int)$id);
        if (!$material) {
            return $this->error_response('Material not found.', 404);
        }

        $ext = strtolower(pathinfo($material['file_name'], PATHINFO_EXTENSION));
        $file_path = rtrim(FCPATH, '/\\') . DIRECTORY_SEPARATOR . ltrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $material['file_path']), DIRECTORY_SEPARATOR);
        if (!file_exists($file_path)) {
            $alt_path = 'C:/xampp/htdocs/LMS/backend/' . ltrim($material['file_path'], '/\\');
            if (file_exists($alt_path)) {
                $file_path = $alt_path;
            }
        }

        if (!empty($material['external_url'])) {
            return $this->json_response([
                'id'           => (int)$material['id'],
                'lesson_id'    => (int)$material['lesson_id'],
                'file_name'    => $material['file_name'],
                'preview_type' => 'external_link',
                'external_url' => $material['external_url'],
            ], 'External resource retrieved.');
        }

        if (in_array($ext, ['pptx', 'ppt'])) {
            $slides = $this->parse_pptx_slides($file_path);
            return $this->json_response([
                'id'           => (int)$material['id'],
                'lesson_id'    => (int)$material['lesson_id'],
                'file_name'    => $material['file_name'],
                'preview_type' => 'pptx',
                'file_path'    => $material['file_path'],
                'total_slides' => count($slides),
                'slides'       => $slides,
            ], 'Presentation slides parsed successfully.');
        }

        if ($ext === 'pdf') {
            return $this->json_response([
                'id'           => (int)$material['id'],
                'lesson_id'    => (int)$material['lesson_id'],
                'file_name'    => $material['file_name'],
                'preview_type' => 'pdf',
                'file_url'     => '/LMS/backend/' . $material['file_path'],
            ], 'PDF document preview ready.');
        }

        if (in_array($ext, ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'])) {
            return $this->json_response([
                'id'           => (int)$material['id'],
                'lesson_id'    => (int)$material['lesson_id'],
                'file_name'    => $material['file_name'],
                'preview_type' => 'image',
                'file_url'     => '/LMS/backend/' . $material['file_path'],
            ], 'Image preview ready.');
        }

        if (in_array($ext, ['mp4', 'webm', 'ogg', 'mkv', 'avi', 'mov'])) {
            return $this->json_response([
                'id'           => (int)$material['id'],
                'lesson_id'    => (int)$material['lesson_id'],
                'file_name'    => $material['file_name'],
                'preview_type' => 'video',
                'file_url'     => '/LMS/backend/' . $material['file_path'],
            ], 'Video preview ready.');
        }

        if (in_array($ext, ['docx', 'doc'])) {
            $docx_data = $this->parse_docx_content($file_path);
            return $this->json_response([
                'id'             => (int)$material['id'],
                'lesson_id'      => (int)$material['lesson_id'],
                'file_name'      => $material['file_name'],
                'preview_type'   => 'docx',
                'title'          => $docx_data['title'],
                'total_elements' => $docx_data['total_elements'],
                'elements'       => $docx_data['elements'],
                'file_url'       => '/LMS/backend/' . $material['file_path'],
            ], 'Word document parsed successfully.');
        }

        if (in_array($ext, ['xlsx', 'xls', 'csv'])) {
            $sheet_data = $this->parse_spreadsheet_content($file_path, $ext);
            return $this->json_response([
                'id'           => (int)$material['id'],
                'lesson_id'    => (int)$material['lesson_id'],
                'file_name'    => $material['file_name'],
                'preview_type' => 'spreadsheet',
                'total_sheets' => $sheet_data['total_sheets'],
                'sheets'       => $sheet_data['sheets'],
                'file_url'     => '/LMS/backend/' . $material['file_path'],
            ], 'Spreadsheet parsed successfully.');
        }

        return $this->json_response([
            'id'           => (int)$material['id'],
            'lesson_id'    => (int)$material['lesson_id'],
            'file_name'    => $material['file_name'],
            'preview_type' => 'download_only',
            'file_url'     => '/LMS/backend/' . $material['file_path'],
        ], 'Material ready for download.');
    }

    /**
     * Helper to extract slides and text from a PPTX archive
     */
    private function parse_pptx_slides($file_path) {
        $slides = [];
        if (!file_exists($file_path)) {
            return $slides;
        }

        $zip = new ZipArchive();
        if ($zip->open($file_path) !== TRUE) {
            return $slides;
        }

        for ($i = 1; $i <= 50; $i++) {
            $content = $zip->getFromName("ppt/slides/slide{$i}.xml");
            if ($content === false) break;

            $paragraphs = [];
            $title = '';

            // Extract all paragraphs <a:p>...</a:p>
            if (preg_match_all('/<a:p\b[^>]*>(.*?)<\/a:p>/is', $content, $p_matches)) {
                foreach ($p_matches[1] as $p_xml) {
                    if (preg_match_all('/<a:t\b[^>]*>(.*?)<\/a:t>/is', $p_xml, $t_matches)) {
                        $p_text = html_entity_decode(trim(implode('', $t_matches[1])), ENT_QUOTES | ENT_XML1, 'UTF-8');
                        if ($p_text !== '') {
                            if (empty($title)) {
                                $title = $p_text;
                            } else if ($p_text !== $title && !in_array($p_text, $paragraphs)) {
                                $paragraphs[] = $p_text;
                            }
                        }
                    }
                }
            }

            $slides[] = [
                'slide_number' => count($slides) + 1,
                'title'        => !empty($title) ? $title : ('Slide ' . (count($slides) + 1)),
                'paragraphs'   => $paragraphs,
            ];
        }

        $zip->close();
        return $slides;
    }

    /**
     * Helper to extract document elements (title, headings, paragraphs, bullet lists, tables) from a DOCX/DOC file
     */
    private function parse_docx_content($file_path) {
        $elements = [];
        $doc_title = '';

        if (!file_exists($file_path)) {
            return [
                'title'          => $doc_title,
                'total_elements' => 0,
                'elements'       => $elements,
            ];
        }

        $zip = new ZipArchive();
        if ($zip->open($file_path) !== TRUE) {
            // Fallback for older .doc binary files: extract clean ascii strings
            $raw_content = @file_get_contents($file_path);
            if ($raw_content) {
                $text = preg_replace('/[^\x20-\x7E\r\n\t]/', ' ', $raw_content);
                $lines = array_filter(array_map('trim', explode("\n", $text)));
                $valid_lines = [];
                foreach ($lines as $line) {
                    if (strlen($line) > 3) {
                        $valid_lines[] = $line;
                    }
                }
                foreach (array_slice($valid_lines, 0, 100) as $idx => $line) {
                    $elements[] = [
                        'type'  => $idx === 0 ? 'title' : 'paragraph',
                        'level' => 1,
                        'text'  => $line,
                    ];
                }
            }
            return [
                'title'          => !empty($elements) ? $elements[0]['text'] : 'Document',
                'total_elements' => count($elements),
                'elements'       => $elements,
            ];
        }

        $xml_content = $zip->getFromName('word/document.xml');
        $zip->close();

        if (empty($xml_content)) {
            return [
                'title'          => $doc_title,
                'total_elements' => 0,
                'elements'       => $elements,
            ];
        }

        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $dom->loadXML($xml_content);
        libxml_clear_errors();

        $xpath = new DOMXPath($dom);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

        $body_nodes = $xpath->query('//w:body/*');
        if (!$body_nodes) {
            return [
                'title'          => $doc_title,
                'total_elements' => 0,
                'elements'       => $elements,
            ];
        }

        foreach ($body_nodes as $node) {
            if ($node->nodeName === 'w:p') {
                $style_node = $xpath->query('.//w:pStyle/@w:val', $node)->item(0);
                $style = $style_node ? $style_node->nodeValue : 'Normal';
                $is_num_list = $xpath->query('.//w:numPr', $node)->length > 0;

                // Extract all text inside paragraph runs
                $text_nodes = $xpath->query('.//w:t', $node);
                $p_text = '';
                foreach ($text_nodes as $t) {
                    $p_text .= $t->nodeValue;
                }
                $p_text = html_entity_decode(trim($p_text), ENT_QUOTES | ENT_XML1, 'UTF-8');

                if ($p_text !== '') {
                    $type = 'paragraph';
                    $level = 1;

                    if (stripos($style, 'title') !== false) {
                        $type = 'title';
                        if (empty($doc_title)) $doc_title = $p_text;
                    } elseif (stripos($style, 'heading1') !== false || stripos($style, 'heading 1') !== false) {
                        $type = 'heading';
                        $level = 1;
                    } elseif (stripos($style, 'heading2') !== false || stripos($style, 'heading 2') !== false) {
                        $type = 'heading';
                        $level = 2;
                    } elseif (stripos($style, 'heading3') !== false || stripos($style, 'heading 3') !== false) {
                        $type = 'heading';
                        $level = 3;
                    } elseif ($is_num_list || stripos($style, 'list') !== false || stripos($style, 'bullet') !== false) {
                        $type = 'bullet';
                    }

                    if (empty($doc_title) && $type === 'paragraph' && strlen($p_text) < 80) {
                        $doc_title = $p_text;
                    }

                    $elements[] = [
                        'type'  => $type,
                        'level' => $level,
                        'style' => $style,
                        'text'  => $p_text,
                    ];
                }
            } elseif ($node->nodeName === 'w:tbl') {
                $rows = [];
                $tr_nodes = $xpath->query('.//w:tr', $node);
                foreach ($tr_nodes as $tr) {
                    $row = [];
                    $tc_nodes = $xpath->query('.//w:tc', $tr);
                    foreach ($tc_nodes as $tc) {
                        $tc_text = '';
                        $t_nodes = $xpath->query('.//w:t', $tc);
                        foreach ($t_nodes as $t) {
                            $tc_text .= $t->nodeValue . ' ';
                        }
                        $row[] = html_entity_decode(trim($tc_text), ENT_QUOTES | ENT_XML1, 'UTF-8');
                    }
                    if (!empty($row)) {
                        $rows[] = $row;
                    }
                }
                if (!empty($rows)) {
                    $elements[] = [
                        'type' => 'table',
                        'rows' => $rows,
                    ];
                }
            }
        }

        return [
            'title'          => !empty($doc_title) ? $doc_title : 'Document Viewer',
            'total_elements' => count($elements),
            'elements'       => $elements,
        ];
    }

    /**
     * Helper to extract sheet data, headers, and rows from XLSX / XLS / CSV
     */
    private function parse_spreadsheet_content($file_path, $ext) {
        $sheets = [];

        if (!file_exists($file_path)) {
            return ['sheets' => $sheets, 'total_sheets' => 0];
        }

        if ($ext === 'csv') {
            $handle = @fopen($file_path, 'r');
            if ($handle !== FALSE) {
                $rows = [];
                $headers = [];
                $row_idx = 0;
                while (($data = fgetcsv($handle, 4096, ',')) !== FALSE) {
                    $clean_row = array_map(function($v) {
                        return html_entity_decode(trim($v ?? ''), ENT_QUOTES, 'UTF-8');
                    }, $data);

                    if ($row_idx === 0) {
                        $headers = $clean_row;
                    } else {
                        if (array_filter($clean_row)) {
                            $rows[] = $clean_row;
                        }
                    }
                    $row_idx++;
                    if ($row_idx > 1000) break;
                }
                fclose($handle);

                $sheets[] = [
                    'name'    => 'CSV Data',
                    'headers' => !empty($headers) ? $headers : ['Col 1', 'Col 2', 'Col 3'],
                    'rows'    => $rows,
                ];
            }
            return ['sheets' => $sheets, 'total_sheets' => count($sheets)];
        }

        // XLSX parser using ZipArchive
        $zip = new ZipArchive();
        if ($zip->open($file_path) === TRUE) {
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

            $sheet_xml = $zip->getFromName('xl/worksheets/sheet1.xml');
            if (!empty($sheet_xml)) {
                libxml_use_internal_errors(true);
                $dom_sheet = new DOMDocument();
                $dom_sheet->loadXML($sheet_xml);
                libxml_clear_errors();

                $row_nodes = $dom_sheet->getElementsByTagName('row');
                $sheet_rows = [];
                $headers = [];

                foreach ($row_nodes as $r_idx => $r_node) {
                    $c_nodes = $r_node->getElementsByTagName('c');
                    $current_row = [];

                    foreach ($c_nodes as $c_node) {
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
                                $cell_val = $is_nodes->item(0)->nodeValue;
                            }
                        }
                        $current_row[] = html_entity_decode(trim($cell_val), ENT_QUOTES | ENT_XML1, 'UTF-8');
                    }

                    if ($r_idx === 0) {
                        $headers = $current_row;
                    } else {
                        if (array_filter($current_row)) {
                            $sheet_rows[] = $current_row;
                        }
                    }
                    if ($r_idx > 500) break;
                }

                $sheets[] = [
                    'name'    => 'Sheet 1',
                    'headers' => !empty($headers) ? $headers : ['Col A', 'Col B', 'Col C'],
                    'rows'    => $sheet_rows,
                ];
            }
            $zip->close();
        }

        if (empty($sheets)) {
            $sheets[] = [
                'name'    => 'Data Sheet',
                'headers' => ['Document Ready'],
                'rows'    => [['Workbook structure parsed. Use download if needed.']],
            ];
        }

        return ['sheets' => $sheets, 'total_sheets' => count($sheets)];
    }

    /**
     * DELETE /api/materials/{id}
     */
    public function delete($id = null) {
        $this->require_role(['admin', 'instructor']);

        if (!$id) {
            return $this->error_response('Material ID is required.', 400);
        }

        $material = $this->materials->get_by_id((int)$id);
        if (!$material) {
            return $this->error_response('Material not found.', 404);
        }

        $role = $this->current_user['role'] ?? 'instructor';
        $user_id = (int)$this->current_user['id'];
        if ($role === 'instructor' && (int)$material['instructor_id'] !== $user_id) {
            return $this->error_response('Access forbidden.', 403);
        }

        // Remove physical file if exists
        if (!empty($material['file_path'])) {
            $file_path = FCPATH . $material['file_path'];
            if (file_exists($file_path)) {
                unlink($file_path);
            }
        }

        $this->materials->delete((int)$id);
        return $this->json_response(null, 'Material removed successfully.');
    }
}
