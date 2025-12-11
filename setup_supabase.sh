#!/bin/bash
# Supabase Setup Script
# This script helps you switch from MySQL to Supabase

echo "🔧 Cr8Kit Supabase Setup"
echo "========================"
echo ""

# Check if config files exist
if [ ! -f "config/database_supabase.php" ]; then
    echo "❌ Error: config/database_supabase.php not found"
    exit 1
fi

# Check if password is set
if grep -q "YOUR_DATABASE_PASSWORD" config/database_supabase.php; then
    echo "⚠️  WARNING: Database password not set in config/database_supabase.php"
    echo "   Please update the password before continuing."
    echo ""
    read -p "Have you updated the password? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please update config/database_supabase.php with your Supabase password first."
        exit 1
    fi
fi

# Backup existing config
if [ -f "config/database.php" ]; then
    echo "📦 Backing up existing config/database.php..."
    mv config/database.php config/database_mysql_backup.php
    echo "✅ Backed up to config/database_mysql_backup.php"
fi

# Switch to Supabase config
echo "🔄 Switching to Supabase config..."
mv config/database_supabase.php config/database.php
echo "✅ Switched to Supabase configuration"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure you've run the SQL schema in Supabase SQL Editor"
echo "2. Test connection: php -S localhost:8000"
echo "3. Visit: http://localhost:8000/connect_supabase.php"
echo ""

