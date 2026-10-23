<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
| -------------------------------------------------------------------------
| Enterprise Email & SMTP Configuration
| -------------------------------------------------------------------------
| This file configures outgoing transactional emails (OTPs, password resets,
| enrollment alerts). CodeIgniter's Email library automatically loads this file.
|
| -------------------------------------------------------------------------
| INSTRUCTIONS TO SEND REAL EMAILS:
| -------------------------------------------------------------------------
| By default on local XAMPP/Windows, PHP cannot send external emails without
| an authenticated SMTP server. To enable real email delivery to inboxes:
|
| OPTION 1: GOOGLE / GMAIL (RECOMMENDED FOR QUICK SETUP & TESTING)
| 1. Enable 2-Step Verification on your Google account:
|    https://myaccount.google.com/security
| 2. Generate a 16-character App Password:
|    https://myaccount.google.com/apppasswords
|    (Select 'Mail' and 'Windows Computer', or custom name 'LMS Portal')
| 3. Set the values below:
|    $config['smtp_host'] = 'smtp.gmail.com';
|    $config['smtp_port'] = 587;
|    $config['smtp_crypto'] = 'tls';
|    $config['smtp_user'] = 'your_email@gmail.com'; // or corporate workspace email
|    $config['smtp_pass'] = 'abcd efgh ijkl mnop';   // 16-character App Password
|    $config['smtp_from_email'] = 'your_email@gmail.com';
|
| OPTION 2: MICROSOFT 365 / OUTLOOK
|    $config['smtp_host'] = 'smtp.office365.com';
|    $config['smtp_port'] = 587;
|    $config['smtp_crypto'] = 'tls';
|    $config['smtp_user'] = 'your_corporate_email@vdartinc.com';
|    $config['smtp_pass'] = 'your_password_or_app_password';
|
| OPTION 3: MAILTRAP / LOCAL SMTP RELAY (SAFE INBOX TESTING)
|    $config['smtp_host'] = 'sandbox.smtp.mailtrap.io';
|    $config['smtp_port'] = 2525;
|    $config['smtp_crypto'] = 'tls';
|    $config['smtp_user'] = 'your_mailtrap_user';
|    $config['smtp_pass'] = 'your_mailtrap_pass';
| -------------------------------------------------------------------------
*/

$config['protocol']     = 'smtp';
$config['smtp_host']    = 'smtp.gmail.com';
$config['smtp_port']    = 587;
$config['smtp_crypto']  = 'tls';

// Provide your actual email and app password here:
$config['smtp_user']    = 'jaisuvisane.j@vdartinc.com'; 
$config['smtp_pass']    = 'stgz kqxs psuw cjfu'; 

$config['smtp_timeout'] = 15;
$config['mailtype']     = 'html';
$config['charset']      = 'utf-8';
$config['wordwrap']     = TRUE;
$config['validate']     = FALSE;
$config['priority']     = 1;
$config['newline']      = "\r\n";
$config['crlf']         = "\r\n";

// Display name and sender address
$config['smtp_from_email'] = ''; // If blank, system will use smtp_user or fallback
$config['smtp_from_name']  = 'VDart-Learning Portal';
