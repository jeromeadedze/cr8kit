# Cr8Kit Backend Setup Guide

This guide will help you set up the PHP and MySQL backend for the Cr8Kit application.

## Prerequisites

- PHP 7.4 or higher
- MySQL 5.7 or higher (or MariaDB 10.3+)
- Apache web server (or Nginx)
- PHP extensions: PDO, PDO_MySQL, mbstring

## Installation Steps

### 1. Database Setup

1. Open your MySQL client (phpMyAdmin, MySQL Workbench, or command line)
2. Import the database schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   Or use phpMyAdmin to import `database/schema.sql`

### 2. Database Configuration

1. Open `config/database.php`
2. Update the database credentials:
   ```php
   define('DB_HOST', 'localhost');      // Your MySQL host
   define('DB_NAME', 'cr8kit_db');      // Database name
   define('DB_USER', 'your_username');  // Your MySQL username
   define('DB_PASS', 'your_password');  // Your MySQL password
   ```

### 3. File Permissions

Ensure the following directories are writable (if needed):
```bash
chmod 755 config/
chmod 755 api/
chmod 755 includes/
```

### 4. Web Server Configuration

#### Apache (.htaccess included)
The `.htaccess` file is already included in the project root. Make sure:
- Apache has `mod_rewrite` enabled
- `.htaccess` files are allowed in your Apache configuration

#### Nginx
If using Nginx, add this to your server block:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
    fastcgi_index index.php;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}
```

### 5. Testing the Setup

1. Start your web server
2. Navigate to `http://localhost/Cr8kit/index.html` (adjust path as needed)
3. Try creating an account on the signup page
4. Try logging in with the created account

## Project Structure

```
Cr8kit/
├── api/
│   ├── login.php          # Login endpoint
│   ├── signup.php         # Registration endpoint
│   └── logout.php         # Logout endpoint
├── config/
│   └── database.php       # Database configuration
├── includes/
│   └── functions.php      # Utility functions
├── database/
│   └── schema.sql         # Database schema
├── css/
│   └── styles.css
├── js/
│   └── auth.js            # Frontend JavaScript
├── index.html             # Login page
├── signup.html            # Signup page
└── .htaccess              # Apache configuration
```

## API Endpoints

### POST /api/signup.php
Creates a new user account.

**Request Body:**
- `fullName` (string, required)
- `email` (string, required, valid email)
- `phoneNumber` (string, required, Ghana phone format)
- `password` (string, required, min 8 chars, uppercase, lowercase, number)
- `role` (string, required, 'renter' or 'owner')
- `termsAgreement` (boolean, required)

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully!",
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "renter"
  }
}
```

### POST /api/login.php
Authenticates a user and creates a session.

**Request Body:**
- `email` (string, required)
- `password` (string, required)
- `keepSignedIn` (boolean, optional)

**Response:**
```json
{
  "success": true,
  "message": "Login successful!",
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "renter"
  }
}
```

### POST /api/logout.php
Logs out the current user and destroys the session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Security Features

1. **Password Hashing**: Uses PHP's `password_hash()` with bcrypt
2. **SQL Injection Prevention**: All queries use prepared statements
3. **Input Sanitization**: All user inputs are sanitized
4. **Session Security**: Secure session configuration with httponly cookies
5. **Email Validation**: Server-side email format validation
6. **Phone Validation**: Ghana phone number format validation
7. **Password Strength**: Enforced password requirements

## Database Tables

### users
Stores user account information:
- `user_id` (Primary Key)
- `full_name`
- `email` (Unique)
- `phone_number` (Unique)
- `password_hash`
- `role` (renter/owner)
- `ghana_card_id` (for future verification)
- `is_verified`
- `is_active`
- `created_at`
- `updated_at`

### user_sessions
Tracks active user sessions (optional):
- `session_id`
- `user_id`
- `ip_address`
- `user_agent`
- `expires_at`

### password_reset_tokens
For password reset functionality (future use):
- `token_id`
- `user_id`
- `token`
- `expires_at`
- `used`

## Troubleshooting

### Database Connection Error
- Check database credentials in `config/database.php`
- Ensure MySQL service is running
- Verify database `cr8kit_db` exists

### 500 Internal Server Error
- Check PHP error logs
- Verify file permissions
- Ensure PHP extensions are installed (PDO, PDO_MySQL)

### CORS Errors
- If accessing from different domain, update CORS headers in `.htaccess`
- Or configure CORS in PHP files directly

### Session Issues
- Check PHP session configuration
- Ensure session directory is writable
- Verify cookie settings

## Next Steps

After setting up authentication:
1. Create dashboard pages for renters and owners
2. Implement equipment listing functionality
3. Add booking system
4. Integrate Paystack for payments
5. Add Ghana Card verification
6. Implement messaging system

## Development Notes

- Error logging is enabled for debugging
- In production, disable `display_errors` in `.htaccess`
- Use environment variables for sensitive configuration
- Implement rate limiting for API endpoints
- Add CSRF protection for forms

