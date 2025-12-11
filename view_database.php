<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Viewer - Cr8Kit</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
        }
        .section {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #FE742C;
            color: white;
        }
        tr:hover {
            background: #f9f9f9;
        }
        .count {
            font-size: 18px;
            font-weight: bold;
            color: #FE742C;
            margin: 10px 0;
        }
        .error {
            color: red;
            padding: 10px;
            background: #ffe6e6;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>Cr8Kit Database Viewer</h1>
    
    <?php
    require_once __DIR__ . '/config/database.php';
    
    $pdo = getDBConnection();
    
    if (!$pdo) {
        echo '<div class="error">❌ Database connection failed!</div>';
        exit;
    }
    
    echo '<div class="error">✅ Database connection successful!</div>';
    ?>
    
    <!-- Users Table -->
    <div class="section">
        <h2>Users (<?php
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
            $count = $stmt->fetch()['count'];
            echo $count;
        ?>)</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Verified</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                <?php
                $stmt = $pdo->query("SELECT user_id, full_name, email, phone_number, role, is_verified, created_at FROM users ORDER BY created_at DESC");
                $users = $stmt->fetchAll();
                foreach ($users as $user) {
                    echo "<tr>";
                    echo "<td>{$user['user_id']}</td>";
                    echo "<td>{$user['full_name']}</td>";
                    echo "<td>{$user['email']}</td>";
                    echo "<td>{$user['phone_number']}</td>";
                    echo "<td>{$user['role']}</td>";
                    echo "<td>" . ($user['is_verified'] ? '✅' : '❌') . "</td>";
                    echo "<td>{$user['created_at']}</td>";
                    echo "</tr>";
                }
                ?>
            </tbody>
        </table>
    </div>
    
    <!-- Equipment Table -->
    <div class="section">
        <h2>Equipment Listings (<?php
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM equipment");
            $count = $stmt->fetch()['count'];
            echo $count;
        ?>)</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price/Day</th>
                    <th>Location</th>
                    <th>Rating</th>
                    <th>Available</th>
                    <th>Owner</th>
                </tr>
            </thead>
            <tbody>
                <?php
                $stmt = $pdo->query("
                    SELECT e.equipment_id, e.name, e.category, e.price_per_day, e.location, e.city, 
                           e.rating, e.is_available, u.full_name as owner_name
                    FROM equipment e
                    INNER JOIN users u ON e.owner_id = u.user_id
                    ORDER BY e.created_at DESC
                ");
                $equipment = $stmt->fetchAll();
                foreach ($equipment as $item) {
                    echo "<tr>";
                    echo "<td>{$item['equipment_id']}</td>";
                    echo "<td>{$item['name']}</td>";
                    echo "<td>{$item['category']}</td>";
                    echo "<td>GHS " . number_format($item['price_per_day'], 2) . "</td>";
                    echo "<td>{$item['city']}</td>";
                    echo "<td>{$item['rating']}</td>";
                    echo "<td>" . ($item['is_available'] ? '✅' : '❌') . "</td>";
                    echo "<td>{$item['owner_name']}</td>";
                    echo "</tr>";
                }
                ?>
            </tbody>
        </table>
    </div>
    
    <!-- Bookings Table -->
    <div class="section">
        <h2>Bookings (<?php
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM bookings");
            $count = $stmt->fetch()['count'];
            echo $count;
        ?>)</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Booking #</th>
                    <th>Renter</th>
                    <th>Equipment</th>
                    <th>Dates</th>
                    <th>Total</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <?php
                $stmt = $pdo->query("
                    SELECT b.booking_id, b.booking_number, b.start_date, b.end_date, b.total_amount, b.status,
                           u.full_name as renter_name, e.name as equipment_name
                    FROM bookings b
                    INNER JOIN users u ON b.renter_id = u.user_id
                    INNER JOIN equipment e ON b.equipment_id = e.equipment_id
                    ORDER BY b.created_at DESC
                    LIMIT 20
                ");
                $bookings = $stmt->fetchAll();
                if (count($bookings) > 0) {
                    foreach ($bookings as $booking) {
                        echo "<tr>";
                        echo "<td>{$booking['booking_id']}</td>";
                        echo "<td>{$booking['booking_number']}</td>";
                        echo "<td>{$booking['renter_name']}</td>";
                        echo "<td>{$booking['equipment_name']}</td>";
                        echo "<td>{$booking['start_date']} to {$booking['end_date']}</td>";
                        echo "<td>GHS " . number_format($booking['total_amount'], 2) . "</td>";
                        echo "<td>{$booking['status']}</td>";
                        echo "</tr>";
                    }
                } else {
                    echo "<tr><td colspan='7' style='text-align: center; color: #999;'>No bookings yet</td></tr>";
                }
                ?>
            </tbody>
        </table>
    </div>
    
    <!-- Database Stats -->
    <div class="section">
        <h2>Database Statistics</h2>
        <?php
        $stats = [];
        
        // Total users
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
        $stats['total_users'] = $stmt->fetch()['count'];
        
        // Owners vs Renters
        $stmt = $pdo->query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
        $roleStats = $stmt->fetchAll();
        $stats['owners'] = 0;
        $stats['renters'] = 0;
        foreach ($roleStats as $stat) {
            if ($stat['role'] == 'owner') $stats['owners'] = $stat['count'];
            if ($stat['role'] == 'renter') $stats['renters'] = $stat['count'];
        }
        
        // Total equipment
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM equipment");
        $stats['total_equipment'] = $stmt->fetch()['count'];
        
        // Available equipment
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM equipment WHERE is_available = 1");
        $stats['available_equipment'] = $stmt->fetch()['count'];
        
        // Total bookings
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM bookings");
        $stats['total_bookings'] = $stmt->fetch()['count'];
        
        echo "<div class='count'>Total Users: {$stats['total_users']}</div>";
        echo "<div>Owners: {$stats['owners']} | Renters: {$stats['renters']}</div>";
        echo "<div class='count'>Total Equipment: {$stats['total_equipment']}</div>";
        echo "<div>Available: {$stats['available_equipment']} | Unavailable: " . ($stats['total_equipment'] - $stats['available_equipment']) . "</div>";
        echo "<div class='count'>Total Bookings: {$stats['total_bookings']}</div>";
        ?>
    </div>
    
</body>
</html>

