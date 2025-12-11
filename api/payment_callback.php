<?php
/**
 * Paystack Payment Callback Handler
 * Handles webhook callbacks from Paystack
 * Cr8Kit - Ghana Creative Rentals Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

// Get database connection
$pdo = getDBConnection();

// Load Paystack configuration
require_once __DIR__ . '/../config/paystack.php';

// Verify webhook signature
$headers = getallheaders();
$signature = $headers['x-paystack-signature'] ?? '';

$payload = @file_get_contents("php://input");
$hash = hash_hmac('sha512', $payload, PAYSTACK_SECRET_KEY);

if ($hash !== $signature) {
    http_response_code(400);
    exit('Invalid signature');
}

$event = json_decode($payload, true);

if ($event['event'] === 'charge.success') {
    $data = $event['data'];
    $reference = $data['reference'];
    $metadata = $data['metadata'] ?? [];
    $bookingId = $metadata['booking_id'] ?? 0;
    
    if ($bookingId > 0 && $pdo) {
        try {
            $stmt = $pdo->prepare("
                UPDATE bookings 
                SET payment_status = 'paid', 
                    status = 'active',
                    payment_reference = ?
                WHERE booking_id = ? AND payment_status = 'pending'
            ");
            $stmt->execute([$reference, $bookingId]);
            
            // TODO: Send confirmation email/SMS to renter and owner
            // TODO: Update equipment availability
            
            http_response_code(200);
            echo json_encode(['status' => 'success']);
        } catch (PDOException $e) {
            error_log("Payment Callback Error: " . $e->getMessage());
            http_response_code(500);
        }
    }
}

http_response_code(200);

