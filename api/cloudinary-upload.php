<?php
/**
 * Cloudinary Upload API
 * Handles server-side image uploads to Cloudinary
 */

header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../includes/functions.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Invalid request method', null, 405);
    exit;
}

// Get uploaded file
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    sendJsonResponse(false, 'No file uploaded or upload error', null, 400);
    exit;
}

$file = $_FILES['image'];

// Validate file type
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
$fileType = mime_content_type($file['tmp_name']);

if (!in_array($fileType, $allowedTypes)) {
    sendJsonResponse(false, 'Invalid file type. Only JPEG, PNG, and WebP are allowed.', null, 400);
    exit;
}

// Validate file size (5MB max)
if ($file['size'] > 5000000) {
    sendJsonResponse(false, 'File size exceeds 5MB limit', null, 400);
    exit;
}

// Cloudinary credentials
$cloudName = 'dpfsqrccq';
$apiKey = '112636816111282';
$apiSecret = 'cEw7KjShBu5DHChwqAUE3xvLDRA';

// Generate signature for upload
$timestamp = time();
$folder = 'cr8kit/equipment';
$publicId = $folder . '/' . uniqid();

$params = [
    'timestamp' => $timestamp,
    'folder' => $folder,
    'public_id' => $publicId,
    'transformation' => [
        [
            'width' => 1200,
            'height' => 800,
            'crop' => 'limit',
            'quality' => 'auto:good',
            'fetch_format' => 'auto'
        ]
    ]
];

// Create signature
$signatureString = http_build_query($params) . $apiSecret;
$signature = sha1($signatureString);

// Prepare upload data
$uploadData = [
    'file' => new CURLFile($file['tmp_name'], $fileType, $file['name']),
    'api_key' => $apiKey,
    'timestamp' => $timestamp,
    'signature' => $signature,
    'folder' => $folder,
    'public_id' => $publicId,
    'transformation' => 'w_1200,h_800,c_limit,q_auto:good,f_auto'
];

// Upload to Cloudinary
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.cloudinary.com/v1_1/{$cloudName}/image/upload");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $uploadData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    sendJsonResponse(false, 'Failed to upload to Cloudinary', null, 500);
    exit;
}

$result = json_decode($response, true);

if (isset($result['error'])) {
    sendJsonResponse(false, $result['error']['message'], null, 400);
    exit;
}

// Return success with optimized URLs
$publicId = $result['public_id'];
$secureUrl = $result['secure_url'];

// Generate optimized URLs
$thumbnailUrl = "https://res.cloudinary.com/{$cloudName}/image/upload/w_300,h_200,c_fill,q_auto:good,f_auto/{$publicId}";
$mediumUrl = "https://res.cloudinary.com/{$cloudName}/image/upload/w_800,h_600,c_limit,q_auto:good,f_auto/{$publicId}";
$fullUrl = "https://res.cloudinary.com/{$cloudName}/image/upload/w_1200,h_800,c_limit,q_auto:good,f_auto/{$publicId}";

sendJsonResponse(true, 'Image uploaded successfully', [
    'public_id' => $publicId,
    'secure_url' => $secureUrl,
    'thumbnail_url' => $thumbnailUrl,
    'medium_url' => $mediumUrl,
    'full_url' => $fullUrl
], 200);

