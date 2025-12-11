<?php
/**
 * Get Equipment Listings API
 * Returns paginated list of available equipment
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

try {
    // Check if user wants only their own equipment
    $ownerOnly = isset($_GET['owner_only']) && $_GET['owner_only'] == '1';
    $ownerId = null;
    
    if ($ownerOnly) {
        startSecureSession();
        if (isLoggedIn()) {
            $ownerId = getCurrentUserId();
        }
    }
    
    // Get query parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(50, max(1, intval($_GET['limit']))) : 12;
    $offset = ($page - 1) * $limit;
    
    // Filter parameters
    $category = isset($_GET['category']) ? sanitizeInput($_GET['category']) : '';
    $city = isset($_GET['city']) ? sanitizeInput($_GET['city']) : '';
    $minPrice = isset($_GET['min_price']) ? floatval($_GET['min_price']) : 0;
    $maxPrice = isset($_GET['max_price']) ? floatval($_GET['max_price']) : 0;
    $search = isset($_GET['search']) ? sanitizeInput($_GET['search']) : '';
    
    // Build WHERE clause
    $whereConditions = [];
    $params = [];
    
    // If owner_only, filter by owner_id
    if ($ownerId !== null) {
        $whereConditions[] = 'e.owner_id = ?';
        $params[] = $ownerId;
    } else if (!$ownerOnly) {
        // Only show available equipment for public listings
        $whereConditions[] = 'e.is_available = 1';
    }
    
    if (!empty($category)) {
        $whereConditions[] = 'e.category = ?';
        $params[] = $category;
    }
    
    if (!empty($city)) {
        $whereConditions[] = 'e.city = ?';
        $params[] = $city;
    }
    
    if ($minPrice > 0) {
        $whereConditions[] = 'e.price_per_day >= ?';
        $params[] = $minPrice;
    }
    
    if ($maxPrice > 0) {
        $whereConditions[] = 'e.price_per_day <= ?';
        $params[] = $maxPrice;
    }
    
    if (!empty($search)) {
        $whereConditions[] = '(e.name LIKE ? OR e.description LIKE ?)';
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $whereClause = implode(' AND ', $whereConditions);
    
    // Get total count for pagination
    $countStmt = $pdo->prepare("
        SELECT COUNT(*) as total 
        FROM equipment e 
        WHERE {$whereClause}
    ");
    $countStmt->execute($params);
    $totalCount = $countStmt->fetch()['total'];
    
    // Get equipment with owner info and primary image
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
            e.created_at,
            u.full_name as owner_name,
            u.user_id as owner_id,
            COALESCE(img.image_url, e.image_url, '') as image_url
        FROM equipment e
        INNER JOIN users u ON e.owner_id = u.user_id
        LEFT JOIN equipment_images img ON e.equipment_id = img.equipment_id AND img.is_primary = 1
        WHERE {$whereClause}
        ORDER BY e.created_at DESC, e.rating DESC
        LIMIT ? OFFSET ?
    ");
    
    // Add limit and offset to params
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt->execute($params);
    $equipment = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format response
    $formattedEquipment = array_map(function($item) {
        return [
            'id' => intval($item['equipment_id']),
            'name' => $item['name'],
            'category' => $item['category'],
            'description' => $item['description'],
            'price_per_day' => floatval($item['price_per_day']),
            'location' => $item['location'],
            'city' => $item['city'],
            'rating' => floatval($item['rating']),
            'total_rentals' => intval($item['total_rentals']),
            'is_verified' => (bool)$item['is_verified'],
            'image_url' => $item['image_url'],
            'owner' => [
                'id' => intval($item['owner_id']),
                'name' => $item['owner_name']
            ],
            'created_at' => $item['created_at']
        ];
    }, $equipment);
    
    // Calculate pagination info
    $totalPages = ceil($totalCount / $limit);
    
    sendJSONResponse(true, 'Equipment retrieved successfully', [
        'equipment' => $formattedEquipment,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_items' => intval($totalCount),
            'items_per_page' => $limit,
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1
        ]
    ], 200);
    
} catch (PDOException $e) {
    error_log("Get Equipment Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while fetching equipment', [], 500);
}

