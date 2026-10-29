<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
|--------------------------------------------------------------------------
| Google Sheets Integration Configuration
|--------------------------------------------------------------------------
| Configure your Google Spreadsheet credentials below.
| This file is managed directly in the codebase and cannot be modified by users via the website UI.
|
| - spreadsheet_id: The ID of your Google Sheet from its URL (between /d/ and /edit)
| - trainees_tab: The exact tab name containing Trainees roster
| - recruiters_tab: The exact tab name containing Recruiters roster
| - webhook_secret: Optional secret token for Google Apps Script webhook calls
|
*/
$config['google_sheets'] = [
    // Google Spreadsheet ID (or define GOOGLE_SHEET_SPREADSHEET_ID in your .env file)
    'spreadsheet_id' => getenv('GOOGLE_SHEET_SPREADSHEET_ID') ?: '1rhcTmXua0gHI_ufFGnrZEwP18ya62yczXtqvxHw7PG4',

    // Exact sheet tab name for Trainees
    'trainees_tab'   => getenv('GOOGLE_SHEET_TRAINEES_TAB') ?: 'L&D Trainees Sheet',

    // Exact sheet tab name for Recruiters (matches sheet title with double space)
    'recruiters_tab' => getenv('GOOGLE_SHEET_RECRUITERS_TAB') ?: 'Recruiter  Sheet',

    // Path to Google Cloud Service Account JSON key file
    'service_account_key_file' => getenv('GOOGLE_SERVICE_ACCOUNT_KEY_FILE') ?: APPPATH . 'config/google_service_account.json',

    // Security secret for real-time Webhook calls
    'webhook_secret' => getenv('GOOGLE_SHEET_WEBHOOK_SECRET') ?: 'lms_gsheet_secure_sync_key',
];
