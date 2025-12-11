<?php
/**
 * Update Equipment Listing API
 * Allows owners to update their equipment listings
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

// Get equipment ID
$equipmentId = isset($_POST['equipment_id']) ? intval($_POST['equipment_id']) : 0;
if ($equipmentId <= 0) {
    sendJSONResponse(false, 'Invalid equipment ID', [], 400);
}

// Verify ownership
try {
    $stmt = $pdo->prepare("SELECT owner_id FROM equipment WHERE equipment_id = ?");
    $stmt->execute([$equipmentId]);
    $equipment = $stmt->fetch();
    
    if (!$equipment) {
        sendJSONResponse(false, 'Equipment not found', [], 404);
    }
    
    if ($equipment['owner_id'] != $userId) {
        sendJSONResponse(false, 'You can only update your own equipment listings', [], 403);
    }
} catch (PDOException $e) {
    sendJSONResponse(false, 'Error verifying ownership', [], 500);
}

// Get and sanitize input data (all fields optional for update)
$name = isset($_POST['name']) ? sanitizeInput($_POST['name']) : null;
$category = isset($_POST['category']) ? sanitizeInput($_POST['category']) : null;
$description = isset($_POST['description']) ? sanitizeInput($_POST['description']) : null;
$pricePerDay = isset($_POST['price_per_day']) ? floatval($_POST['price_per_day']) : null;
$location = isset($_POST['location']) ? sanitizeInput($_POST['location']) : null;
$city = isset($_POST['city']) ? sanitizeInput($_POST['city']) : null;
$isAvailable = isset($_POST['is_available']) ? filter_var($_POST['is_available'], FILTER_VALIDATE_BOOLEAN) : null;

// Validation
$errors = [];
$validCategories = ['Cameras', 'Lighting', 'Audio', 'Drones', 'Accessories', 'Other'];

if ($name !== null && empty($name)) {
    $errors['name'] = 'Equipment name cannot be empty';
} else if ($name !== null && strlen($name) > 200) {
    $errors['name'] = 'Equipment name must be 200 characters or less';
}

if ($category !== null && !in_array($category, $validCategories)) {
    $errors['category'] = 'Invalid category selected';
}

if ($pricePerDay !== null && $pricePerDay <= 0) {
    $errors['price_per_day'] = 'Price per day must be greater than 0';
}

if (!empty($errors)) {
    sendJSONResponse(false, 'Validation failed', ['errors' => $errors], 400);
}

// Build update query dynamically
try {
    $updateFields = [];
    $params = [];
    
    if ($name !== null) {
        $updateFields[] = "name = ?";
        $params[] = $name;
    }
    if ($category !== null) {
        $updateFields[] = "category = ?";
        $params[] = $category;
    }
    if ($description !== null) {
        $updateFields[] = "description = ?";
        $params[] = $description;
    }
    if ($pricePerDay !== null) {
        $updateFields[] = "price_per_day = ?";
        $params[] = $pricePerDay;
    }
    if ($location !== null) {
        $updateFields[] = "location = ?";
        $params[] = $location;
    }
    if ($city !== null) {
        $updateFields[] = "city = ?";
        $params[] = $city;
    }
    if ($isAvailable !== null) {
        $updateFields[] = "is_available = ?";
        $params[] = $isAvailable ? 1 : 0;
    }
    
    if (empty($updateFields)) {
        sendJSONResponse(false, 'No fields to update', [], 400);
    }
    
    // Add updated_at
    $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
    
    // Add equipment_id to params
    $params[] = $equipmentId;
    
    $sql = "UPDATE equipment SET " . implode(", ", $updateFields) . " WHERE equipment_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    // Get updated equipment
    $stmt = $pdo->prepare("SELECT * FROM equipment WHERE equipment_id = ?");
    $stmt->execute([$equipmentId]);
    $updatedEquipment = $stmt->fetch();
    
    sendJSONResponse(true, 'Equipment updated successfully', [
        'equipment' => $updatedEquipment
    ], 200);
    
} catch (PDOException $e) {
    error_log("Update Equipment Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while updating the equipment', [], 500);
}

