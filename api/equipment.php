<?php
/**
 * Equipment API
 * Cr8Kit - Ghana Creative Rentals Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJSONResponse(false, 'Invalid request method', [], 405);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendJSONResponse(false, 'Database connection failed', [], 500);
}

try {
    // Get filter parameters
    $category = $_GET['category'] ?? null;
    $minPrice = $_GET['minPrice'] ?? 0;
    $maxPrice = $_GET['maxPrice'] ?? 10000;
    $location = $_GET['location'] ?? null;
    $search = $_GET['search'] ?? null;
    $sort = $_GET['sort'] ?? 'recommended';
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 12);
    $offset = ($page - 1) * $limit;
    
    // Build query
    $sql = "
        SELECT e.*, u.full_name as owner_name,
               COALESCE(AVG(r.rating), 0) as avg_rating,
               COUNT(DISTINCT r.rating_id) as review_count
        FROM equipment e
        JOIN users u ON e.owner_id = u.user_id
        LEFT JOIN ratings r ON e.equipment_id = r.equipment_id
        WHERE e.is_available = 1
    ";
    
    $params = [];
    
    if ($category) {
        $sql .= " AND e.category = ?";
        $params[] = $category;
    }
    
    if ($minPrice > 0) {
        $sql .= " AND e.price_per_day >= ?";
        $params[] = $minPrice;
    }
    
    if ($maxPrice < 10000) {
        $sql .= " AND e.price_per_day <= ?";
        $params[] = $maxPrice;
    }
    
    if ($location) {
        $sql .= " AND (e.city = ? OR e.location LIKE ?)";
        $params[] = $location;
        $params[] = "%$location%";
    }
    
    if ($search) {
        $sql .= " AND (e.name LIKE ? OR e.description LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    
    $sql .= " GROUP BY e.equipment_id";
    
    // Apply sorting
    switch ($sort) {
        case 'price-low':
            $sql .= " ORDER BY e.price_per_day ASC";
            break;
        case 'price-high':
            $sql .= " ORDER BY e.price_per_day DESC";
            break;
        case 'rating':
            $sql .= " ORDER BY avg_rating DESC";
            break;
        case 'newest':
            $sql .= " ORDER BY e.created_at DESC";
            break;
        default:
            $sql .= " ORDER BY e.is_verified DESC, avg_rating DESC, e.created_at DESC";
    }
    
    // Get total count
    $countSql = "SELECT COUNT(DISTINCT e.equipment_id) as total FROM equipment e WHERE e.is_available = 1";
    $countParams = [];
    
    if ($category) {
        $countSql .= " AND e.category = ?";
        $countParams[] = $category;
    }
    if ($minPrice > 0) {
        $countSql .= " AND e.price_per_day >= ?";
        $countParams[] = $minPrice;
    }
    if ($maxPrice < 10000) {
        $countSql .= " AND e.price_per_day <= ?";
        $countParams[] = $maxPrice;
    }
    if ($location) {
        $countSql .= " AND (e.city = ? OR e.location LIKE ?)";
        $countParams[] = $location;
        $countParams[] = "%$location%";
    }
    if ($search) {
        $countSql .= " AND (e.name LIKE ? OR e.description LIKE ?)";
        $countParams[] = "%$search%";
        $countParams[] = "%$search%";
    }
    
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($countParams);
    $total = $countStmt->fetch()['total'];
    
    // Add pagination
    $sql .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $equipment = $stmt->fetchAll();
    
    // Format response
    $formattedEquipment = array_map(function($item) {
        return [
            'id' => $item['equipment_id'],
            'name' => $item['name'],
            'category' => $item['category'],
            'description' => $item['description'],
            'price' => floatval($item['price_per_day']),
            'location' => $item['location'],
            'city' => $item['city'],
            'image_url' => $item['image_url'],
            'rating' => round(floatval($item['avg_rating']), 1),
            'review_count' => intval($item['review_count']),
            'owner_name' => $item['owner_name'],
            'is_verified' => (bool)$item['is_verified']
        ];
    }, $equipment);
    
    sendJSONResponse(true, 'Equipment retrieved successfully', [
        'equipment' => $formattedEquipment,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Equipment API Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while fetching equipment', [], 500);
}

