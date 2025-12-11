<?php
/**
 * Test Supabase Connection
 * Run this file to verify your Supabase connection is working
 */

// Try to load main config first, fallback to supabase config
if (file_exists(__DIR__ . '/config/database.php')) {
    require_once __DIR__ . '/config/database.php';
} else {
    require_once __DIR__ . '/config/database_supabase.php';
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Supabase Connection Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .success { color: green; padding: 10px; background: #e8f5e9; border-radius: 4px; margin: 10px 0; }
        .error { color: red; padding: 10px; background: #ffebee; border-radius: 4px; margin: 10px 0; }
        .info { padding: 10px; background: #e3f2fd; border-radius: 4px; margin: 10px 0; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Supabase Connection Test</h1>
    
    <?php
    echo '<div class="info">';
    echo '<strong>Configuration:</strong><br>';
    echo 'Host: ' . DB_HOST . '<br>';
    echo 'Database: ' . DB_NAME . '<br>';
    echo 'Port: ' . DB_PORT . '<br>';
    echo 'User: ' . DB_USER . '<br>';
    echo '</div>';
    
    $pdo = getDBConnection();
    
    if ($pdo) {
        echo '<div class="success">✅ Connection successful!</div>';
        
        try {
            // Test query
            $stmt = $pdo->query("SELECT version() as version");
            $version = $stmt->fetch();
            echo '<div class="info"><strong>PostgreSQL Version:</strong> ' . $version['version'] . '</div>';
            
            // Check if tables exist
            $stmt = $pdo->query("
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            ");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            echo '<div class="info">';
            echo '<strong>Tables found:</strong> ' . count($tables) . '<br>';
            echo implode(', ', $tables);
            echo '</div>';
            
            // Check users table
            if (in_array('users', $tables)) {
                $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
                $result = $stmt->fetch();
                echo '<div class="success">✅ Users table: ' . $result['count'] . ' records</div>';
            }
            
            // Check equipment table
            if (in_array('equipment', $tables)) {
                $stmt = $pdo->query("SELECT COUNT(*) as count FROM equipment");
                $result = $stmt->fetch();
                echo '<div class="success">✅ Equipment table: ' . $result['count'] . ' records</div>';
            }
            
        } catch (PDOException $e) {
            echo '<div class="error">❌ Query error: ' . $e->getMessage() . '</div>';
        }
        
    } else {
        echo '<div class="error">❌ Connection failed!</div>';
        echo '<div class="info">';
        echo '<strong>Common issues:</strong><br>';
        echo '1. Check your Supabase credentials in config/database_supabase.php<br>';
        echo '2. Make sure your Supabase project is active<br>';
        echo '3. Verify your database password is correct<br>';
        echo '4. Check if your IP is allowed (Supabase → Settings → Database → Connection Pooling)<br>';
        echo '</div>';
    }
    ?>
    
    <hr>
    <h2>Next Steps</h2>
    <ol>
        <li>If connection works, rename <code>config/database_supabase.php</code> to <code>config/database.php</code></li>
        <li>Or update all API files to use <code>database_supabase.php</code></li>
        <li>Run the schema: Copy <code>database/schema_supabase.sql</code> to Supabase SQL Editor</li>
        <li>Run the seed data: Copy <code>database/seed_supabase.sql</code> to Supabase SQL Editor</li>
        <li>Test signup/login functionality</li>
    </ol>
</body>
</html>

