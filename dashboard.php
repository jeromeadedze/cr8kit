<?php
/**
 * Dashboard Page
 * Cr8Kit - Ghana Creative Rentals Platform
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/functions.php';

startSecureSession();

if (!isLoggedIn()) {
    header('Location: index.html');
    exit;
}

$pdo = getDBConnection();
$currentUser = null;
$stats = [
    'active_rentals' => 0,
    'pending_requests' => 0,
    'total_spent' => 0
];

if ($pdo) {
    try {
        $userId = getCurrentUserId();
        
        // Get user info
        $stmt = $pdo->prepare("SELECT user_id, full_name, email, role FROM users WHERE user_id = ?");
        $stmt->execute([$userId]);
        $currentUser = $stmt->fetch();
        
        if ($currentUser['role'] === 'renter') {
            // Get renter stats
            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_rentals,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_spent
                FROM bookings 
                WHERE renter_id = ?
            ");
            $stmt->execute([$userId]);
            $stats = $stmt->fetch();
        } else {
            // Get owner stats
            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_rentals,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_spent
                FROM bookings 
                WHERE owner_id = ?
            ");
            $stmt->execute([$userId]);
            $stats = $stmt->fetch();
        }
    } catch (PDOException $e) {
        error_log("Dashboard error: " . $e->getMessage());
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard - Cr8Kit</title>
    <link rel="stylesheet" href="css/styles.css" />
    <link rel="stylesheet" href="css/dashboard.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>
<body>
    <?php include __DIR__ . '/includes/navbar.php'; ?>
    
    <div class="main-content" style="max-width: 1200px; margin: 0 auto; padding: var(--spacing-lg);">
        <div style="margin-bottom: var(--spacing-xl);">
            <h1 style="font-size: 32px; font-weight: 700; color: var(--text-dark); margin-bottom: var(--spacing-xs);">
                Dashboard
            </h1>
            <p style="color: var(--text-gray);">
                <?php echo $currentUser['role'] === 'renter' 
                    ? 'Manage your rentals and discover new equipment.' 
                    : 'Manage your listings and track your rental business.'; ?>
            </p>
        </div>
        
        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-home"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Active Rentals</div>
                    <div class="stat-value"><?php echo $stats['active_rentals'] ?? 0; ?></div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Pending Requests</div>
                    <div class="stat-value"><?php echo $stats['pending_requests'] ?? 0; ?></div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-label"><?php echo $currentUser['role'] === 'renter' ? 'Total Spent' : 'Total Earned'; ?></div>
                    <div class="stat-value">GHS <?php echo number_format($stats['total_spent'] ?? 0, 2); ?></div>
                </div>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div style="background: var(--card-white); border-radius: var(--radius-md); padding: var(--spacing-lg); box-shadow: var(--shadow-sm); margin-bottom: var(--spacing-lg);">
            <h2 style="font-size: 20px; font-weight: 600; margin-bottom: var(--spacing-md);">Quick Actions</h2>
            <div style="display: flex; gap: var(--spacing-md); flex-wrap: wrap;">
                <?php if ($currentUser['role'] === 'renter'): ?>
                    <a href="index.php" class="btn-list-item">
                        <i class="fas fa-search"></i> Browse Equipment
                    </a>
                    <a href="bookings.php" class="btn-list-item" style="background: var(--card-white); color: var(--primary-orange); border: 2px solid var(--primary-orange);">
                        <i class="fas fa-calendar"></i> My Bookings
                    </a>
                <?php else: ?>
                    <a href="list-item.php" class="btn-list-item">
                        <i class="fas fa-plus"></i> List New Item
                    </a>
                    <a href="my-listings.php" class="btn-list-item" style="background: var(--card-white); color: var(--primary-orange); border: 2px solid var(--primary-orange);">
                        <i class="fas fa-list"></i> My Listings
                    </a>
                    <a href="bookings.php" class="btn-list-item" style="background: var(--card-white); color: var(--primary-orange); border: 2px solid var(--primary-orange);">
                        <i class="fas fa-calendar"></i> Booking Requests
                    </a>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Recent Activity -->
        <div style="background: var(--card-white); border-radius: var(--radius-md); padding: var(--spacing-lg); box-shadow: var(--shadow-sm);">
            <h2 style="font-size: 20px; font-weight: 600; margin-bottom: var(--spacing-md);">Recent Activity</h2>
            <p style="color: var(--text-gray); text-align: center; padding: var(--spacing-lg);">
                No recent activity to display.
            </p>
        </div>
    </div>
    
    <script src="js/dashboard.js"></script>
</body>
</html>

