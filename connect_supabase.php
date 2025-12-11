<?php
/**
 * Supabase Connection Helper
 * This script helps you test and configure your Supabase connection
 */

// Check if config file exists
$supabaseConfig = __DIR__ . '/config/database_supabase.php';
$mainConfig = __DIR__ . '/config/database.php';

?>
<!DOCTYPE html>
<html>
<head>
    <title>Supabase Connection Helper</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { color: green; padding: 10px; background: #e8f5e9; border-radius: 4px; margin: 10px 0; }
        .error { color: red; padding: 10px; background: #ffebee; border-radius: 4px; margin: 10px 0; }
        .warning { color: orange; padding: 10px; background: #fff3e0; border-radius: 4px; margin: 10px 0; }
        .info { padding: 10px; background: #e3f2fd; border-radius: 4px; margin: 10px 0; }
        .step { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #FE742C; }
        .step-number { font-weight: bold; color: #FE742C; }
        code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .btn { display: inline-block; padding: 10px 20px; background: #FE742C; color: white; text-decoration: none; border-radius: 4px; margin: 5px; }
        .btn:hover { background: #e6631a; }
    </style>
</head>
<body>
    <h1>🔧 Supabase Connection Helper</h1>
    
    <?php
    // Step 1: Check config files
    echo '<div class="card">';
    echo '<h2>Step 1: Configuration Files</h2>';
    
    if (file_exists($supabaseConfig)) {
        echo '<div class="success">✅ Supabase config file exists: <code>config/database_supabase.php</code></div>';
        
        // Check if password is set
        $configContent = file_get_contents($supabaseConfig);
        if (strpos($configContent, 'YOUR_DATABASE_PASSWORD') !== false) {
            echo '<div class="warning">⚠️ Database password not set yet. You need to update it in the config file.</div>';
        } else {
            echo '<div class="success">✅ Database password appears to be set</div>';
        }
    } else {
        echo '<div class="error">❌ Supabase config file not found: <code>config/database_supabase.php</code></div>';
    }
    
    if (file_exists($mainConfig)) {
        $mainConfigContent = file_get_contents($mainConfig);
        if (strpos($mainConfigContent, 'pgsql') !== false || strpos($mainConfigContent, 'supabase') !== false) {
            echo '<div class="success">✅ Main config file appears to be using Supabase</div>';
        } else {
            echo '<div class="warning">⚠️ Main config file (<code>config/database.php</code>) is still using MySQL. You need to switch to Supabase config.</div>';
            echo '<div class="info">Run these commands in terminal:<br><pre>cd /Users/adedze/Desktop/Cr8kit
mv config/database.php config/database_mysql_backup.php
mv config/database_supabase.php config/database.php</pre></div>';
        }
    } else {
        echo '<div class="error">❌ Main config file not found: <code>config/database.php</code></div>';
    }
    echo '</div>';
    
    // Step 2: Test connection
    echo '<div class="card">';
    echo '<h2>Step 2: Test Database Connection</h2>';
    
    if (file_exists($mainConfig)) {
        require_once $mainConfig;
        $pdo = getDBConnection();
        
        if ($pdo) {
            echo '<div class="success">✅ Database connection successful!</div>';
            
            try {
                // Test query
                $stmt = $pdo->query("SELECT version() as version");
                $version = $stmt->fetch();
                echo '<div class="info"><strong>PostgreSQL Version:</strong> ' . htmlspecialchars($version['version']) . '</div>';
                
                // Check tables
                $stmt = $pdo->query("
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name
                ");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                echo '<div class="info"><strong>Tables found:</strong> ' . count($tables) . '</div>';
                
                $requiredTables = ['users', 'equipment', 'bookings', 'ratings', 'equipment_images', 'user_sessions', 'password_reset_tokens', 'messages'];
                $missingTables = array_diff($requiredTables, $tables);
                
                if (empty($missingTables)) {
                    echo '<div class="success">✅ All required tables exist!</div>';
                } else {
                    echo '<div class="warning">⚠️ Missing tables: ' . implode(', ', $missingTables) . '</div>';
                    echo '<div class="info">Run <code>database/schema_supabase.sql</code> in Supabase SQL Editor</div>';
                }
                
                // Check data
                if (in_array('users', $tables)) {
                    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
                    $userCount = $stmt->fetch()['count'];
                    echo '<div class="info"><strong>Users in database:</strong> ' . $userCount . '</div>';
                }
                
                if (in_array('equipment', $tables)) {
                    $stmt = $pdo->query("SELECT COUNT(*) as count FROM equipment");
                    $equipmentCount = $stmt->fetch()['count'];
                    echo '<div class="info"><strong>Equipment in database:</strong> ' . $equipmentCount . '</div>';
                }
                
            } catch (PDOException $e) {
                echo '<div class="error">❌ Query error: ' . htmlspecialchars($e->getMessage()) . '</div>';
            }
            
        } else {
            echo '<div class="error">❌ Database connection failed!</div>';
            echo '<div class="info">';
            echo '<strong>Common issues:</strong><br>';
            echo '1. Check your database password in <code>config/database.php</code><br>';
            echo '2. Make sure your Supabase project is active<br>';
            echo '3. Verify the host is: <code>db.ibvzepzwoytvhrnllywi.supabase.co</code><br>';
            echo '4. Check if your IP is allowed (Supabase → Settings → Database)<br>';
            echo '</div>';
        }
    } else {
        echo '<div class="error">❌ Cannot test connection - config file not found</div>';
    }
    echo '</div>';
    
    // Step 3: Quick actions
    echo '<div class="card">';
    echo '<h2>Step 3: Quick Actions</h2>';
    echo '<div class="step">';
    echo '<span class="step-number">1.</span> Get your database password from Supabase Dashboard → Settings → Database';
    echo '</div>';
    echo '<div class="step">';
    echo '<span class="step-number">2.</span> Update <code>config/database_supabase.php</code> with your password';
    echo '</div>';
    echo '<div class="step">';
    echo '<span class="step-number">3.</span> Run SQL files in Supabase SQL Editor:<br>';
    echo '<ul>';
    echo '<li><code>database/schema_supabase.sql</code> - Create all tables</li>';
    echo '<li><code>database/add_messages_table.sql</code> - Add messages table</li>';
    echo '<li><code>database/seed_supabase.sql</code> - Add sample data (optional)</li>';
    echo '</ul>';
    echo '</div>';
    echo '<div class="step">';
    echo '<span class="step-number">4.</span> Switch config files:<br>';
    echo '<pre>mv config/database.php config/database_mysql_backup.php
mv config/database_supabase.php config/database.php</pre>';
    echo '</div>';
    echo '<div class="step">';
    echo '<span class="step-number">5.</span> Test your app:<br>';
    echo '<ul>';
    echo '<li><a href="test_supabase.php" class="btn">Test Connection</a></li>';
    echo '<li><a href="signup.html" class="btn">Test Signup</a></li>';
    echo '<li><a href="browse.html" class="btn">Test Browse</a></li>';
    echo '</ul>';
    echo '</div>';
    echo '</div>';
    
    // Step 4: Direct links
    echo '<div class="card">';
    echo '<h2>Step 4: Supabase Dashboard Links</h2>';
    echo '<div class="info">';
    echo '<strong>Your Supabase Project:</strong><br>';
    echo '<a href="https://supabase.com/dashboard/project/ibvzepzwoytvhrnllywi" target="_blank">Open Supabase Dashboard</a><br><br>';
    echo '<strong>Quick Links:</strong><br>';
    echo '<a href="https://supabase.com/dashboard/project/ibvzepzwoytvhrnllywi/settings/database" target="_blank">Database Settings</a> (get password here)<br>';
    echo '<a href="https://supabase.com/dashboard/project/ibvzepzwoytvhrnllywi/editor" target="_blank">SQL Editor</a> (run schema here)<br>';
    echo '<a href="https://supabase.com/dashboard/project/ibvzepzwoytvhrnllywi/editor" target="_blank">Table Editor</a> (view data here)<br>';
    echo '</div>';
    echo '</div>';
    ?>
    
</body>
</html>

