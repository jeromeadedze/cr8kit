<?php
/**
 * Create Equipment Listing API
 * Allows owners to create new equipment listings
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

// Only owners can create equipment listings
if ($userRole !== 'owner') {
    sendJSONResponse(false, 'Only owners can create equipment listings', [], 403);
}

// Get and sanitize input data
$name = isset($_POST['name']) ? sanitizeInput($_POST['name']) : '';
$category = isset($_POST['category']) ? sanitizeInput($_POST['category']) : '';
$description = isset($_POST['description']) ? sanitizeInput($_POST['description']) : '';
$pricePerDay = isset($_POST['price_per_day']) ? floatval($_POST['price_per_day']) : 0;
$location = isset($_POST['location']) ? sanitizeInput($_POST['location']) : '';
$city = isset($_POST['city']) ? sanitizeInput($_POST['city']) : 'Accra';
$imageUrl = isset($_POST['image_url']) ? sanitizeInput($_POST['image_url']) : '';

// Validation errors array
$errors = [];

// Validate Name
if (empty($name)) {
    $errors['name'] = 'Equipment name is required';
} else if (strlen($name) > 200) {
    $errors['name'] = 'Equipment name must be 200 characters or less';
}

// Validate Category
$validCategories = ['Cameras', 'Lighting', 'Audio', 'Drones', 'Accessories', 'Other'];
if (empty($category)) {
    $errors['category'] = 'Category is required';
} else if (!in_array($category, $validCategories)) {
    $errors['category'] = 'Invalid category selected';
}

// Validate Description
if (empty($description)) {
    $errors['description'] = 'Description is required';
}

// Validate Price
if ($pricePerDay <= 0) {
    $errors['price_per_day'] = 'Price per day must be greater than 0';
}

// Validate Location
if (empty($location)) {
    $errors['location'] = 'Location is required';
}

// Validate City
if (empty($city)) {
    $errors['city'] = 'City is required';
}

// If there are validation errors, return them
if (!empty($errors)) {
    sendJSONResponse(false, 'Validation failed', ['errors' => $errors], 400);
}

// All validations passed, create equipment listing
try {
    // Prepare SQL statement
    $stmt = $pdo->prepare("
        INSERT INTO equipment (owner_id, name, category, description, price_per_day, location, city, image_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    // Execute statement
    $stmt->execute([$userId, $name, $category, $description, $pricePerDay, $location, $city, $imageUrl]);
    
    // Get the newly created equipment ID
    $equipmentId = $pdo->lastInsertId();
    
    // If image URL is provided, add it to equipment_images table as primary
    if (!empty($imageUrl)) {
        $imageStmt = $pdo->prepare("
            INSERT INTO equipment_images (equipment_id, image_url, is_primary) 
            VALUES (?, ?, 1)
        ");
        $imageStmt->execute([$equipmentId, $imageUrl]);
    }
    
    // Return success response
    sendJSONResponse(true, 'Equipment listing created successfully!', [
        'equipment_id' => $equipmentId,
        'name' => $name,
        'category' => $category
    ], 201);
    
} catch (PDOException $e) {
    error_log("Create Equipment Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while creating the equipment listing. Please try again.', [], 500);
}

