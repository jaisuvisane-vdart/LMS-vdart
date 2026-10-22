<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . 'core/API_Controller.php';
require_once APPPATH . 'libraries/Quiz_normalizer.php';
require_once APPPATH . 'libraries/parsers/Csv_quiz_parser.php';
require_once APPPATH . 'libraries/parsers/Excel_quiz_parser.php';
require_once APPPATH . 'libraries/parsers/Docx_quiz_parser.php';
require_once APPPATH . 'libraries/parsers/Pdf_quiz_parser.php';

/**
 * Smart Assessment Importer Controller
 * Endpoints for uploading quiz documents, streaming downloadable templates, previewing extracted items, and executing transactional import
 */
#[AllowDynamicProperties]
class Assessment_importer extends API_Controller {

    public function __construct() {
        parent::__construct();
        $this->load->model('Assessment_import_model', 'importer');
        $this->load->model('Assessment_model', 'assessments');
        $this->load->model('Course_model', 'courses');

        $this->normalizer = new Quiz_normalizer();
    }

    /**
     * GET /api/assessments/import/template
     * Stream standard downloadable template file for Excel (.xlsx), CSV (.csv), or Word (.docx)
     */
    public function template() {
        $this->require_auth();

        $format = strtolower($this->input->get('format', true) ?: 'xlsx');

        if ($format === 'csv') {
            $filename = 'quiz_import_template.csv';
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Pragma: no-cache');
            header('Expires: 0');

            $output = fopen('php://output', 'w');
            // Write UTF-8 BOM
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

            // Header row
            fputcsv($output, ['Question', 'Question Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Marks', 'Explanation']);

            // Sample rows
            fputcsv($output, [
                'What does MVC stand for in modern software engineering?',
                'multiple_choice',
                'Model View Controller',
                'Main Vector Canvas',
                'Multi Variable Cache',
                'Module Visual Context',
                'A',
                1,
                'MVC divides the system into three interconnected components: Model, View, and Controller.'
            ]);

            fputcsv($output, [
                'PHP is a server-side scripting language executed on the web server.',
                'true_false',
                'True',
                'False',
                '',
                '',
                'A',
                1,
                'PHP code runs on the backend server before sending HTML to the client.'
            ]);

            fputcsv($output, [
                'Which of the following HTTP methods is idempotent according to REST specification?',
                'multiple_choice',
                'POST',
                'GET',
                'PATCH',
                'CONNECT',
                'B',
                2,
                'GET requests are safe and idempotent because multiple identical calls produce the same result without side effects.'
            ]);

            fclose($output);
            exit;
        } elseif ($format === 'docx') {
            $filename = 'quiz_import_template.docx';
            header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Pragma: no-cache');
            header('Expires: 0');

            echo $this->generate_template_docx();
            exit;
        } else {
            // Default: Excel .xlsx
            $filename = 'quiz_import_template.xlsx';
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Pragma: no-cache');
            header('Expires: 0');

            echo $this->generate_template_xlsx();
            exit;
        }
    }

    /**
     * POST /api/assessments/import/upload
     * Accepts quiz document, parses questions, validates, and initializes preview session
     */
    public function upload() {
        $this->require_role(['admin', 'instructor']);

        $course_id = (int)$this->input->post('course_id');
        $assessment_id = (int)$this->input->post('assessment_id');

        if ($course_id <= 0) {
            return $this->error_response('Target Course ID is required.', 422);
        }

        // Verify course ownership
        $course = $this->courses->get_by_id($course_id);
        if (!$course) {
            return $this->error_response('Associated course not found.', 404);
        }

        if ($this->current_user['role'] === 'instructor' && (int)$course['instructor_id'] !== (int)$this->current_user['id']) {
            return $this->error_response('Unauthorized: You can only import assessments into your authored courses.', 403);
        }

        if (empty($_FILES['file']['name'])) {
            return $this->error_response('Please select a quiz file (.xlsx, .csv, .docx, .pdf) to upload.', 422);
        }

        if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            return $this->error_response('File upload failed. Please verify file integrity and size.', 422);
        }

        $file = $_FILES['file'];
        $original_name = $file['name'];
        $file_size_kb = round($file['size'] / 1024, 2);
        $ext = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));

        $allowed_exts = ['xlsx', 'csv', 'docx', 'pdf'];
        if (!in_array($ext, $allowed_exts, true)) {
            return $this->error_response('Unsupported file format. Supported formats: Excel (.xlsx), CSV (.csv), Word (.docx), and text-based PDF (.pdf).', 422);
        }

        // 20 MB size limit
        if ($file['size'] > 20 * 1024 * 1024) {
            return $this->error_response('File size exceeds the 20 MB limit.', 422);
        }

        $upload_dir = FCPATH . 'uploads/imports/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        $stored_filename = bin2hex(random_bytes(16)) . '.' . $ext;
        $target_path = $upload_dir . $stored_filename;

        if (!move_uploaded_file($file['tmp_name'], $target_path)) {
            return $this->error_response('Failed to save uploaded file on server.', 500);
        }

        try {
            // Parse by format
            switch ($ext) {
                case 'csv':
                    $parser = new Csv_quiz_parser();
                    $raw_questions = $parser->parse($target_path);
                    break;
                case 'xlsx':
                    $parser = new Excel_quiz_parser();
                    $raw_questions = $parser->parse($target_path);
                    break;
                case 'docx':
                    $parser = new Docx_quiz_parser();
                    $raw_questions = $parser->parse($target_path);
                    break;
                case 'pdf':
                    $parser = new Pdf_quiz_parser();
                    $raw_questions = $parser->parse($target_path);
                    break;
                default:
                    throw new Exception('Unsupported file format.');
            }

            if (empty($raw_questions)) {
                @unlink($target_path);
                return $this->error_response('No readable questions could be detected in this document. Please use the standard template format.', 422);
            }

            // Normalize and Validate
            $result = $this->normalizer->normalize_and_validate($raw_questions);

            // Generate Session Token
            $session_token = bin2hex(random_bytes(32));

            // Persist Session
            $session_id = $this->importer->create_session([
                'course_id'         => $course_id,
                'assessment_id'     => $assessment_id > 0 ? $assessment_id : null,
                'original_filename' => $original_name,
                'stored_filename'   => $stored_filename,
                'file_format'       => $ext,
                'file_size_kb'      => $file_size_kb,
                'uploaded_by'       => (int)$this->current_user['id'],
                'session_token'     => $session_token,
                'preview_payload'   => $result,
                'summary'           => $result['summary'],
            ]);

            return $this->json_response([
                'session_token'     => $session_token,
                'original_filename' => $original_name,
                'file_format'       => $ext,
                'file_size_kb'      => $file_size_kb,
                'summary'           => $result['summary'],
                'items'             => $result['items'],
            ], 'Quiz file parsed and validated successfully.');

        } catch (Exception $e) {
            @unlink($target_path);
            return $this->error_response('Document parsing error: ' . $e->getMessage(), 422);
        }
    }

    /**
     * GET /api/assessments/import/session/{token}
     * Retrieve import session preview data
     */
    public function get_session($token) {
        $this->require_role(['admin', 'instructor']);

        $session = $this->importer->get_by_token($token);
        if (!$session) {
            return $this->error_response('Import session not found or expired.', 404);
        }

        if ($this->current_user['role'] === 'instructor' && (int)$session['uploaded_by'] !== (int)$this->current_user['id']) {
            return $this->error_response('Unauthorized access to this import session.', 403);
        }

        return $this->json_response([
            'session_token'     => $session['session_token'],
            'original_filename' => $session['original_filename'],
            'file_format'       => $session['file_format'],
            'file_size_kb'      => (float)$session['file_size_kb'],
            'summary'           => $session['preview_payload']['summary'] ?? [],
            'items'             => $session['preview_payload']['items'] ?? [],
            'import_status'     => $session['import_status'],
        ], 'Import session data retrieved.');
    }

    /**
     * PUT /api/assessments/import/session/{token}/question/{index}
     * Update an individual question during preview stage and revalidate
     */
    public function update_question($token, $item_number) {
        $this->require_role(['admin', 'instructor']);

        $session = $this->importer->get_by_token($token);
        if (!$session) {
            return $this->error_response('Import session not found.', 404);
        }

        if ($this->current_user['role'] === 'instructor' && (int)$session['uploaded_by'] !== (int)$this->current_user['id']) {
            return $this->error_response('Unauthorized.', 403);
        }

        $input = $this->get_json_input();
        $items = $session['preview_payload']['items'] ?? [];
        $target_idx = -1;

        foreach ($items as $idx => $it) {
            if ((int)$it['item_number'] === (int)$item_number) {
                $target_idx = $idx;
                break;
            }
        }

        if ($target_idx === -1) {
            return $this->error_response('Question item not found in session.', 404);
        }

        // Apply edits to target item
        if (isset($input['question_text'])) $items[$target_idx]['question_text'] = trim($input['question_text']);
        if (isset($input['question_type'])) $items[$target_idx]['question_type'] = $input['question_type'];
        if (isset($input['marks'])) $items[$target_idx]['marks'] = max(1, (int)$input['marks']);
        if (isset($input['explanation'])) $items[$target_idx]['explanation'] = trim($input['explanation']);
        if (isset($input['options']) && is_array($input['options'])) $items[$target_idx]['options'] = $input['options'];
        if (isset($input['is_excluded'])) $items[$target_idx]['is_excluded'] = (bool)$input['is_excluded'];

        // Re-run normalizer & validation over updated items array
        $revalidated = $this->normalizer->normalize_and_validate($items);

        // Preserve exclusion flags
        foreach ($revalidated['items'] as &$rev_item) {
            foreach ($items as $orig_item) {
                if ($rev_item['item_number'] === $orig_item['item_number']) {
                    $rev_item['is_excluded'] = !empty($orig_item['is_excluded']);
                    break;
                }
            }
        }
        unset($rev_item);

        // Save updated session payload
        $this->importer->update_session_question($session['id'], $revalidated, $revalidated['summary']);

        return $this->json_response([
            'summary' => $revalidated['summary'],
            'items'   => $revalidated['items'],
        ], 'Question updated and revalidated successfully.');
    }

    /**
     * POST /api/assessments/import/confirm
     * Confirm import and commit validated questions into database
     */
    public function confirm() {
        $this->require_role(['admin', 'instructor']);

        $input = $this->get_json_input();
        $token = trim($input['session_token'] ?? '');

        if (empty($token)) {
            return $this->error_response('Session token is required.', 422);
        }

        $session = $this->importer->get_by_token($token);
        if (!$session) {
            return $this->error_response('Import session not found or expired.', 404);
        }

        if ($session['import_status'] === 'confirmed') {
            return $this->error_response('This import session has already been confirmed.', 409);
        }

        if ($this->current_user['role'] === 'instructor' && (int)$session['uploaded_by'] !== (int)$this->current_user['id']) {
            return $this->error_response('Unauthorized.', 403);
        }

        $items = $session['preview_payload']['items'] ?? [];
        $included_items = array_filter($items, function($it) {
            return empty($it['is_excluded']);
        });

        if (empty($included_items)) {
            return $this->error_response('Please include at least one valid question to import.', 422);
        }

        // Verify zero blocking errors among included questions
        $has_blocking_errors = false;
        foreach ($included_items as $it) {
            if (empty($it['is_valid'])) {
                $has_blocking_errors = true;
                break;
            }
        }

        if ($has_blocking_errors) {
            return $this->error_response('Cannot confirm import: One or more included questions have validation errors. Please correct or exclude them.', 422);
        }

        try {
            $assessment_id = $this->importer->confirm_import($session, $input);
            $assessment = $this->assessments->get_assessment_by_id($assessment_id, false);

            return $this->json_response([
                'assessment'     => $assessment,
                'imported_count' => count($included_items),
            ], 'Assessment imported successfully into question bank.', 201);

        } catch (Exception $e) {
            return $this->error_response('Import confirmation failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/assessments/import/cancel
     * Cancel an import session
     */
    public function cancel() {
        $this->require_role(['admin', 'instructor']);

        $input = $this->get_json_input();
        $token = trim($input['session_token'] ?? '');

        if (empty($token)) {
            return $this->error_response('Session token is required.', 422);
        }

        $session = $this->importer->get_by_token($token);
        if ($session) {
            $this->importer->cancel_session($session);
        }

        return $this->json_response(null, 'Import session cancelled.');
    }

    /**
     * Helper to build a clean standard .xlsx template file using native ZipArchive
     */
    private function generate_template_xlsx() {
        $temp_file = tempnam(sys_get_temp_dir(), 'tmpl_xlsx_');
        $zip = new ZipArchive();
        $zip->open($temp_file, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        // Content Types
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedString+xml"/>
</Types>');

        // _rels/.rels
        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>');

        // xl/_rels/workbook.xml.rels
        $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>');

        // xl/workbook.xml
        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Quiz Questions" sheetId="1" r:id="rId1"/></sheets>
</workbook>');

        // Shared strings
        $strings = [
            'Question', 'Question Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Marks', 'Explanation',
            'What does MVC stand for in modern software engineering?', 'multiple_choice', 'Model View Controller', 'Main Vector Canvas', 'Multi Variable Cache', 'Module Visual Context', 'A', '1', 'MVC divides the system into Model, View, and Controller.',
            'PHP is a server-side scripting language executed on the web server.', 'true_false', 'True', 'False', '', 'A', '1', 'PHP runs on the server and returns generated HTML to the browser.'
        ];

        $ss_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' . count($strings) . '" uniqueCount="' . count($strings) . '">';
        foreach ($strings as $str) {
            $ss_xml .= '<si><t>' . htmlspecialchars($str, ENT_XML1, 'UTF-8') . '</t></si>';
        }
        $ss_xml .= '</sst>';
        $zip->addFromString('xl/sharedStrings.xml', $ss_xml);

        // Sheet 1 rows
        $sheet_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="1">
<c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c><c r="F1" t="s"><v>5</v></c><c r="G1" t="s"><v>6</v></c><c r="H1" t="s"><v>7</v></c><c r="I1" t="s"><v>8</v></c>
</row>
<row r="2">
<c r="A2" t="s"><v>9</v></c><c r="B2" t="s"><v>10</v></c><c r="C2" t="s"><v>11</v></c><c r="D2" t="s"><v>12</v></c><c r="E2" t="s"><v>13</v></c><c r="F2" t="s"><v>14</v></c><c r="G2" t="s"><v>15</v></c><c r="H2" t="s"><v>16</v></c><c r="I2" t="s"><v>17</v></c>
</row>
<row r="3">
<c r="A3" t="s"><v>18</v></c><c r="B3" t="s"><v>19</v></c><c r="C3" t="s"><v>20</v></c><c r="D3" t="s"><v>21</v></c><c r="E3" t="s"><v>22</v></c><c r="F3" t="s"><v>22</v></c><c r="G3" t="s"><v>23</v></c><c r="H3" t="s"><v>24</v></c><c r="I3" t="s"><v>25</v></c>
</row>
</sheetData>
</worksheet>';
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheet_xml);

        $zip->close();
        $content = file_get_contents($temp_file);
        @unlink($temp_file);
        return $content;
    }

    /**
     * Helper to build a clean standard .docx template file using native ZipArchive
     */
    private function generate_template_docx() {
        $temp_file = tempnam(sys_get_temp_dir(), 'tmpl_docx_');
        $zip = new ZipArchive();
        $zip->open($temp_file, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>');

        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>');

        $paragraphs = [
            'LMS Assessment Quiz Template',
            '',
            'Q1. What does MVC stand for in modern software engineering?',
            'Type: Multiple Choice',
            'A) Model View Controller',
            'B) Main Vector Canvas',
            'C) Multi Variable Cache',
            'D) Module Visual Context',
            'Answer: A',
            'Marks: 1',
            'Explanation: MVC divides the system into Model, View, and Controller components.',
            '',
            'Q2. PHP is a server-side scripting language executed on the web server.',
            'Type: True/False',
            'A) True',
            'B) False',
            'Answer: A',
            'Marks: 1',
            'Explanation: PHP runs on the backend server before sending HTML to the client.',
            '',
            'Q3. Which HTTP method is idempotent according to REST architectural style?',
            'Type: Multiple Choice',
            'A) POST',
            'B) GET',
            'C) PATCH',
            'D) CONNECT',
            'Answer: B',
            'Marks: 2',
            'Explanation: GET requests are idempotent and do not create side effects.'
        ];

        $doc_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>';
        foreach ($paragraphs as $p) {
            $doc_xml .= '<w:p><w:r><w:t>' . htmlspecialchars($p, ENT_XML1, 'UTF-8') . '</w:t></w:r></w:p>';
        }
        $doc_xml .= '</w:body></w:document>';

        $zip->addFromString('word/document.xml', $doc_xml);
        $zip->close();

        $content = file_get_contents($temp_file);
        @unlink($temp_file);
        return $content;
    }
}
