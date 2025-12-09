# Quick Start Guide - Viewing Your Cr8Kit Project

## The Difference: HTML vs PHP

### ✅ **HTML Files** (Can open directly)
- `index.html` - Login page
- `signup.html` - Signup page
- **Just double-click** these files to open in your browser!

### ⚙️ **PHP Files** (Need a web server)
- `index.php` - Home/Browse page
- `dashboard.php` - Dashboard
- `bookings.php` - My Bookings
- **These need PHP installed** to run

## Why PHP?

**HTML files** are static - they just display content.

**PHP files** are dynamic - they:
- Check if you're logged in
- Load data from the database
- Show different content based on user
- Process forms on the server

## How to View Everything

### Step 1: View HTML Files (Easy!)
Just double-click:
- `index.html` → Opens login page
- `signup.html` → Opens signup page

These work immediately! ✅

### Step 2: Install PHP (For PHP files)

**On Mac:**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PHP
brew install php
```

**On Windows:**
- Download XAMPP: https://www.apachefriends.org/
- Install it (includes PHP + MySQL)

**On Linux:**
```bash
sudo apt-get install php php-mysql
```

### Step 3: Start PHP Server

Open Terminal in your project folder:
```bash
cd /Users/adedze/Desktop/Cr8kit
php -S localhost:8000
```

Then open in browser:
- `http://localhost:8000/index.html` - Login
- `http://localhost:8000/index.php` - Home page
- `http://localhost:8000/dashboard.php` - Dashboard

### Step 4: Set Up Database (For full functionality)

1. Install MySQL (or use XAMPP/MAMP which includes it)
2. Import database:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
3. Update `config/database.php` with your MySQL password

## Current Status

✅ **Working Now:**
- Login page (`index.html`) - Just open it!
- Signup page (`signup.html`) - Just open it!
- Form validation - Works in browser

⏳ **Need PHP Server:**
- Home page (`index.php`)
- Dashboard (`dashboard.php`)
- Bookings (`bookings.php`)
- API endpoints (`api/login.php`, `api/signup.php`)

## Alternative: Use Online PHP Hosting

If you want to test PHP files without installing locally:
1. Upload to a free hosting service (000webhost, InfinityFree, etc.)
2. Or use a service like CodeSandbox/CodePen (limited)

## Summary

- **HTML files** = Open directly ✅
- **PHP files** = Need PHP server + database ⚙️
- **Login/Signup forms** = Work now (they submit to PHP APIs)
- **Dashboard/Home** = Need server setup

The login and signup pages work perfectly as HTML files because they use JavaScript to submit to PHP API endpoints!

