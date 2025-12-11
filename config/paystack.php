<?php
/**
 * Paystack Configuration
 * Cr8Kit - Ghana Creative Rentals Platform
 * 
 * Get your keys from: https://dashboard.paystack.com/#/settings/developer
 */

// Test keys (for development)
define('PAYSTACK_SECRET_KEY', 'sk_test_YOUR_PAYSTACK_SECRET_KEY');
define('PAYSTACK_PUBLIC_KEY', 'pk_test_YOUR_PAYSTACK_PUBLIC_KEY');

// Production keys (uncomment when ready for production)
// define('PAYSTACK_SECRET_KEY', 'sk_live_YOUR_PAYSTACK_SECRET_KEY');
// define('PAYSTACK_PUBLIC_KEY', 'pk_live_YOUR_PAYSTACK_PUBLIC_KEY');

// Paystack API endpoints
define('PAYSTACK_INITIALIZE_URL', 'https://api.paystack.co/transaction/initialize');
define('PAYSTACK_VERIFY_URL', 'https://api.paystack.co/transaction/verify/');
define('PAYSTACK_CALLBACK_URL', 'http://localhost:8000/api/payment_callback.php'); // Update with your domain

