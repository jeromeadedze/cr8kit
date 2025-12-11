<?php
/**
 * Get Owner Dashboard Data API
 * Returns statistics and data for owner dashboard
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

// Get current user
$userId = getCurrentUserId();
$userRole = $_SESSION['user_role'] ?? 'renter';

// Only owners can access this
if ($userRole !== 'owner') {
    sendJSONResponse(false, 'Only owners can access dashboard data', [], 403);
}

try {
    // Get total earnings (paid bookings)
    $stmt = $pdo->prepare("
        SELECT 
            COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_earned,
            COALESCE(SUM(CASE WHEN payment_status = 'pending' AND status = 'approved' THEN total_amount ELSE 0 END), 0) as pending_payout
        FROM bookings
        WHERE owner_id = ?
    ");
    $stmt->execute([$userId]);
    $earnings = $stmt->fetch();
    
    // Get active listings count
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM equipment
        WHERE owner_id = ? AND is_available = 1
    ");
    $stmt->execute([$userId]);
    $activeListings = $stmt->fetch()['count'];
    
    // Get total listings
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM equipment
        WHERE owner_id = ?
    ");
    $stmt->execute([$userId]);
    $totalListings = $stmt->fetch()['count'];
    
    // Get recent bookings
    $stmt = $pdo->prepare("
        SELECT 
            b.booking_id,
            b.booking_number,
            b.status,
            b.payment_status,
            b.total_amount,
            b.start_date,
            b.end_date,
            e.name as equipment_name,
            e.image_url,
            u.full_name as renter_name
        FROM bookings b
        INNER JOIN equipment e ON b.equipment_id = e.equipment_id
        INNER JOIN users u ON b.renter_id = u.user_id
        WHERE b.owner_id = ?
        ORDER BY b.created_at DESC
        LIMIT 10
    ");
    $stmt->execute([$userId]);
    $recentBookings = $stmt->fetchAll();
    
    // Get booking statistics
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_bookings,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bookings,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings
        FROM bookings
        WHERE owner_id = ?
    ");
    $stmt->execute([$userId]);
    $bookingStats = $stmt->fetch();
    
    // Get equipment utilization (most rented)
    $stmt = $pdo->prepare("
        SELECT 
            e.equipment_id,
            e.name,
            e.category,
            e.image_url,
            COUNT(b.booking_id) as rental_count,
            COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) as revenue
        FROM equipment e
        LEFT JOIN bookings b ON e.equipment_id = b.equipment_id
        WHERE e.owner_id = ?
        GROUP BY e.equipment_id, e.name, e.category, e.image_url
        ORDER BY rental_count DESC, revenue DESC
        LIMIT 5
    ");
    $stmt->execute([$userId]);
    $topEquipment = $stmt->fetchAll();
    
    sendJSONResponse(true, 'Dashboard data retrieved successfully', [
        'earnings' => [
            'total_earned' => floatval($earnings['total_earned']),
            'pending_payout' => floatval($earnings['pending_payout'])
        ],
        'listings' => [
            'active' => intval($activeListings),
            'total' => intval($totalListings)
        ],
        'bookings' => [
            'pending' => intval($bookingStats['pending_bookings']),
            'approved' => intval($bookingStats['approved_bookings']),
            'active' => intval($bookingStats['active_bookings']),
            'completed' => intval($bookingStats['completed_bookings'])
        ],
        'recent_bookings' => $recentBookings,
        'top_equipment' => $topEquipment
    ], 200);
    
} catch (PDOException $e) {
    error_log("Get Owner Dashboard Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while fetching dashboard data', [], 500);
}

