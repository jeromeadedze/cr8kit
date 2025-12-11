<?php
/**
 * Create Booking Request API
 * Allows renters to create booking requests for equipment
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

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

// Only renters can create bookings
if ($userRole !== 'renter') {
    sendJSONResponse(false, 'Only renters can create bookings', [], 403);
}

// Get and sanitize input data
$equipmentId = isset($_POST['equipment_id']) ? intval($_POST['equipment_id']) : 0;
$startDate = isset($_POST['start_date']) ? sanitizeInput($_POST['start_date']) : '';
$endDate = isset($_POST['end_date']) ? sanitizeInput($_POST['end_date']) : '';

// Validation
$errors = [];

if ($equipmentId <= 0) {
    $errors['equipment_id'] = 'Invalid equipment ID';
}

if (empty($startDate)) {
    $errors['start_date'] = 'Start date is required';
} else if (!strtotime($startDate)) {
    $errors['start_date'] = 'Invalid start date format';
}

if (empty($endDate)) {
    $errors['end_date'] = 'End date is required';
} else if (!strtotime($endDate)) {
    $errors['end_date'] = 'Invalid end date format';
}

if (!empty($startDate) && !empty($endDate) && strtotime($startDate) >= strtotime($endDate)) {
    $errors['dates'] = 'End date must be after start date';
}

if (!empty($startDate) && strtotime($startDate) < strtotime('today')) {
    $errors['start_date'] = 'Start date cannot be in the past';
}

if (!empty($errors)) {
    sendJSONResponse(false, 'Validation failed', ['errors' => $errors], 400);
}

try {
    // Get equipment details
    $stmt = $pdo->prepare("
        SELECT e.*, u.user_id as owner_id, u.full_name as owner_name
        FROM equipment e
        INNER JOIN users u ON e.owner_id = u.user_id
        WHERE e.equipment_id = ?
    ");
    $stmt->execute([$equipmentId]);
    $equipment = $stmt->fetch();
    
    if (!$equipment) {
        sendJSONResponse(false, 'Equipment not found', [], 404);
    }
    
    if (!$equipment['is_available']) {
        sendJSONResponse(false, 'This equipment is currently not available', [], 400);
    }
    
    // Check for date conflicts with existing bookings
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM bookings
        WHERE equipment_id = ?
        AND status IN ('pending', 'approved', 'active')
        AND (
            (start_date <= ? AND end_date >= ?)
            OR (start_date <= ? AND end_date >= ?)
            OR (start_date >= ? AND end_date <= ?)
        )
    ");
    $stmt->execute([$equipmentId, $startDate, $startDate, $endDate, $endDate, $startDate, $endDate]);
    $conflicts = $stmt->fetch()['count'];
    
    if ($conflicts > 0) {
        sendJSONResponse(false, 'This equipment is already booked for the selected dates', [], 400);
    }
    
    // Calculate total days and amount
    $start = new DateTime($startDate);
    $end = new DateTime($endDate);
    $totalDays = $start->diff($end)->days + 1; // Include both start and end days
    $totalAmount = $equipment['price_per_day'] * $totalDays;
    
    // Generate unique booking number
    $bookingNumber = 'BK' . date('Ymd') . strtoupper(substr(uniqid(), -6));
    
    // Check if booking number already exists (very unlikely, but just in case)
    $stmt = $pdo->prepare("SELECT booking_id FROM bookings WHERE booking_number = ?");
    $stmt->execute([$bookingNumber]);
    if ($stmt->fetch()) {
        $bookingNumber = 'BK' . date('Ymd') . strtoupper(substr(uniqid(), -8));
    }
    
    // Create booking
    $stmt = $pdo->prepare("
        INSERT INTO bookings (
            renter_id, equipment_id, owner_id, booking_number,
            start_date, end_date, total_days, price_per_day, total_amount,
            status, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
    ");
    
    $stmt->execute([
        $userId,
        $equipmentId,
        $equipment['owner_id'],
        $bookingNumber,
        $startDate,
        $endDate,
        $totalDays,
        $equipment['price_per_day'],
        $totalAmount
    ]);
    
    $bookingId = $pdo->lastInsertId();
    
    // Get created booking with details
    $stmt = $pdo->prepare("
        SELECT b.*, e.name as equipment_name, e.image_url,
               u.full_name as owner_name, u.email as owner_email
        FROM bookings b
        INNER JOIN equipment e ON b.equipment_id = e.equipment_id
        INNER JOIN users u ON b.owner_id = u.user_id
        WHERE b.booking_id = ?
    ");
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch();
    
    sendJSONResponse(true, 'Booking request created successfully. Waiting for owner approval.', [
        'booking' => $booking
    ], 201);
    
} catch (PDOException $e) {
    error_log("Create Booking Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while creating the booking', [], 500);
}

