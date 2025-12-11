<?php
/**
 * Authentication Check Helper
 * Redirects to login page if user is not authenticated
 * Cr8Kit - Ghana Creative Rentals Platform
 */

require_once __DIR__ . '/functions.php';

// Start session and check if user is logged in
startSecureSession();

if (!isLoggedIn()) {
    // User is not logged in, redirect to login page
    header('Location: /index.html');
    exit;
}

// Optional: Check if session has expired
if (isset($_SESSION['expires_at']) && time() > $_SESSION['expires_at']) {
    // Session expired, logout and redirect
    logout();
    header('Location: /index.html?expired=1');
    exit;
}

