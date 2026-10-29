<?php
defined('BASEPATH') OR exit('No direct script access allowed');

#[AllowDynamicProperties]
class Google_sheet_model extends CI_Model {

    private $cached_access_token = null;
    private $token_expires_at = 0;

    public function __construct() {
        parent::__construct();
        $this->load->database();
        $this->load->model('User_model', 'users');
        $this->config->load('google_sheets', TRUE, TRUE);
    }

    /**
     * Read an environment variable from getenv, $_ENV, $_SERVER, or parsing .env file
     */
    public function get_env_val($keys, $default = null) {
        if (!is_array($keys)) {
            $keys = [$keys];
        }

        foreach ($keys as $k) {
            $val = getenv($k);
            if ($val !== false && $val !== '') return trim($val);
            if (!empty($_ENV[$k])) return trim($_ENV[$k]);
            if (!empty($_SERVER[$k])) return trim($_SERVER[$k]);
        }

        // Look for .env file in frontend folder, project root, or backend folder
        $possible_paths = [
            dirname(FCPATH) . DIRECTORY_SEPARATOR . 'frontend' . DIRECTORY_SEPARATOR . '.env',
            FCPATH . '..' . DIRECTORY_SEPARATOR . 'frontend' . DIRECTORY_SEPARATOR . '.env',
            'C:\\xampp\\htdocs\\LMS\\frontend\\.env',
            FCPATH . '.env',
            FCPATH . '..' . DIRECTORY_SEPARATOR . '.env',
            dirname(FCPATH) . DIRECTORY_SEPARATOR . '.env',
            dirname(dirname(FCPATH)) . DIRECTORY_SEPARATOR . '.env'
        ];

        foreach ($possible_paths as $env_file) {
            if (@file_exists($env_file) && @is_readable($env_file)) {
                $lines = @file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                if ($lines) {
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if (empty($line) || strpos($line, '#') === 0) continue;
                        if (strpos($line, '=') !== false) {
                            list($name, $val) = explode('=', $line, 2);
                            $name = trim($name);
                            $val = trim($val, " \t\n\r\0\x0B\"'");
                            foreach ($keys as $k) {
                                if ($name === $k && $val !== '') {
                                    return $val;
                                }
                            }
                        }
                    }
                }
            }
        }

        return $default;
    }

    /**
     * Get all Google Sheet sync configurations
     */
    public function get_configs() {
        return [
            $this->get_config('trainees'),
            $this->get_config('recruiters')
        ];
    }

    /**
     * Get specific sync configuration by sheet type (loads from config/google_sheets.php with .env support)
     */
    public function get_config($sheet_type) {
        $file_config = $this->config->item('google_sheets') ?: [];

        // 1. Settings from application/config/google_sheets.php
        $spreadsheet_id = trim($file_config['spreadsheet_id'] ?? '');
        $trainees_tab   = trim($file_config['trainees_tab'] ?? 'Trainees');
        $recruiters_tab = trim($file_config['recruiters_tab'] ?? 'Recruiters');
        $webhook_secret = trim($file_config['webhook_secret'] ?? 'lms_gsheet_secure_sync_key');

        // 2. Check .env file overrides if populated
        $env_spreadsheet_id = $this->get_env_val(['GOOGLE_SHEET_SPREADSHEET_ID', 'GOOGLE_SPREADSHEET_ID']);
        if (!empty($env_spreadsheet_id)) {
            $spreadsheet_id = $env_spreadsheet_id;
        }

        $env_trainees = $this->get_env_val(['GOOGLE_SHEET_TRAINEES_TAB', 'GOOGLE_TRAINEES_TAB']);
        if (!empty($env_trainees)) {
            $trainees_tab = $env_trainees;
        }

        $env_recruiters = $this->get_env_val(['GOOGLE_SHEET_RECRUITERS_TAB', 'GOOGLE_RECRUITERS_TAB']);
        if (!empty($env_recruiters)) {
            $recruiters_tab = $env_recruiters;
        }

        $env_secret = $this->get_env_val(['GOOGLE_SHEET_WEBHOOK_SECRET', 'GOOGLE_WEBHOOK_SECRET']);
        if (!empty($env_secret)) {
            $webhook_secret = $env_secret;
        }

        // Get DB tracking row for timestamps & status
        $db_row = $this->db->get_where('google_sheet_sync_configs', ['sheet_type' => $sheet_type])->row_array();

        // 3. Fallback to DB spreadsheet_id if code & env are empty
        if (empty($spreadsheet_id) && !empty($db_row['spreadsheet_id'])) {
            $spreadsheet_id = trim($db_row['spreadsheet_id']);
        }

        // 4. Sanitize if a full Google Sheets URL or /edit suffix was provided
        if (preg_match('#([a-zA-Z0-9-_]{25,})#', $spreadsheet_id, $matches)) {
            $spreadsheet_id = $matches[1];
        }

        $sa_info = $this->get_service_account_info();

        return [
            'sheet_type'        => $sheet_type,
            'spreadsheet_id'    => $spreadsheet_id,
            'sheet_tab_name'    => $sheet_type === 'trainees' ? $trainees_tab : $recruiters_tab,
            'auto_sync_enabled' => 1,
            'sync_status'       => $db_row['sync_status'] ?? 'idle',
            'sync_message'      => $db_row['sync_message'] ?? null,
            'last_synced_at'    => $db_row['last_synced_at'] ?? null,
            'webhook_secret'    => $webhook_secret,
            'service_account'   => [
                'configured'   => $sa_info['configured'],
                'client_email' => $sa_info['client_email'],
            ],
            'source'            => !empty($spreadsheet_id) ? 'code_config' : 'unconfigured',
        ];
    }

    /**
     * Locate Google Cloud Service Account JSON private key file
     */
    public function find_service_account_key_file() {
        $file_config = $this->config->item('google_sheets') ?: [];
        $candidates = [];

        // 1. Path from application/config/google_sheets.php
        if (!empty($file_config['service_account_key_file'])) {
            $candidates[] = $file_config['service_account_key_file'];
        }

        // 2. Path from environment variables
        $env_file = $this->get_env_val(['GOOGLE_SERVICE_ACCOUNT_KEY_FILE', 'GOOGLE_SERVICE_ACCOUNT_JSON']);
        if (!empty($env_file)) {
            $candidates[] = $env_file;
        }

        // 3. Standard locations in application/config or project root
        $candidates[] = APPPATH . 'config' . DIRECTORY_SEPARATOR . 'google_service_account.json';
        $candidates[] = FCPATH . '..' . DIRECTORY_SEPARATOR . 'google_service_account.json';
        $candidates[] = FCPATH . 'google_service_account.json';
        $candidates[] = 'C:\\xampp\\htdocs\\LMS\\backend\\application\\config\\google_service_account.json';
        $candidates[] = 'C:\\xampp\\htdocs\\LMS\\google_service_account.json';

        foreach ($candidates as $cand) {
            if (!empty($cand) && @file_exists($cand) && @is_readable($cand)) {
                $raw = @file_get_contents($cand);
                if ($raw && strpos($raw, 'service_account') !== false && strpos($raw, 'private_key') !== false) {
                    return realpath($cand) ?: $cand;
                }
            }
        }

        // 4. Scan application/config for any *.json file with type=service_account
        $config_dir = APPPATH . 'config';
        if (@is_dir($config_dir)) {
            $files = @glob($config_dir . DIRECTORY_SEPARATOR . '*.json');
            if ($files) {
                foreach ($files as $file) {
                    $raw = @file_get_contents($file);
                    if ($raw && strpos($raw, 'service_account') !== false && strpos($raw, 'private_key') !== false) {
                        return realpath($file) ?: $file;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Retrieve Service Account diagnostic info (email, project, configuration status)
     */
    public function get_service_account_info() {
        $key_file = $this->find_service_account_key_file();
        if (!$key_file) {
            return [
                'configured'   => false,
                'client_email' => null,
                'project_id'   => null,
                'path'         => null,
            ];
        }

        $raw = @file_get_contents($key_file);
        $json = @json_decode($raw, true);

        return [
            'configured'   => is_array($json) && !empty($json['client_email']),
            'client_email' => $json['client_email'] ?? null,
            'project_id'   => $json['project_id'] ?? null,
            'path'         => $key_file,
        ];
    }

    /**
     * Base64URL encoding helper for JWT creation
     */
    private function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Generate an OAuth2 bearer access token using Service Account RS256 JWT assertion
     */
    public function get_service_account_access_token($key_file = null) {
        if ($this->cached_access_token && $this->token_expires_at > (time() + 60)) {
            return ['success' => true, 'access_token' => $this->cached_access_token];
        }

        if (!$key_file) {
            $key_file = $this->find_service_account_key_file();
        }

        if (!$key_file || !@file_exists($key_file)) {
            return [
                'success' => false,
                'error'   => 'Google Service Account JSON key file not found. Place your key file in backend/application/config/google_service_account.json',
            ];
        }

        $raw = @file_get_contents($key_file);
        $data = @json_decode($raw, true);
        if (!is_array($data) || empty($data['client_email']) || empty($data['private_key'])) {
            return [
                'success' => false,
                'error'   => 'Invalid Service Account JSON format. Missing client_email or private_key.',
            ];
        }

        $now = time();
        $jwt_header = [
            'alg' => 'RS256',
            'typ' => 'JWT',
        ];
        $jwt_claim = [
            'iss'   => $data['client_email'],
            'scope' => 'https://www.googleapis.com/auth/spreadsheets.readonly',
            'aud'   => !empty($data['token_uri']) ? $data['token_uri'] : 'https://oauth2.googleapis.com/token',
            'iat'   => $now,
            'exp'   => $now + 3600,
        ];

        $unsigned_token = $this->base64url_encode(json_encode($jwt_header)) . '.' . $this->base64url_encode(json_encode($jwt_claim));

        $private_key = openssl_pkey_get_private($data['private_key']);
        if (!$private_key) {
            return [
                'success' => false,
                'error'   => 'Unable to load private key from Service Account JSON. Ensure OpenSSL is enabled in PHP.',
            ];
        }

        $signature = '';
        if (!openssl_sign($unsigned_token, $signature, $private_key, OPENSSL_ALGO_SHA256)) {
            return [
                'success' => false,
                'error'   => 'Failed to sign JWT with Google Service Account private key.',
            ];
        }

        $assertion = $unsigned_token . '.' . $this->base64url_encode($signature);
        $token_url = !empty($data['token_uri']) ? $data['token_uri'] : 'https://oauth2.googleapis.com/token';

        $req = $this->make_http_request(
            $token_url,
            'POST',
            ['Accept: application/json'],
            [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $assertion,
            ],
            20
        );

        if (!empty($req['error'])) {
            return [
                'success' => false,
                'error'   => 'OAuth token network error: ' . $req['error'],
            ];
        }

        $http_code = $req['http_code'];
        $token_data = @json_decode($req['body'], true);
        if ($http_code !== 200 || empty($token_data['access_token'])) {
            $err_desc = $token_data['error_description'] ?? ($token_data['error'] ?? 'HTTP ' . $http_code);
            return [
                'success' => false,
                'error'   => 'Failed to obtain Google OAuth access token: ' . $err_desc,
            ];
        }

        $this->cached_access_token = $token_data['access_token'];
        $this->token_expires_at = $now + (int)($token_data['expires_in'] ?? 3600);

        return [
            'success'      => true,
            'access_token' => $token_data['access_token'],
        ];
    }

    /**
     * Resilient HTTP Client (supports cURL when available, falls back to native streams)
     */
    private function make_http_request($url, $method = 'GET', $headers = [], $post_fields = null, $timeout = 30) {
        $method = strtoupper($method);

        // 1. Try cURL if extension is loaded in the active PHP runtime
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            if (!empty($headers)) {
                curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            }
            if ($method === 'POST') {
                curl_setopt($ch, CURLOPT_POST, true);
                if ($post_fields !== null) {
                    $payload = is_array($post_fields) ? http_build_query($post_fields) : $post_fields;
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
                }
            }
            $body = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            return [
                'success'   => ($error === '' && $http_code >= 200 && $http_code < 400),
                'http_code' => $http_code,
                'body'      => $body !== false ? $body : '',
                'error'     => $error,
            ];
        }

        // 2. Native stream context fallback (works in Apache on Windows without requiring curl DLL)
        $options = [
            'http' => [
                'method'        => $method,
                'timeout'       => $timeout,
                'ignore_errors' => true,
            ],
            'ssl' => [
                'verify_peer'      => false,
                'verify_peer_name' => false,
            ],
        ];

        $header_lines = [];
        foreach ($headers as $h) {
            $header_lines[] = $h;
        }
        if ($method === 'POST' && $post_fields !== null) {
            $payload = is_array($post_fields) ? http_build_query($post_fields) : $post_fields;
            $header_lines[] = 'Content-Type: application/x-www-form-urlencoded';
            $header_lines[] = 'Content-Length: ' . strlen($payload);
            $options['http']['content'] = $payload;
        }
        if (!empty($header_lines)) {
            $options['http']['header'] = implode("\r\n", $header_lines);
        }

        $context = stream_context_create($options);
        $body = @file_get_contents($url, false, $context);

        $http_code = 0;
        if (!empty($http_response_header)) {
            if (preg_match('#HTTP/\S+\s+(\d{3})#i', $http_response_header[0], $matches)) {
                $http_code = (int)$matches[1];
            }
        }

        $error = ($body === false && $http_code === 0) ? 'Network connection failed' : '';

        return [
            'success'   => ($error === '' && $http_code >= 200 && $http_code < 400),
            'http_code' => $http_code,
            'body'      => $body !== false ? $body : '',
            'error'     => $error,
        ];
    }

    /**
     * Fetch spreadsheet rows securely via Google Sheets REST API v4 using OAuth bearer token
     */
    public function fetch_google_sheets_api_data($spreadsheet_id, $tab_name, $key_file) {
        $token_result = $this->get_service_account_access_token($key_file);
        if (!$token_result['success']) {
            return $token_result;
        }

        $access_token = $token_result['access_token'];
        $info = $this->get_service_account_info();
        $sa_email = $info['client_email'] ?? 'your service account email';

        // Range syntax: 'Tab Name'!A1:ZZ or tab name
        $range = urlencode("'" . str_replace("'", "''", $tab_name) . "'");
        $api_url = 'https://sheets.googleapis.com/v4/spreadsheets/' . urlencode($spreadsheet_id) . '/values/' . $range . '?majorDimension=ROWS';

        $req = $this->make_http_request(
            $api_url,
            'GET',
            [
                'Authorization: Bearer ' . $access_token,
                'Accept: application/json',
            ],
            null,
            30
        );

        if (!empty($req['error'])) {
            return ['success' => false, 'error' => 'Google Sheets API network error: ' . $req['error']];
        }

        $http_code = $req['http_code'];
        $res_json = @json_decode($req['body'], true);

        if ($http_code === 404) {
            $msg = 'Spreadsheet not found or sheet tab "' . $tab_name . '" does not exist. ';
            $msg .= 'Please ensure the Google Sheet is shared with your Service Account email (' . $sa_email . ') as "Viewer" and the tab name is exact.';
            return ['success' => false, 'error' => $msg];
        }

        if ($http_code === 403) {
            $details = $res_json['error']['message'] ?? '';
            if (stripos($details, 'Google Sheets API has not been used') !== false || stripos($details, 'disabled') !== false) {
                return [
                    'success' => false,
                    'error'   => 'Google Sheets API is disabled in your Google Cloud Project. Please open Google Cloud Console > APIs & Services > Enable "Google Sheets API".',
                ];
            }
            return [
                'success' => false,
                'error'   => 'Access denied by Google Sheets. Please open your Google Sheet, click the "Share" button, and add ' . $sa_email . ' as "Viewer".',
            ];
        }

        if ($http_code !== 200 || empty($res_json)) {
            // Check if failure is due to tab title whitespace differences (e.g. 'Recruiter  Sheet' vs 'Recruiter Sheet')
            $meta_url = 'https://sheets.googleapis.com/v4/spreadsheets/' . urlencode($spreadsheet_id) . '?fields=sheets.properties.title';
            $meta_req = $this->make_http_request(
                $meta_url,
                'GET',
                [
                    'Authorization: Bearer ' . $access_token,
                    'Accept: application/json',
                ],
                null,
                15
            );

            $meta_json = @json_decode($meta_req['body'], true);
            if (!empty($meta_json['sheets'])) {
                $clean_tab = preg_replace('/\s+/', ' ', strtolower(trim($tab_name)));
                foreach ($meta_json['sheets'] as $s) {
                    $actual_title = $s['properties']['title'] ?? '';
                    $clean_actual = preg_replace('/\s+/', ' ', strtolower(trim($actual_title)));
                    if ($clean_tab === $clean_actual && $actual_title !== $tab_name) {
                        // Automatically re-fetch using the exact matched sheet title
                        return $this->fetch_google_sheets_api_data($spreadsheet_id, $actual_title, $key_file);
                    }
                }
            }

            $msg = $res_json['error']['message'] ?? ('HTTP ' . $http_code . ' from Google Sheets API');
            return ['success' => false, 'error' => $msg];
        }

        $values = $res_json['values'] ?? [];
        if (empty($values) || !is_array($values)) {
            return ['success' => true, 'rows' => []];
        }

        // First row is headers
        $raw_headers = array_shift($values);
        $headers = array_map(function($h) {
            return strtolower(trim(preg_replace('/[^a-zA-Z0-9_ ]/', '', $h)));
        }, $raw_headers);

        $rows = [];
        foreach ($values as $row_data) {
            if (!is_array($row_data) || empty(array_filter($row_data, 'strlen'))) {
                continue;
            }
            $row = [];
            foreach ($headers as $col_idx => $header_name) {
                $row[$header_name] = isset($row_data[$col_idx]) ? trim($row_data[$col_idx]) : '';
            }
            $rows[] = $row;
        }

        return ['success' => true, 'rows' => $rows];
    }

    /**
     * Update sync configuration
     */
    public function update_config($sheet_type, $data) {
        $update = [];
        if (isset($data['spreadsheet_id'])) $update['spreadsheet_id'] = trim($data['spreadsheet_id']);
        if (isset($data['sheet_tab_name'])) $update['sheet_tab_name'] = trim($data['sheet_tab_name']);
        if (isset($data['id_header_name'])) $update['id_header_name'] = trim($data['id_header_name']);
        if (isset($data['auto_sync_enabled'])) $update['auto_sync_enabled'] = (int)$data['auto_sync_enabled'];
        if (isset($data['sync_interval_minutes'])) $update['sync_interval_minutes'] = (int)$data['sync_interval_minutes'];
        if (isset($data['webhook_secret'])) $update['webhook_secret'] = trim($data['webhook_secret']);

        if (empty($update)) {
            return false;
        }

        $this->db->where('sheet_type', $sheet_type);
        return $this->db->update('google_sheet_sync_configs', $update);
    }

    /**
     * Synchronize a specific sheet type or all sheets
     *
     * @param string|null $sheet_type 'trainees' | 'recruiters' | null
     * @param array|null $pushed_rows Optional raw rows if pushed via webhook
     * @return array
     */
    public function sync($sheet_type = null, $pushed_rows = null) {
        if ($sheet_type && in_array($sheet_type, ['trainees', 'recruiters'], true)) {
            return [$sheet_type => $this->sync_single_type($sheet_type, $pushed_rows)];
        }

        return [
            'trainees'   => $this->sync_single_type('trainees', null),
            'recruiters' => $this->sync_single_type('recruiters', null),
        ];
    }

    /**
     * Synchronize a single sheet type ('trainees' or 'recruiters')
     */
    private function sync_single_type($sheet_type, $pushed_rows = null) {
        $config = $this->get_config($sheet_type);
        if (!$config) {
            return [
                'status'  => 'error',
                'message' => 'Configuration not found for sheet type: ' . $sheet_type,
            ];
        }

        $now = date('Y-m-d H:i:s');
        $this->db->where('sheet_type', $sheet_type)->update('google_sheet_sync_configs', [
            'sync_status' => 'syncing',
            'sync_message' => 'Sync in progress...',
        ]);

        $rows = [];
        if (is_array($pushed_rows) && !empty($pushed_rows)) {
            $rows = $pushed_rows;
        } else {
            $spreadsheet_id = trim($config['spreadsheet_id']);
            if (preg_match('#([a-zA-Z0-9-_]{25,})#', $spreadsheet_id, $matches)) {
                $spreadsheet_id = $matches[1];
            }
            $tab_name = trim($config['sheet_tab_name'] ?: ($sheet_type === 'trainees' ? 'Trainees' : 'Recruiters'));

            if (empty($spreadsheet_id)) {
                $err = 'Spreadsheet ID is not configured. Please add GOOGLE_SHEET_SPREADSHEET_ID to your .env file or enter it in settings.';
                $this->db->where('sheet_type', $sheet_type)->update('google_sheet_sync_configs', [
                    'sync_status'  => 'error',
                    'sync_message' => $err,
                    'last_synced_at' => $now,
                ]);
                return [
                    'status'  => 'error',
                    'message' => $err,
                ];
            }

            // Check if Google Cloud Service Account key is configured
            $sa_key_file = $this->find_service_account_key_file();
            if ($sa_key_file) {
                // Fetch directly via Google Sheets API v4 using authenticated Service Account
                $fetch_result = $this->fetch_google_sheets_api_data($spreadsheet_id, $tab_name, $sa_key_file);
            } else {
                // Fallback: Google Apps Script Web App or Google Sheets CSV endpoint
                if (strpos($spreadsheet_id, 'script.google.com') !== false || strpos($spreadsheet_id, 'script.googleusercontent.com') !== false) {
                    $fetch_url = $spreadsheet_id . (strpos($spreadsheet_id, '?') !== false ? '&' : '?') . 'sheet=' . urlencode($tab_name);
                } else {
                    $fetch_url = 'https://docs.google.com/spreadsheets/d/' . urlencode($spreadsheet_id) . '/gviz/tq?tqx=out:csv&sheet=' . urlencode($tab_name);
                }
                $fetch_result = $this->fetch_csv_data($fetch_url);
            }

            if (!$fetch_result['success']) {
                $err = 'Failed to fetch Google Sheet data: ' . $fetch_result['error'];
                $this->db->where('sheet_type', $sheet_type)->update('google_sheet_sync_configs', [
                    'sync_status'  => 'error',
                    'sync_message' => $err,
                    'last_synced_at' => $now,
                ]);
                return [
                    'status'  => 'error',
                    'message' => $err,
                ];
            }

            $rows = $fetch_result['rows'];
        }

        if (empty($rows)) {
            $msg = 'No data rows found in Google Sheet ' . $sheet_type;
            $this->db->where('sheet_type', $sheet_type)->update('google_sheet_sync_configs', [
                'sync_status'  => 'success',
                'sync_message' => $msg,
                'last_synced_at' => $now,
            ]);
            return [
                'status'          => 'success',
                'message'         => $msg,
                'processed_count' => 0,
                'created_count'   => 0,
                'updated_count'   => 0,
                'skipped_count'   => 0,
            ];
        }

        // Process rows and upsert into database
        $stats = $this->process_and_upsert_rows($sheet_type, $rows);

        $summary_msg = sprintf(
            'Sync completed. %d processed (%d created, %d updated, %d skipped).',
            $stats['processed_count'],
            $stats['created_count'],
            $stats['updated_count'],
            $stats['skipped_count']
        );

        $this->db->where('sheet_type', $sheet_type)->update('google_sheet_sync_configs', [
            'sync_status'    => 'success',
            'sync_message'   => $summary_msg,
            'last_synced_at' => $now,
        ]);

        return array_merge(['status' => 'success', 'message' => $summary_msg], $stats);
    }

    /**
     * Fetch and parse CSV data from Google Sheets URL
     */
    private function fetch_csv_data($url) {
        $req = $this->make_http_request(
            $url,
            'GET',
            ['User-Agent: LMS-GoogleSheets-Sync/1.0'],
            null,
            30
        );

        $http_code = $req['http_code'];
        $csv_content = $req['body'];

        if (!empty($req['error'])) {
            return ['success' => false, 'error' => $req['error']];
        }

        if ($http_code !== 200 || empty($csv_content)) {
            $msg = 'HTTP Error ' . $http_code . '.';
            if ($http_code === 401) {
                $msg .= ' The Google Sheet is Restricted. In Google Sheets, click the blue "Share" button and change General Access to "Anyone with the link can view".';
            } elseif ($http_code === 404) {
                $msg .= ' The Spreadsheet or Tab was not found. Please verify that the sheet tab name matches your Google Sheet exactly.';
            } else {
                $msg .= ' Verify that the Google Sheet link is shared as "Anyone with the link can view" or published.';
            }
            return [
                'success' => false,
                'error'   => $msg,
            ];
        }

        // First check if response is JSON (from Google Apps Script Web App)
        $trim_content = trim($csv_content);
        if (strpos($trim_content, '[') === 0 || strpos($trim_content, '{') === 0) {
            $json = json_decode($trim_content, true);
            if (is_array($json)) {
                if (isset($json['rows']) && is_array($json['rows'])) {
                    return ['success' => true, 'rows' => $json['rows']];
                }
                if (!empty($json) && isset($json[0]) && is_array($json[0])) {
                    return ['success' => true, 'rows' => $json];
                }
                if (isset($json['error'])) {
                    return ['success' => false, 'error' => $json['error']];
                }
            }
        }

        // Parse CSV content into structured array
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $csv_content));
        $rows = [];
        $headers = [];

        foreach ($lines as $line_idx => $line) {
            if (trim($line) === '') continue;
            $data = str_getcsv($line);
            if ($line_idx === 0 || empty($headers)) {
                $headers = array_map(function($h) {
                    return strtolower(trim(preg_replace('/[^a-zA-Z0-9_ ]/', '', $h)));
                }, $data);
                continue;
            }

            if (count($data) >= 2) {
                $row = [];
                foreach ($headers as $col_idx => $header_name) {
                    $row[$header_name] = isset($data[$col_idx]) ? trim($data[$col_idx]) : '';
                }
                $rows[] = $row;
            }
        }

        return ['success' => true, 'rows' => $rows];
    }

    /**
     * Process parsed rows and upsert into the users table
     */
    public function process_and_upsert_rows($sheet_type, array $rows) {
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $now = date('Y-m-d H:i:s');
        $is_trainee = ($sheet_type === 'trainees');
        $learner_type = $is_trainee ? 'trainee' : 'recruiter';
        $default_password_hash = password_hash('Welcome@123', PASSWORD_BCRYPT);

        foreach ($rows as $row) {
            // Find identifier: Trainee ID for trainees, Employee ID for recruiters
            $identifier = '';
            if ($is_trainee) {
                // Direct mapping: Trainee ID in Google Sheet -> trainee_id in LMS database
                $identifier = $this->find_field_value($row, ['trainee id', 'trainee_id', 'traineeid', 'id']);
            } else {
                // Direct mapping: emp ID in Google Sheet -> employee_id in LMS database
                $identifier = $this->find_field_value($row, ['emp id', 'empid', 'emp_id', 'employee id', 'employee_id', 'id']);
            }

            // Find Email
            $email = strtolower(trim($this->find_field_value($row, ['email', 'email address', 'corporate email', 'mail'])));

            // Basic validation
            if (empty($identifier) && empty($email)) {
                $skipped++;
                continue;
            }

            // If identifier is missing but email exists, synthesize identifier
            if (empty($identifier) && !empty($email)) {
                $identifier = ($is_trainee ? 'TRN' : 'REC') . strtoupper(substr(md5($email), 0, 6));
            }

            // Extract Name components
            $first_name = '';
            $last_name  = '';
            if ($is_trainee) {
                // Image specifies header: name
                $full_name = $this->find_field_value($row, ['name', 'full name', 'trainee name']);
            } else {
                // Image specifies header: Ceipal Name
                $full_name = $this->find_field_value($row, ['ceipal name', 'ceipal_name', 'ceipal', 'name', 'full name', 'employee name', 'recruiter name']);
            }

            if (!empty($full_name)) {
                $parts = explode(' ', trim($full_name), 2);
                $first_name = $parts[0];
                $last_name  = $parts[1] ?? '';
            } else {
                $first_name = $this->find_field_value($row, ['first name', 'first_name', 'firstname', 'first']);
                $last_name  = $this->find_field_value($row, ['last name', 'last_name', 'lastname', 'last']);
            }

            if (empty($first_name)) $first_name = 'User';
            if (empty($last_name)) $last_name = $identifier;

            // Extract Batch (required for trainees, null for recruiters)
            $batch = null;
            if ($is_trainee) {
                // Image specifies header: assigned batch
                $batch_raw = $this->find_field_value($row, ['assigned batch', 'assigned_batch', 'batch', 'batch name', 'batch code', 'training batch', 'batch_name']);
                $batch = !empty($batch_raw) ? trim($batch_raw) : 'General Trainees';
            }

            // Extract Department & Designation
            // Image specifies: Trainees have "department", Recruiters do not have department
            $department = $this->find_field_value($row, ['department', 'dept', 'stream']);
            if (empty($department)) {
                $department = $is_trainee ? 'Training & Development' : 'Talent Acquisition';
            }

            // Image specifies: Both Trainees and Recruiters use "role" header for designation
            $designation = $this->find_field_value($row, ['role', 'designation', 'title']);
            if (empty($designation)) {
                $designation = $is_trainee ? 'Graduate Trainee' : 'Recruiter';
            }

            // Extract Status
            $status_raw = strtolower(trim($this->find_field_value($row, ['status', 'account status', 'active'])));
            $status = in_array($status_raw, ['active', 'inactive', 'suspended'], true) ? $status_raw : 'active';

            // Check if user exists by trainee_id, employee_id, or email
            $this->db->group_start();
            if ($is_trainee) {
                $this->db->where('trainee_id', $identifier);
                $this->db->or_where('employee_id', $identifier);
            } else {
                $this->db->where('employee_id', $identifier);
            }
            if (!empty($email)) {
                $this->db->or_where('email', $email);
            }
            $this->db->group_end();
            $existing = $this->db->get('users')->row_array();

            if ($existing) {
                // Update existing user record
                $update_data = [
                    'first_name'     => $first_name,
                    'last_name'      => $last_name,
                    'learner_type'   => $learner_type,
                    'trainee_id'     => $is_trainee ? $identifier : null,
                    'employee_id'    => $identifier,
                    'department'     => $department,
                    'designation'    => $designation,
                    'status'         => $status,
                    'sync_source'    => 'google_sheet',
                    'last_synced_at' => $now,
                ];
                if ($is_trainee && !empty($batch)) {
                    $update_data['batch'] = $batch;
                }
                if (!empty($email) && $existing['email'] !== $email) {
                    // Check if new email is taken by another record
                    $email_check = $this->db->get_where('users', ['email' => $email, 'id !=' => $existing['id']])->row_array();
                    if (!$email_check) {
                        $update_data['email'] = $email;
                    }
                }

                $this->db->where('id', $existing['id'])->update('users', $update_data);
                $updated++;
            } else {
                // Insert new user
                if (empty($email)) {
                    $email = strtolower($identifier) . '@vdartinc.com';
                }

                // Ensure email uniqueness
                $email_check = $this->db->get_where('users', ['email' => $email])->row_array();
                if ($email_check) {
                    $email = strtolower($identifier) . '_' . rand(100, 999) . '@vdartinc.com';
                }

                $insert_data = [
                    'role_id'        => 3, // Learner
                    'learner_type'   => $learner_type,
                    'trainee_id'     => $is_trainee ? $identifier : null,
                    'employee_id'    => $identifier,
                    'first_name'     => $first_name,
                    'last_name'      => $last_name,
                    'email'          => $email,
                    'password_hash'  => $default_password_hash,
                    'department'     => $department,
                    'batch'          => $batch,
                    'designation'    => $designation,
                    'phone'          => null, // Explicitly null as phone is removed
                    'status'         => $status,
                    'sync_source'    => 'google_sheet',
                    'last_synced_at' => $now,
                    'is_first_login' => 1,
                    'created_at'     => $now,
                ];

                $this->db->insert('users', $insert_data);
                $created++;
            }
        }

        return [
            'processed_count' => count($rows),
            'created_count'   => $created,
            'updated_count'   => $updated,
            'skipped_count'   => $skipped,
        ];
    }

    /**
     * Helper to find value from row given possible field name aliases
     */
    private function find_field_value(array $row, array $aliases) {
        foreach ($aliases as $alias) {
            $norm_alias = strtolower(trim(preg_replace('/[^a-zA-Z0-9_ ]/', '', $alias)));
            if (isset($row[$norm_alias]) && trim($row[$norm_alias]) !== '') {
                return trim($row[$norm_alias]);
            }
            // Check substring match
            foreach ($row as $header => $val) {
                if (strpos($header, $norm_alias) !== false && trim($val) !== '') {
                    return trim($val);
                }
            }
        }
        return '';
    }
}
