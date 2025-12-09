<?php
/**
 * User Registration/Signup API
 * Cr8Kit - Ghana Creative Rentals Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

// Set content type to JSON
header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSONResponse(false, 'Invalid request method', [], 405);
}

// Get database connection
$pdo = getDBConnection();
if (!$pdo) {
    sendJSONResponse(false, 'Database connection failed', [], 500);
}

// Get and sanitize input data
$fullName = isset($_POST['fullName']) ? sanitizeInput($_POST['fullName']) : '';
$email = isset($_POST['email']) ? sanitizeInput($_POST['email']) : '';
$phoneNumber = isset($_POST['phoneNumber']) ? sanitizeInput($_POST['phoneNumber']) : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';
$role = isset($_POST['role']) ? sanitizeInput($_POST['role']) : 'renter';
$termsAgreed = isset($_POST['termsAgreement']) ? true : false;

// Validation errors array
$errors = [];

// Validate Full Name
if (empty($fullName)) {
    $errors['fullName'] = 'Full name is required';
} else {
    $nameValidation = validateFullName($fullName);
    if (!$nameValidation['valid']) {
        $errors['fullName'] = $nameValidation['message'];
    }
}

// Validate Email
if (empty($email)) {
    $errors['email'] = 'Email address is required';
} else if (!validateEmail($email)) {
    $errors['email'] = 'Please enter a valid email address';
} else if (emailExists($email, $pdo)) {
    $errors['email'] = 'This email is already registered';
}

// Validate Phone Number
if (empty($phoneNumber)) {
    $errors['phoneNumber'] = 'Phone number is required';
} else if (!validateGhanaPhone($phoneNumber)) {
    $errors['phoneNumber'] = 'Please enter a valid Ghana phone number (e.g., +233 12 345 6789 or 0XX XXX XXXX)';
} else if (phoneExists($phoneNumber, $pdo)) {
    $errors['phoneNumber'] = 'This phone number is already registered';
}

// Validate Password
if (empty($password)) {
    $errors['password'] = 'Password is required';
} else {
    $passwordValidation = validatePassword($password);
    if (!$passwordValidation['valid']) {
        $errors['password'] = $passwordValidation['message'];
    }
}

// Validate Role
if (!in_array($role, ['renter', 'owner'])) {
    $errors['role'] = 'Invalid role selected';
}

// Validate Terms Agreement
if (!$termsAgreed) {
    $errors['terms'] = 'You must agree to the Terms & Conditions';
}

// If there are validation errors, return them
if (!empty($errors)) {
    sendJSONResponse(false, 'Validation failed', ['errors' => $errors], 400);
}

// All validations passed, create user account
try {
    // Hash password
    $passwordHash = hashPassword($password);
    
    // Prepare SQL statement
    $stmt = $pdo->prepare("
        INSERT INTO users (full_name, email, phone_number, password_hash, role) 
        VALUES (?, ?, ?, ?, ?)
    ");
    
    // Execute statement
    $stmt->execute([$fullName, $email, $phoneNumber, $passwordHash, $role]);
    
    // Get the newly created user ID
    $userId = $pdo->lastInsertId();
    
    // Start session and log user in
    startSecureSession();
    $_SESSION['user_id'] = $userId;
    $_SESSION['logged_in'] = true;
    $_SESSION['user_email'] = $email;
    $_SESSION['user_name'] = $fullName;
    $_SESSION['user_role'] = $role;
    
    // Return success response
    sendJSONResponse(true, 'Account created successfully!', [
        'userId' => $userId,
        'email' => $email,
        'name' => $fullName,
        'role' => $role
    ], 201);
    
} catch (PDOException $e) {
    error_log("Signup Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while creating your account. Please try again.', [], 500);
}

