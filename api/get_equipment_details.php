<?php
/**
 * Get Equipment Details API
 * Returns detailed information about a specific equipment item
 * Cr8Kit - Ghana Creative Rentals Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

// Set content type to JSON
header('Content-Type: application/json');

// Get database connection
$pdo = getDBConnection();
if (!$pdo) {
    sendJSONResponse(false, 'Database connection failed', [], 500);
}

// Get equipment ID from query parameter
$equipmentId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($equipmentId <= 0) {
    sendJSONResponse(false, 'Invalid equipment ID', [], 400);
}

try {
    // Get equipment details with owner info
    $stmt = $pdo->prepare("
        SELECT 
            e.equipment_id,
            e.name,
            e.category,
            e.description,
            e.price_per_day,
            e.location,
            e.city,
            e.rating,
            e.total_rentals,
            e.is_verified,
            e.is_available,
            e.created_at,
            e.updated_at,
            u.user_id as owner_id,
            u.full_name as owner_name,
            u.email as owner_email,
            u.phone_number as owner_phone,
            u.is_verified as owner_verified
        FROM equipment e
        INNER JOIN users u ON e.owner_id = u.user_id
        WHERE e.equipment_id = ?
    ");
    
    $stmt->execute([$equipmentId]);
    $equipment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$equipment) {
        sendJSONResponse(false, 'Equipment not found', [], 404);
    }
    
    // Get all images for this equipment
    $imageStmt = $pdo->prepare("
        SELECT image_id, image_url, is_primary
        FROM equipment_images
        WHERE equipment_id = ?
        ORDER BY is_primary DESC, created_at ASC
    ");
    $imageStmt->execute([$equipmentId]);
    $images = $imageStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get ratings/reviews for this equipment
    $ratingStmt = $pdo->prepare("
        SELECT 
            r.rating_id,
            r.rating,
            r.comment,
            r.created_at,
            u.full_name as reviewer_name
        FROM ratings r
        INNER JOIN users u ON r.reviewer_id = u.user_id
        WHERE r.equipment_id = ?
        ORDER BY r.created_at DESC
        LIMIT 10
    ");
    $ratingStmt->execute([$equipmentId]);
    $ratings = $ratingStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format images
    $formattedImages = array_map(function($img) {
        return [
            'id' => intval($img['image_id']),
            'url' => $img['image_url'],
            'is_primary' => (bool)$img['is_primary']
        ];
    }, $images);
    
    // Format ratings
    $formattedRatings = array_map(function($rating) {
        return [
            'id' => intval($rating['rating_id']),
            'rating' => intval($rating['rating']),
            'comment' => $rating['comment'],
            'reviewer_name' => $rating['reviewer_name'],
            'created_at' => $rating['created_at']
        ];
    }, $ratings);
    
    // Format response
    $response = [
        'id' => intval($equipment['equipment_id']),
        'name' => $equipment['name'],
        'category' => $equipment['category'],
        'description' => $equipment['description'],
        'price_per_day' => floatval($equipment['price_per_day']),
        'location' => $equipment['location'],
        'city' => $equipment['city'],
        'rating' => floatval($equipment['rating']),
        'total_rentals' => intval($equipment['total_rentals']),
        'is_verified' => (bool)$equipment['is_verified'],
        'is_available' => (bool)$equipment['is_available'],
        'images' => $formattedImages,
        'ratings' => $formattedRatings,
        'owner' => [
            'id' => intval($equipment['owner_id']),
            'name' => $equipment['owner_name'],
            'email' => $equipment['owner_email'],
            'phone' => $equipment['owner_phone'],
            'is_verified' => (bool)$equipment['owner_verified']
        ],
        'created_at' => $equipment['created_at'],
        'updated_at' => $equipment['updated_at']
    ];
    
    sendJSONResponse(true, 'Equipment details retrieved successfully', $response, 200);
    
} catch (PDOException $e) {
    error_log("Get Equipment Details Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while fetching equipment details', [], 500);
}

