<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Enterprise Email Notification & OTP Dispatch Service
 * Handles transactional email delivery for first-time login verification and password resets
 */
class Email_service {

    protected $ci;

    public function __construct() {
        $this->ci =& get_instance();
        $this->ci->load->library('email');

        // Load configuration if present
        if (file_exists(APPPATH . 'config/email.php')) {
            $this->ci->config->load('email', TRUE, TRUE);
            $email_cfg = $this->ci->config->item('email');
            if (!empty($email_cfg) && is_array($email_cfg)) {
                $this->ci->email->initialize($email_cfg);
            }
        }
    }

    /**
     * Dispatch 6-digit OTP verification email
     * @param string $to_email
     * @param string $first_name
     * @param string $otp_code
     * @return array ['sent' => bool, 'error' => string|null]
     */
    public function send_otp_email($to_email, $first_name, $otp_code) {
        $subject = 'Your 6-Digit Verification Code - VDart-Learning Account Activation';
        $html_body = $this->build_otp_email_template($first_name, $otp_code);

        // Always log OTP for development and audit verification
        $log_message = sprintf(
            "[%s] OTP Generated for %s (%s): %s\n",
            date('Y-m-d H:i:s'),
            $to_email,
            $first_name,
            $otp_code
        );
        $log_path = APPPATH . 'logs/otp_log.txt';
        @file_put_contents($log_path, $log_message, FILE_APPEND);

        // Resolve sender address from config
        $from_email = $this->ci->config->item('smtp_from_email');
        if (empty($from_email)) {
            $from_email = $this->ci->config->item('smtp_user');
        }
        if (empty($from_email)) {
            $from_email = 'no-reply@vdartinc.com';
        }

        $from_name = $this->ci->config->item('smtp_from_name');
        if (empty($from_name)) {
            $from_name = 'VDart-Learning Portal';
        }

        $sent = false;
        $error_message = null;

        try {
            $this->ci->email->clear(TRUE);
            $this->ci->email->set_mailtype('html');
            $this->ci->email->from($from_email, $from_name);
            $this->ci->email->to($to_email);
            $this->ci->email->subject($subject);
            $this->ci->email->message($html_body);

            // Passing FALSE prevents parameters from being cleared so debugger can read SMTP response
            $sent = $this->ci->email->send(FALSE);

            if (!$sent) {
                $error_message = $this->ci->email->print_debugger(['headers', 'subject']);
                $error_log_path = APPPATH . 'logs/email_errors.log';
                $clean_error = strip_tags($error_message);
                $log_entry = sprintf(
                    "[%s] Delivery failed to %s:\n%s\n----------------------------------------\n",
                    date('Y-m-d H:i:s'),
                    $to_email,
                    $clean_error
                );
                @file_put_contents($error_log_path, $log_entry, FILE_APPEND);
            }
        } catch (Exception $e) {
            $error_message = $e->getMessage();
            $error_log_path = APPPATH . 'logs/email_errors.log';
            @file_put_contents($error_log_path, sprintf("[%s] Exception: %s\n", date('Y-m-d H:i:s'), $error_message), FILE_APPEND);
        }

        return [
            'sent'  => (bool)$sent,
            'error' => $error_message
        ];
    }

    /**
     * Build responsive HTML email body
     * @param string $first_name
     * @param string $otp_code
     * @return string
     */
    private function build_otp_email_template($first_name, $otp_code) {
        $name = htmlspecialchars($first_name ?: 'Colleague');
        $otp = htmlspecialchars($otp_code);

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Account Verification Code</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F3F6FB; margin: 0; padding: 24px; color: #172B4D;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(44, 81, 162, 0.06);">
        <tr>
            <td style="background-color: #1E3B78; padding: 24px 32px; text-align: left;">
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #93C5FD; display: block; margin-bottom: 4px;">Corporate Security</span>
                <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">VDart-Learning Portal</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px;">
                <h2 style="font-size: 18px; color: #172B4D; margin: 0 0 12px 0;">Hello {$name},</h2>
                <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin: 0 0 24px 0;">
                    You are signing in to your corporate learning account for the first time. Please use the following 6-digit verification code to activate your account and establish your new personal password.
                </p>
                <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
                    <span style="display: block; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Your 6-Digit Activation Code</span>
                    <span style="display: inline-block; font-size: 32px; font-weight: 800; color: #2C51A2; letter-spacing: 8px; font-family: 'Consolas', 'Courier New', monospace;">{$otp}</span>
                </div>
                <p style="font-size: 12px; line-height: 1.5; color: #64748B; margin: 0 0 16px 0;">
                    This verification code is valid for <strong>10 minutes</strong>. After verifying this code, you will be redirected to choose a new, permanent password for all future logins.
                </p>
                <p style="font-size: 11px; color: #94A3B8; margin: 0; border-top: 1px solid #E2E8F0; padding-top: 16px;">
                    If you did not initiate this activation attempt, please notify Platform Governance immediately.
                </p>
            </td>
        </tr>
        <tr>
            <td style="background-color: #F8FAFC; padding: 16px 32px; text-align: center; border-top: 1px solid #E2E8F0;">
                <span style="font-size: 11px; color: #94A3B8;">&copy; 2026 VDart Inc. Enterprise Knowledge & Learning Management System.</span>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
}
