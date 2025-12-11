<?php
/**
 * Get Bookings API
 * Returns user's bookings (as renter or owner)
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

try {
    $userId = getCurrentUserId();
    $filter = isset($_GET['filter']) ? sanitizeInput($_GET['filter']) : 'all';
    $role = $_SESSION['user_role'] ?? 'renter';
    
    // Determine which column to filter by based on role
    $userColumn = ($role === 'owner') ? 'owner_id' : 'renter_id';
    
    // Build query
    $sql = "
        SELECT 
            b.booking_id,
            b.booking_number,
            b.start_date,
            b.end_date,
            b.total_days,
            b.price_per_day,
            b.total_amount,
            b.status,
            b.payment_status,
            b.payment_reference,
            b.created_at,
            b.updated_at,
            e.equipment_id,
            e.name as equipment_name,
            e.category,
            e.image_url,
            u.user_id as other_user_id,
            u.full_name as other_user_name,
            u.email as other_user_email,
            u.phone_number as other_user_phone
        FROM bookings b
        INNER JOIN equipment e ON b.equipment_id = e.equipment_id
        INNER JOIN users u ON b." . ($role === 'owner' ? 'renter_id' : 'owner_id') . " = u.user_id
        WHERE b.$userColumn = ?
    ";
    
    $params = [$userId];
    
    // Apply status filter
    if ($filter !== 'all' && in_array($filter, ['pending', 'approved', 'active', 'completed', 'cancelled'])) {
        $sql .= " AND b.status = ?";
        $params[] = $filter;
    }
    
    $sql .= " ORDER BY b.created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bookings = $stmt->fetchAll();
    
    // Format response
    $formattedBookings = array_map(function($booking) use ($role) {
        return [
            'id' => intval($booking['booking_id']),
            'booking_number' => $booking['booking_number'],
            'equipment' => [
                'id' => intval($booking['equipment_id']),
                'name' => $booking['equipment_name'],
                'category' => $booking['category'],
                'image_url' => $booking['image_url']
            ],
            'other_user' => [
                'id' => intval($booking['other_user_id']),
                'name' => $booking['other_user_name'],
                'email' => $booking['other_user_email'],
                'phone' => $booking['other_user_phone']
            ],
            'dates' => [
                'start' => $booking['start_date'],
                'end' => $booking['end_date'],
                'total_days' => intval($booking['total_days'])
            ],
            'pricing' => [
                'price_per_day' => floatval($booking['price_per_day']),
                'total_amount' => floatval($booking['total_amount'])
            ],
            'status' => $booking['status'],
            'payment_status' => $booking['payment_status'],
            'payment_reference' => $booking['payment_reference'],
            'created_at' => $booking['created_at'],
            'role' => $role
        ];
    }, $bookings);
    
    // Get statistics
    $statsSql = "
        SELECT 
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_rentals,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
            COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_spent
        FROM bookings 
        WHERE $userColumn = ?
    ";
    $stmt = $pdo->prepare($statsSql);
    $stmt->execute([$userId]);
    $stats = $stmt->fetch();
    
    sendJSONResponse(true, 'Bookings retrieved successfully', [
        'bookings' => $formattedBookings,
        'stats' => [
            'active_rentals' => intval($stats['active_rentals']),
            'pending_requests' => intval($stats['pending_requests']),
            'total_spent' => floatval($stats['total_spent'])
        ]
    ], 200);
    
} catch (PDOException $e) {
    error_log("Get Bookings Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while fetching bookings', [], 500);
}

