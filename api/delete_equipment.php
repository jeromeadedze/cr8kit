<?php
/**
 * Delete Equipment Listing API
 * Allows owners to delete their equipment listings
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

// Only allow POST/DELETE requests
if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'])) {
    sendJSONResponse(false, 'Invalid request method', [], 405);
}

// Get database connection
$pdo = getDBConnection();
if (!$pdo) {
    sendJSONResponse(false, 'Database connection failed', [], 500);
}

// Get current user
$userId = getCurrentUserId();

// Get equipment ID
$equipmentId = isset($_POST['equipment_id']) ? intval($_POST['equipment_id']) : 
               (isset($_GET['id']) ? intval($_GET['id']) : 0);

if ($equipmentId <= 0) {
    sendJSONResponse(false, 'Invalid equipment ID', [], 400);
}

// Verify ownership and check for active bookings
try {
    $stmt = $pdo->prepare("SELECT owner_id FROM equipment WHERE equipment_id = ?");
    $stmt->execute([$equipmentId]);
    $equipment = $stmt->fetch();
    
    if (!$equipment) {
        sendJSONResponse(false, 'Equipment not found', [], 404);
    }
    
    if ($equipment['owner_id'] != $userId) {
        sendJSONResponse(false, 'You can only delete your own equipment listings', [], 403);
    }
    
    // Check for active bookings
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE equipment_id = ? 
        AND status IN ('pending', 'approved', 'active')
    ");
    $stmt->execute([$equipmentId]);
    $activeBookings = $stmt->fetch()['count'];
    
    if ($activeBookings > 0) {
        sendJSONResponse(false, 'Cannot delete equipment with active bookings. Please cancel all bookings first.', [], 400);
    }
    
    // Delete equipment (cascade will handle related records)
    $stmt = $pdo->prepare("DELETE FROM equipment WHERE equipment_id = ?");
    $stmt->execute([$equipmentId]);
    
    sendJSONResponse(true, 'Equipment deleted successfully', [], 200);
    
} catch (PDOException $e) {
    error_log("Delete Equipment Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while deleting the equipment', [], 500);
}

