<?php
/**
 * Navigation Bar Component
 * Cr8Kit - Ghana Creative Rentals Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/functions.php';

startSecureSession();
$isLoggedIn = isLoggedIn();
$currentUser = null;

if ($isLoggedIn) {
    $pdo = getDBConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT user_id, full_name, email, role FROM users WHERE user_id = ?");
            $stmt->execute([getCurrentUserId()]);
            $currentUser = $stmt->fetch();
        } catch (PDOException $e) {
            error_log("Error fetching user: " . $e->getMessage());
        }
    }
}
?>

<nav class="navbar">
    <div class="navbar-left">
        <a href="index.php" class="logo-nav">
            <span>Cr8Kit</span>
        </a>
        
        <?php if ($isLoggedIn): ?>
        <div class="search-container">
            <input 
                type="text" 
                class="search-input" 
                placeholder="Search cameras, lenses, lighting..."
                id="searchInput"
            />
            <i class="fas fa-search search-icon"></i>
        </div>
        <?php endif; ?>
    </div>
    
    <div class="navbar-right">
        <?php if ($isLoggedIn): ?>
            <ul class="nav-links">
                <li><a href="dashboard.php" class="nav-link">Dashboard</a></li>
                <li><a href="bookings.php" class="nav-link">My Bookings</a></li>
                <?php if ($currentUser && $currentUser['role'] === 'owner'): ?>
                <li><a href="my-listings.php" class="nav-link">My Listings</a></li>
                <?php endif; ?>
            </ul>
            
            <?php if ($currentUser && $currentUser['role'] === 'owner'): ?>
            <a href="list-item.php" class="btn-list-item">List Item</a>
            <?php endif; ?>
            
            <div class="nav-icons">
                <button class="icon-btn" title="Notifications">
                    <i class="fas fa-bell"></i>
                    <span class="notification-badge"></span>
                </button>
                <button class="icon-btn" title="Messages">
                    <i class="fas fa-comment"></i>
                </button>
                <button class="icon-btn" title="Help">
                    <i class="fas fa-question-circle"></i>
                </button>
            </div>
            
            <img 
                src="https://ui-avatars.com/api/?name=<?php echo urlencode($currentUser['full_name'] ?? 'User'); ?>&background=fe742c&color=fff&size=40" 
                alt="User Avatar" 
                class="user-avatar"
                onclick="toggleUserMenu()"
            />
        <?php else: ?>
            <ul class="nav-links">
                <li><a href="index.html" class="nav-link">Sign In</a></li>
                <li><a href="signup.html" class="nav-link">Sign Up</a></li>
            </ul>
        <?php endif; ?>
    </div>
</nav>

<script>
function toggleUserMenu() {
    // TODO: Implement user dropdown menu
    console.log('User menu clicked');
}
</script>

