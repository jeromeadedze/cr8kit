# How to View PHP Files - Setup Guide

## Understanding HTML vs PHP Files

### **HTML Files** (`index.html`, `signup.html`)

- **Static files** - Can be opened directly in your browser
- **No server needed** - Just double-click to open
- **Client-side only** - JavaScript runs in the browser
- **Used for**: Login and signup pages (simple forms)

### **PHP Files** (`index.php`, `dashboard.php`, `bookings.php`)

- **Dynamic files** - Need a web server with PHP installed
- **Server-side processing** - PHP code runs on the server before sending HTML to browser
- **Database access** - Can connect to MySQL database
- **Session management** - Can check if user is logged in
- **Used for**: Dashboard, bookings, equipment listing (need database and user data)

## Why the Mix?

**Current Setup:**

- `index.html` / `signup.html` → Static login/signup forms (no server needed)
- `index.php` → Home/browse page (needs PHP to check login, load equipment from database)
- `dashboard.php` → Dashboard (needs PHP to get user stats from database)
- `bookings.php` → Bookings page (needs PHP to load user bookings from database)

**The login/signup pages are HTML** because they're just forms that submit to PHP API endpoints (`api/login.php`, `api/signup.php`).

## How to View PHP Files

### Option 1: Using PHP Built-in Server (Easiest)

1. **Open Terminal/Command Prompt**
2. **Navigate to your project folder:**

   ```bash
   cd /Users/adedze/Desktop/Cr8kit
   ```

3. **Start PHP server:**

   ```bash
   php -S localhost:8000
   ```

4. **Open browser and go to:**
   - `http://localhost:8000/index.html` - Login page
   - `http://localhost:8000/signup.html` - Signup page
   - `http://localhost:8000/index.php` - Home/Browse page
   - `http://localhost:8000/dashboard.php` - Dashboard

### Option 2: Using XAMPP (Windows/Mac)

1. **Download XAMPP:** https://www.apachefriends.org/
2. **Install and start Apache + MySQL**
3. **Copy your project to:** `C:\xampp\htdocs\Cr8kit` (Windows) or `/Applications/XAMPP/htdocs/Cr8kit` (Mac)
4. **Access via:** `http://localhost/Cr8kit/index.html`

### Option 3: Using MAMP (Mac)

1. **Download MAMP:** https://www.mamp.info/
2. **Start MAMP servers**
3. **Copy project to:** `/Applications/MAMP/htdocs/Cr8kit`
4. **Access via:** `http://localhost:8888/Cr8kit/index.html`

## Database Setup (Required for PHP pages)

Before PHP pages work, you need to set up the database:

1. **Start MySQL** (via XAMPP/MAMP or standalone)
2. **Import the database:**

   ```bash
   mysql -u root -p < database/schema.sql
   ```

   Or use phpMyAdmin to import `database/schema.sql`

3. **Update database credentials** in `config/database.php`:
   ```php
   define('DB_USER', 'root');  // Your MySQL username
   define('DB_PASS', '');      // Your MySQL password
   ```

## Quick Test

1. **Start PHP server:**

   ```bash
   cd /Users/adedze/Desktop/Cr8kit
   php -S localhost:8000
   ```

2. **Test HTML files** (should work immediately):

   - Open: `http://localhost:8000/index.html`
   - Open: `http://localhost:8000/signup.html`

3. **Test PHP files** (need database setup first):
   - Open: `http://localhost:8000/index.php`
   - Open: `http://localhost:8000/dashboard.php`

## Troubleshooting

**"This site can't be reached"**

- Make sure PHP server is running
- Check the port number (8000)

**"Database connection failed"**

- Make sure MySQL is running
- Check database credentials in `config/database.php`
- Make sure database `cr8kit_db` exists

**"Page not found"**

- Make sure you're in the correct directory
- Check file names match exactly

## File Structure Summary

```
Cr8kit/
├── index.html          ← Static login page (open directly)
├── signup.html         ← Static signup page (open directly)
├── index.php           ← Home page (needs server + database)
├── dashboard.php       ← Dashboard (needs server + database)
├── bookings.php        ← Bookings (needs server + database)
├── api/
│   ├── login.php       ← Handles login (needs server + database)
│   └── signup.php      ← Handles signup (needs server + database)
└── config/
    └── database.php    ← Database config
```

## Recommendation

For consistency, you could convert `index.html` and `signup.html` to PHP files, but it's not necessary since they're just static forms. The current setup works fine!
