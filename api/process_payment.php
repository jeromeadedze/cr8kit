<?php
/**
 * Process Payment API
 * Handles Paystack payment processing for bookings
 * Cr8Kit - Ghana Creative Rentals Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

// Set content type to JSON
header('Content-Type: application/json');

// Check authentication
startSecureSession();
if (!isLoggedIn()) {
    sendJSONResponse(false, 'Authentication required', [], 401);
}

// Get database connection
$pdo = getDBConnection();
if (!$pdo) {
    sendJSONResponse(false, 'Database connection failed', [], 500);
}

// Load Paystack configuration
require_once __DIR__ . '/../config/paystack.php';

/**
 * Initialize Paystack payment
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'initialize') {
    $bookingId = isset($_POST['booking_id']) ? intval($_POST['booking_id']) : 0;
    
    if ($bookingId <= 0) {
        sendJSONResponse(false, 'Invalid booking ID', [], 400);
    }
    
    try {
        // Get booking details
        $stmt = $pdo->prepare("
            SELECT b.*, e.name as equipment_name, u.email as renter_email, u.full_name as renter_name
            FROM bookings b
            INNER JOIN equipment e ON b.equipment_id = e.equipment_id
            INNER JOIN users u ON b.renter_id = u.user_id
            WHERE b.booking_id = ? AND b.renter_id = ?
        ");
        $stmt->execute([$bookingId, getCurrentUserId()]);
        $booking = $stmt->fetch();
        
        if (!$booking) {
            sendJSONResponse(false, 'Booking not found or access denied', [], 404);
        }
        
        if ($booking['status'] !== 'approved') {
            sendJSONResponse(false, 'Booking must be approved before payment', [], 400);
        }
        
        if ($booking['payment_status'] === 'paid') {
            sendJSONResponse(false, 'Booking is already paid', [], 400);
        }
        
        // Prepare Paystack payment data
        $amount = $booking['total_amount'] * 100; // Convert to kobo (Paystack uses smallest currency unit)
        $email = $booking['renter_email'];
        $reference = 'CR8KIT_' . $booking['booking_number'] . '_' . time();
        
        // Initialize Paystack payment
        $url = "https://api.paystack.co/transaction/initialize";
        $fields = [
            'email' => $email,
            'amount' => $amount,
            'reference' => $reference,
            'callback_url' => 'http://localhost:8000/api/payment_callback.php',
            'metadata' => [
                'booking_id' => $bookingId,
                'booking_number' => $booking['booking_number'],
                'equipment_name' => $booking['equipment_name']
            ]
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fields));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer " . PAYSTACK_SECRET_KEY,
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        
        if ($err) {
            sendJSONResponse(false, 'Payment initialization failed: ' . $err, [], 500);
        }
        
        $result = json_decode($response, true);
        
        if ($result['status'] === true) {
            // Update booking with payment reference
            $stmt = $pdo->prepare("
                UPDATE bookings 
                SET payment_reference = ?
                WHERE booking_id = ?
            ");
            $stmt->execute([$reference, $bookingId]);
            
            sendJSONResponse(true, 'Payment initialized successfully', [
                'authorization_url' => $result['data']['authorization_url'],
                'access_code' => $result['data']['access_code'],
                'reference' => $reference
            ], 200);
        } else {
            sendJSONResponse(false, 'Payment initialization failed: ' . ($result['message'] ?? 'Unknown error'), [], 400);
        }
        
    } catch (PDOException $e) {
        error_log("Payment Init Error: " . $e->getMessage());
        sendJSONResponse(false, 'An error occurred while initializing payment', [], 500);
    }
}

/**
 * Verify Paystack payment
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'verify') {
    $reference = isset($_POST['reference']) ? sanitizeInput($_POST['reference']) : '';
    
    if (empty($reference)) {
        sendJSONResponse(false, 'Payment reference is required', [], 400);
    }
    
    try {
        // Verify with Paystack
        $url = "https://api.paystack.co/transaction/verify/" . $reference;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer " . PAYSTACK_SECRET_KEY
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        $result = json_decode($response, true);
        
        if ($result['status'] === true && $result['data']['status'] === 'success') {
            // Payment successful, update booking
            $metadata = $result['data']['metadata'] ?? [];
            $bookingId = $metadata['booking_id'] ?? 0;
            
            if ($bookingId > 0) {
                $stmt = $pdo->prepare("
                    UPDATE bookings 
                    SET payment_status = 'paid', 
                        status = 'active',
                        payment_reference = ?
                    WHERE booking_id = ?
                ");
                $stmt->execute([$reference, $bookingId]);
                
                sendJSONResponse(true, 'Payment verified and booking confirmed', [
                    'booking_id' => $bookingId,
                    'payment_status' => 'paid'
                ], 200);
            } else {
                sendJSONResponse(false, 'Invalid booking ID in payment metadata', [], 400);
            }
        } else {
            sendJSONResponse(false, 'Payment verification failed', [], 400);
        }
        
    } catch (PDOException $e) {
        error_log("Payment Verify Error: " . $e->getMessage());
        sendJSONResponse(false, 'An error occurred while verifying payment', [], 500);
    }
}

sendJSONResponse(false, 'Invalid action', [], 400);

