<?php
/**
 * My Bookings Page
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
$bookings = [];
$stats = [
    'active_rentals' => 0,
    'pending_requests' => 0,
    'total_spent' => 0
];

if ($pdo) {
    try {
        $userId = getCurrentUserId();
        $filter = $_GET['filter'] ?? 'all';
        
        // Get user info
        $stmt = $pdo->prepare("SELECT user_id, full_name, email, role FROM users WHERE user_id = ?");
        $stmt->execute([$userId]);
        $currentUser = $stmt->fetch();
        
        // Build query based on role
        $isRenter = $currentUser['role'] === 'renter';
        $userColumn = $isRenter ? 'renter_id' : 'owner_id';
        
        // Get stats
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_rentals,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_spent
            FROM bookings 
            WHERE $userColumn = ?
        ");
        $stmt->execute([$userId]);
        $stats = $stmt->fetch();
        
        // Get bookings
        $sql = "
            SELECT b.*, e.name as equipment_name, e.description, e.image_url, 
                   u.full_name as owner_name, u.email as owner_email
            FROM bookings b
            JOIN equipment e ON b.equipment_id = e.equipment_id
            JOIN users u ON b.owner_id = u.user_id
            WHERE b.$userColumn = ?
        ";
        
        if ($filter !== 'all') {
            $sql .= " AND b.status = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $filter]);
        } else {
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId]);
        }
        
        $bookings = $stmt->fetchAll();
    } catch (PDOException $e) {
        error_log("Bookings error: " . $e->getMessage());
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Bookings - Cr8Kit</title>
    <link rel="stylesheet" href="css/styles.css" />
    <link rel="stylesheet" href="css/dashboard.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>
<body>
    <?php include __DIR__ . '/includes/navbar.php'; ?>
    
    <div class="main-content" style="max-width: 1200px; margin: 0 auto; padding: var(--spacing-lg);">
        <!-- Page Header -->
        <div style="margin-bottom: var(--spacing-xl);">
            <h1 style="font-size: 32px; font-weight: 700; color: var(--text-dark); margin-bottom: var(--spacing-xs);">
                My Bookings
            </h1>
            <p style="color: var(--text-gray);">
                Manage your current rentals, track requests, and view your history.
            </p>
        </div>
        
        <!-- Stats Cards -->
        <div class="stats-grid" style="margin-bottom: var(--spacing-lg);">
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
                    <div class="stat-label">Total Spent</div>
                    <div class="stat-value">GHS <?php echo number_format($stats['total_spent'] ?? 0, 2); ?></div>
                </div>
            </div>
        </div>
        
        <!-- Filter Tabs -->
        <div class="tabs-nav">
            <a href="?filter=all" class="tab-link <?php echo $filter === 'all' ? 'active' : ''; ?>">All</a>
            <a href="?filter=active" class="tab-link <?php echo $filter === 'active' ? 'active' : ''; ?>">Active</a>
            <a href="?filter=pending" class="tab-link <?php echo $filter === 'pending' ? 'active' : ''; ?>">Pending</a>
            <a href="?filter=completed" class="tab-link <?php echo $filter === 'completed' ? 'active' : ''; ?>">Completed</a>
            <a href="?filter=cancelled" class="tab-link <?php echo $filter === 'cancelled' ? 'active' : ''; ?>">Cancelled</a>
        </div>
        
        <!-- Bookings List -->
        <div class="booking-list">
            <?php if (empty($bookings)): ?>
                <div style="background: var(--card-white); border-radius: var(--radius-md); padding: var(--spacing-xl); text-align: center; box-shadow: var(--shadow-sm);">
                    <i class="fas fa-calendar-times" style="font-size: 48px; color: var(--text-light-gray); margin-bottom: var(--spacing-md);"></i>
                    <p style="color: var(--text-gray); font-size: 16px;">No bookings found.</p>
                </div>
            <?php else: ?>
                <?php foreach ($bookings as $booking): ?>
                <div class="booking-card">
                    <img 
                        src="<?php echo htmlspecialchars($booking['image_url'] ?: 'https://via.placeholder.com/120'); ?>" 
                        alt="<?php echo htmlspecialchars($booking['equipment_name']); ?>"
                        class="booking-image"
                    />
                    <div class="booking-content">
                        <div class="booking-info">
                            <div class="booking-status">
                                <span class="status-dot <?php echo $booking['status']; ?>"></span>
                                <span style="text-transform: capitalize; font-weight: 500;">
                                    <?php echo ucfirst($booking['status']); ?>
                                    <?php if ($booking['status'] === 'pending'): ?>Approval<?php endif; ?>
                                </span>
                            </div>
                            <div class="booking-id">ID: #<?php echo htmlspecialchars($booking['booking_number']); ?></div>
                            <h3 class="booking-title"><?php echo htmlspecialchars($booking['equipment_name']); ?></h3>
                            <p class="booking-description"><?php echo htmlspecialchars($booking['description'] ?: 'No description available'); ?></p>
                            <div class="booking-meta">
                                <span><i class="fas fa-calendar"></i> <?php echo date('M d - M d, Y', strtotime($booking['start_date'])); ?> (<?php echo $booking['total_days']; ?> days)</span>
                                <span><i class="fas fa-user"></i> <?php echo htmlspecialchars($booking['owner_name']); ?></span>
                            </div>
                        </div>
                        <div class="booking-actions">
                            <div class="booking-price">
                                <div class="price-amount">GHS <?php echo number_format($booking['total_amount'], 2); ?></div>
                                <div class="price-status <?php echo $booking['payment_status']; ?>">
                                    <?php 
                                    if ($booking['payment_status'] === 'paid') {
                                        echo 'Paid';
                                    } elseif ($booking['status'] === 'pending') {
                                        echo 'Awaiting Confirmation';
                                    } else {
                                        echo ucfirst($booking['payment_status']);
                                    }
                                    ?>
                                </div>
                            </div>
                            <div style="display: flex; gap: var(--spacing-xs);">
                                <?php if ($booking['status'] === 'active'): ?>
                                    <button class="btn-list-item" style="padding: 8px 16px; font-size: 12px;">
                                        Return Equipment
                                    </button>
                                <?php elseif ($booking['status'] === 'pending'): ?>
                                    <button class="btn-list-item" style="padding: 8px 16px; font-size: 12px; background: var(--text-gray);">
                                        Cancel Request
                                    </button>
                                <?php elseif ($booking['status'] === 'completed'): ?>
                                    <button class="btn-list-item" style="padding: 8px 16px; font-size: 12px; background: var(--text-gray);">
                                        Book Again
                                    </button>
                                <?php endif; ?>
                                <button class="icon-btn" style="font-size: 16px;">
                                    <i class="fas fa-comment"></i>
                                </button>
                                <button class="icon-btn" style="font-size: 16px;">
                                    <i class="fas fa-file-invoice"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
        
        <?php if (count($bookings) >= 10): ?>
        <button class="btn-load-more" onclick="loadOlderBookings()">
            Load older bookings
        </button>
        <?php endif; ?>
    </div>
    
    <script src="js/bookings.js"></script>
</body>
</html>

