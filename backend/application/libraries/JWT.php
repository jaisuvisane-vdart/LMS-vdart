<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Enterprise JSON Web Token (JWT) Library
 * Implements HMAC-SHA256 stateless token encoding, decoding, and verification
 */
class JWT {

    private $secret_key;
    private $algo;

    public function __construct() {
        $ci =& get_instance();
        $this->secret_key = $ci->config->item('encryption_key') ?: 'LMS_Enterprise_Default_Secret_2026';
        $this->algo = 'HS256';
    }

    /**
     * Encode payload to JWT token
     * @param array $payload
     * @param int $expiry_seconds Default 86400 (24 hours)
     * @return string
     */
    public function encode(array $payload, $expiry_seconds = 86400) {
        $header = [
            'typ' => 'JWT',
            'alg' => $this->algo
        ];

        $issued_at = time();
        $payload['iat'] = $issued_at;
        $payload['exp'] = $issued_at + $expiry_seconds;

        $encoded_header = $this->base64UrlEncode(json_encode($header));
        $encoded_payload = $this->base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "{$encoded_header}.{$encoded_payload}", $this->secret_key, true);
        $encoded_signature = $this->base64UrlEncode($signature);

        return "{$encoded_header}.{$encoded_payload}.{$encoded_signature}";
    }

    /**
     * Decode and verify JWT token
     * @param string $token
     * @return array|false Returns decoded payload or FALSE on error/expiry
     */
    public function decode($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }

        list($encoded_header, $encoded_payload, $encoded_signature) = $parts;

        $header = json_decode($this->base64UrlDecode($encoded_header), true);
        $payload = json_decode($this->base64UrlDecode($encoded_payload), true);

        if (!$header || !$payload) {
            return false;
        }

        // Verify signature
        $expected_signature = $this->base64UrlEncode(
            hash_hmac('sha256', "{$encoded_header}.{$encoded_payload}", $this->secret_key, true)
        );

        if (!hash_equals($expected_signature, $encoded_signature)) {
            return false;
        }

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }

        return $payload;
    }

    private function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
    }
}
