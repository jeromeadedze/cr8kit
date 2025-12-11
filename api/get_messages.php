<?php
/**
 * Get Messages API
 * Returns conversation messages between users
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

try {
    $otherUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    $bookingId = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : null;
    
    // Get messages
    if ($otherUserId > 0) {
        // Get conversation with specific user
        $sql = "
            SELECT m.*,
                   u1.full_name as sender_name,
                   u1.user_id as sender_user_id,
                   u2.full_name as receiver_name,
                   u2.user_id as receiver_user_id
            FROM messages m
            INNER JOIN users u1 ON m.sender_id = u1.user_id
            INNER JOIN users u2 ON m.receiver_id = u2.user_id
            WHERE (m.sender_id = ? AND m.receiver_id = ?)
               OR (m.sender_id = ? AND m.receiver_id = ?)
        ";
        $params = [$userId, $otherUserId, $otherUserId, $userId];
        
        if ($bookingId !== null) {
            $sql .= " AND m.booking_id = ?";
            $params[] = $bookingId;
        }
        
        $sql .= " ORDER BY m.created_at ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } else {
        // Get all conversations for current user
        $sql = "
            SELECT DISTINCT
                CASE 
                    WHEN m.sender_id = ? THEN m.receiver_id
                    ELSE m.sender_id
                END as other_user_id,
                u.full_name as other_user_name,
                (
                    SELECT message_text 
                    FROM messages m2 
                    WHERE (m2.sender_id = ? AND m2.receiver_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END)
                       OR (m2.sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AND m2.receiver_id = ?)
                    ORDER BY m2.created_at DESC 
                    LIMIT 1
                ) as last_message,
                (
                    SELECT created_at 
                    FROM messages m2 
                    WHERE (m2.sender_id = ? AND m2.receiver_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END)
                       OR (m2.sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AND m2.receiver_id = ?)
                    ORDER BY m2.created_at DESC 
                    LIMIT 1
                ) as last_message_time,
                (
                    SELECT COUNT(*) 
                    FROM messages m2 
                    WHERE m2.receiver_id = ? 
                    AND m2.sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
                    AND m2.is_read = FALSE
                ) as unread_count
            FROM messages m
            INNER JOIN users u ON (
                CASE 
                    WHEN m.sender_id = ? THEN u.user_id = m.receiver_id
                    ELSE u.user_id = m.sender_id
                END
            )
            WHERE m.sender_id = ? OR m.receiver_id = ?
            ORDER BY last_message_time DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId, $userId, $userId, $userId, $userId, $userId, $userId, $userId, $userId, $userId, $userId, $userId]);
    }
    
    $messages = $stmt->fetchAll();
    
    // Mark messages as read if viewing conversation
    if ($otherUserId > 0) {
        $stmt = $pdo->prepare("
            UPDATE messages 
            SET is_read = TRUE 
            WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE
        ");
        $stmt->execute([$userId, $otherUserId]);
    }
    
    sendJSONResponse(true, 'Messages retrieved successfully', [
        'messages' => $messages
    ], 200);
    
} catch (PDOException $e) {
    error_log("Get Messages Error: " . $e->getMessage());
    sendJSONResponse(false, 'An error occurred while fetching messages', [], 500);
}

