<?php
/**
 * Update Booking Status API
 * Allows owners to approve/reject bookings, and renters/owners to cancel
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

// Only allow POST/PUT requests
if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT'])) {
    sendJSONResponse(false, 'Invalid request method', [], 405);
}

// Get database connection
$pdo = getDBConnection();
if (!$pdo) {
    sendJSONResponse(false, 'Database connection failed', [], 500);
}

// Get current user
$userId = getCurrentUserId();
$userRole = $_SESSION['user_role'] ?? 'renter';

// Get input
$bookingId = isset($_POST['booking_id']) ? intval($_POST['booking_id']) : 0;
$status = isset($_POST['status']) ? sanitizeInput($_POST['status']) : '';
$reason = isset($_POST['reason']) ? sanitizeInput($_POST['reason']) : '';

// Validation
$validStatuses = ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'];
if ($bookingId <= 0) {
    sendJSONResponse(false, 'Invalid booking ID', [], 400);
}

if (!in_array($status, $validStatuses)) {
    sendJSONResponse(false, 'Invalid status', [], 400);
}

try {
    // Get booking details
    $stmt = $pdo->prepare("
        SELECT b.*, e.name as equipment_name
        FROM bookings b
        INNER JOIN equipment e ON b.equipment_id = e.equipment_id
        WHERE b.booking_id = ?
    ");
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch();
    
    if (!$booking) {
        sendJSONResponse(false, 'Booking not found', [], 404);
    }
    
    // Check permissions
    $canApprove = ($userRole === 'owner' && $booking['owner_id'] == $userId);
    $canCancel = ($booking['renter_id'] == $userId || $booking['owner_id'] == $userId);
    
    // Status transition rules
    $currentStatus = $booking['status'];
    $allowedTransitions = [
        'pending' => ['approved', 'rejected', 'cancelled'],
        'approved' => ['active', 'cancelled'],
        'active' => ['completed', 'cancelled'],
        'rejected' => [],
        'completed' => [],
        'cancelled' => []
    ];
    
    if (!in_array($status, $allowedTransitions[$currentStatus] ?? [])) {
        sendJSONResponse(false, "Cannot change status from $currentStatus to $status", [], 400);
    }
    
    // Permission checks for specific actions
    if ($status === 'approved' && !$canApprove) {
        sendJSONResponse(false, 'Only the equipment owner can approve bookings', [], 403);
    }
    
    if ($status === 'cancelled' && !$canCancel) {
        sendJSONResponse(false, 'You do not have permission to cancel this booking', [], 403);
    }
    
    // Update booking status
    $stmt = $pdo->prepare("
        UPDATE bookings 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = ?
    ");
    $stmt->execute([$status, $bookingId]);
    
    // If approved, mark equipment as unavailable for those dates
    if ($status === 'approved') {
        // Equipment availability is handled by checking booking conflicts
        // We don't mark equipment as unavailable globally, just check dates
    }
    
    // If cancelled and payment was made, mark for refund
    if ($status === 'cancelled' && $booking['payment_status'] === 'paid') {
        $stmt = $pdo->prepare("
            UPDATE bookings 
            SET payment_status = 'refunded'
            WHERE booking_id = ?
        ");
        $stmt->execute([$bookingId]);
    }
    
    // Get updated booking
    $stmt = $pdo->prepare("
        SELECT b.*, e.name as equipment_name,
               u1.full_name as renter_name, u2.full_name as owner_name
        FROM bookings b
        INNER JOIN equipment e ON b.equipment_id = e.equipment_id
        INNER JOIN users u1 ON b.renter_id = u1.user_id
        INNER JOIN users u2 ON b.owner_id = u2.user_id
        WHERE b.booking_id = ?
    ");
    $stmt->execute([$bookingId]);
    $updatedBooking = $stmt->fetch();
    
    $message = "Booking status updated to $status";
    if ($status === 'approved') {
        $message = "Booking approved! Renter can now proceed with payment.";
    } else if ($status === 'rejected') {
        $message = "Booking request rejected.";
    } else if ($status === 'cancelled') {
        $message = "Booking cancelled.";
    }
    
    sendJSONResponse(true, $message, [
        'booking' => $updatedBooking
    ], 200);
    
} catch (PDOException $e) {
    error_log("Update Booking Status Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while updating booking status', [], 500);
}

