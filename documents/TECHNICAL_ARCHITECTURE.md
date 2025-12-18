# Cr8Kit Technical Architecture & Implementation

This document outlines the unique technical implementations in the Cr8Kit project and explains how the backend connects to the frontend.

---

## Table of Contents
1. [Backend-Frontend Architecture](#backend-frontend-architecture)
2. [Unique Implementations](#unique-implementations)
3. [Data Flow Patterns](#data-flow-patterns)
4. [Security Implementations](#security-implementations)

---

## Backend-Frontend Architecture

### Overview
Cr8Kit uses a **serverless architecture** with:
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Supabase (PostgreSQL database + Auth + Edge Functions)
- **Communication**: Direct database queries via Supabase JavaScript Client

### Connection Flow

```
Frontend (Browser)
    ↓
Supabase JavaScript Client (CDN)
    ↓
Supabase Cloud (Backend)
    ├── PostgreSQL Database
    ├── Authentication Service
    └── Edge Functions (Serverless)
```

### How Frontend Connects to Backend

#### 1. **Supabase Client Initialization** (`js/supa.js`)
```javascript
// Load Supabase SDK from CDN
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>

// Initialize global client
const SUPABASE_URL = "https://ibvzepzwoytvhrnllywi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_...";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
```

**Key Files:**
- `js/supa.js` - Main Supabase client and global utilities
- Every HTML page includes this via `<script src="js/supa.js">`

#### 2. **Database Queries**

**Read Example** (from `js/bookings.js`):
```javascript
const { data: bookings, error } = await window.supabaseClient
  .from("bookings")
  .select(`
    *,
    equipment:equipment_id ( name, image_url, category ),
    owner:owner_id ( full_name, email ),
    renter:renter_id ( full_name, email )
  `)
  .eq("renter_id", userId)
  .order("created_at", { ascending: false });
```

**Write Example** (from `js/equipment-details.js`):
```javascript
const { data, error } = await window.supabaseClient
  .from("bookings")
  .insert({
    renter_id: userId,
    equipment_id: equipmentId,
    booking_number: generateBookingNumber(),
    start_date: startDate,
    end_date: endDate,
    total_amount: totalPrice,
    status: "pending"
  })
  .select()
  .single();
```

**Update Example** (from `js/profile.js`):
```javascript
const { error } = await window.supabaseClient
  .from("users")
  .update({
    ghana_card_image: imageUrl,
    ghana_card_id: ghanaCardId
  })
  .eq("user_id", userId);
```

#### 3. **Authentication Flow**

**Sign Up** (`js/auth.js`):
```javascript
// 1. Create auth user in Supabase Auth
const { data: authData, error: authError } = 
  await window.supabaseClient.auth.signUp({
    email: email,
    password: password
  });

// 2. Create user profile in users table
const profile = await window.getOrCreateUserProfile(
  email,
  fullName,
  phoneNumber,
  role
);
```

**Sign In** (`js/auth.js`):
```javascript
// 1. Authenticate with Supabase
const { data: authData, error: authError } = 
  await window.supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

// 2. Get user profile from database
const profile = await window.getOrCreateUserProfile(email);

// 3. Store in localStorage for fast access
localStorage.setItem("cr8kit_profile", JSON.stringify(profile));

// 4. Redirect based on role
if (profile.is_admin) {
  window.location.href = "admin.html";
} else {
  window.location.href = "browse.html";
}
```

**Session Management**:
```javascript
// Check if user is authenticated
const { data: { user }, error } = 
  await window.supabaseClient.auth.getUser();

// Get user profile by ID
const userId = await window.getCurrentUserId();
```

#### 4. **Edge Functions (Serverless Backend)**

**Location**: `supabase/functions/send-email/index.ts`

**Purpose**: Send transactional emails via Resend API

**How Frontend Calls It**:
```javascript
// From js/equipment-details.js
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/send-email`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      to: ownerEmail,
      subject: "New Booking Request",
      html: emailTemplate,
      type: "booking_request"
    })
  }
);
```

**What It Does**:
- Receives email data from frontend
- Validates input
- Sends email via Resend API
- Returns success/error response

---

## Unique Implementations

### 1. **Custom Modal System** (`js/modal-utils.js`)

**Why Unique**: Replaces native browser `alert()` and `confirm()` with beautiful, branded modals.

**Features**:
- Promise-based API
- Animated transitions
- Customizable icons and colors
- Toast notifications
- Dark theme by default

**Usage**:
```javascript
// Alert
await showAlert("Your booking was successful!", {
  type: "success",
  title: "Success"
});

// Confirm
const confirmed = await showConfirm("Delete this item?", {
  dangerous: true,
  confirmText: "Delete",
  cancelText: "Keep"
});

// Toast
showToast("Profile updated!", { type: "success" });
```

**Implementation Highlights**:
- Injects styles dynamically into `<head>`
- Creates modal overlays on-the-fly
- Cleans up after closing (removes DOM elements)
- Keyboard support (ESC to close)

---

### 2. **Dynamic Avatar Generation**

**Location**: `js/supa.js` - `updateUserInfo()`

**How It Works**:
```javascript
// Generate avatar from user's name using ui-avatars.com API
avatarImg.src = `https://ui-avatars.com/api/?name=${
  encodeURIComponent(profile.full_name)
}&background=fe742c&color=fff&size=${size}`;
```

**Features**:
- No need to upload profile pictures
- Automatically generates from user's initials
- Brand-colored backgrounds
- Different sizes for different contexts (40px, 60px, 120px)
- Marked with `data-dynamic-avatar="true"` attribute

**Where Used**:
- Navigation bar
- Profile page
- Equipment owner listings
- Booking cards

---

### 3. **Real-Time Notification Badge**

**Location**: `js/supa.js` - `updateGlobalNotificationBadge()`

**How It Works**:
```javascript
// 1. Fetch unread notifications count
const { data: notifications } = await window.supabaseClient
  .from("notifications")
  .select("notification_id")
  .eq("user_id", userId)
  .eq("is_read", false);

// 2. Update badge on all pages
const unreadCount = notifications?.length || 0;
badges.forEach(badge => {
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
});
```

**Features**:
- Updates on every page load
- Updates when tab becomes visible (user switches back)
- Automatically hides on notifications page
- Shows "99+" for counts over 99
- Global function can be called from anywhere

---

### 4. **Interactive Calendar Booking System**

**Location**: `js/equipment-details.js`

**Unique Features**:
- Custom-built calendar widget (no libraries!)
- Date range selection
- Visual indication of booked dates
- Dynamic price calculation
- Infinite scroll (loads future months)

**How It Works**:

**1. Fetch Booked Dates**:
```javascript
const { data: bookings } = await window.supabaseClient
  .from("bookings")
  .select("start_date, end_date")
  .eq("equipment_id", equipmentId)
  .in("status", ["pending", "approved", "active"]);

// Convert to Date objects
bookedDates = bookings.map(b => ({
  start: new Date(b.start_date),
  end: new Date(b.end_date)
}));
```

**2. Render Calendar**:
```javascript
function renderCalendar() {
  // Generate calendar grid
  // Mark booked dates as disabled
  // Highlight selected range
  // Handle click events
}
```

**3. Calculate Price on Selection**:
```javascript
const days = Math.ceil((endDate - startDate) / (1000*60*60*24)) + 1;
const basePrice = pricePerDay * days;
const serviceFee = basePrice * 0.10;
const insurance = basePrice * 0.05;
const total = basePrice + serviceFee + insurance;
```

**4. Create Booking**:
```javascript
const booking = await window.supabaseClient
  .from("bookings")
  .insert({ /* booking data */ });
  
// Create notification for owner
await window.supabaseClient
  .from("notifications")
  .insert({
    user_id: ownerId,
    type: "booking_request",
    title: "New Booking Request",
    message: `${renterName} wants to rent your ${equipmentName}`
  });

// Send email to owner
await sendBookingRequestEmail(equipmentId, ownerId, bookingDetails);
```

---

### 5. **Dual-Role Booking Management**

**Location**: `js/bookings.js`, `js/my-listings.js`

**Unique Aspect**: Same user can be both renter and owner

**How It Works**:

```javascript
// Bookings as RENTER (equipment I'm borrowing)
const { data: renterBookings } = await window.supabaseClient
  .from("bookings")
  .select("*")
  .eq("renter_id", userId);

// Bookings as OWNER (my equipment being rented)
const { data: ownerBookings } = await window.supabaseClient
  .from("bookings")
  .select("*")
  .eq("owner_id", userId);
```

**Different Actions by Role**:

| Status | Renter Actions | Owner Actions |
|--------|----------------|---------------|
| Pending | Cancel | Approve / Reject |
| Approved | Pay | Mark as Completed |
| Active | Mark as Returned | Confirm Return |
| Completed | Rate & Review | Rate & Review |

**Implementation**:
```javascript
// Show different buttons based on user role
const isOwner = booking.owner_id === userId;
const isRenter = booking.renter_id === userId;

if (isOwner && status === "pending") {
  buttons = `
    <button onclick="approveBooking(${bookingId})">Approve</button>
    <button onclick="rejectBooking(${bookingId})">Reject</button>
  `;
} else if (isRenter && status === "approved") {
  buttons = `<button onclick="payBooking(${bookingId})">Pay Now</button>`;
}
```

---

### 6. **Ghana Card Verification System**

**Location**: `js/admin.js`, `js/profile.js`

**Workflow**:

1. **User Uploads Ghana Card** (`profile.js`):
```javascript
// 1. Upload image to Supabase Storage
const { data, error } = await window.supabaseClient.storage
  .from("ghana-cards")
  .upload(`${userId}-${Date.now()}.jpg`, file);

// 2. Get public URL
const { data: { publicUrl } } = window.supabaseClient.storage
  .from("ghana-cards")
  .getPublicUrl(data.path);

// 3. Update user profile
await window.supabaseClient
  .from("users")
  .update({
    ghana_card_image: publicUrl,
    ghana_card_id: ghanaCardNumber
  })
  .eq("user_id", userId);
```

2. **Admin Reviews** (`admin.html`):
```javascript
// Fetch pending verifications
const { data: users } = await window.supabaseClient
  .from("users")
  .select("*")
  .not("ghana_card_image", "is", null)
  .eq("is_verified", false);

// Display grid of cards for review
```

3. **Admin Approves** (`admin.js`):
```javascript
async function approveGhanaCard(userId) {
  // Update verification status
  const { error } = await window.supabaseClient
    .from("users")
    .update({ is_verified: true })
    .eq("user_id", userId);

  // Create notification
  await window.supabaseClient
    .from("notifications")
    .insert({
      user_id: userId,
      type: "verification_approved",
      title: "Ghana Card Verified",
      message: "Your Ghana Card has been verified!"
    });
}
```

**Unique Aspects**:
- Uses Supabase Storage for images
- Real-time updates without page refresh
- Admin-only access (checking `is_admin` flag)
- Visual badge on user profiles

---

### 7. **Row Level Security (RLS)**

**Location**: Supabase Database Policies

**What It Is**: Database-level security that restricts data access based on the authenticated user.

**Example Policies**:

```sql
-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.email() = email);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.email() = email);

-- Users can only see bookings they're involved in
CREATE POLICY "Users can view their bookings"
ON bookings FOR SELECT
USING (
  renter_id = (SELECT user_id FROM users WHERE email = auth.email())
  OR
  owner_id = (SELECT user_id FROM users WHERE email = auth.email())
);
```

**Benefits**:
- **Security**: Even if frontend is compromised, users can't access others' data
- **No Backend Code**: Database handles authorization automatically
- **Simplified Frontend**: No need to filter results client-side

**Implementation in Frontend**:
```javascript
// Just query - RLS automatically filters results
const { data } = await window.supabaseClient
  .from("bookings")
  .select("*");  // Only returns user's own bookings
```

---

### 8. **Complex Relational Queries**

**Location**: Throughout `js/` files

**Unique Aspect**: Nested queries with multiple JOIN-like operations

**Example** (from `js/bookings.js`):
```javascript
const { data: bookings } = await window.supabaseClient
  .from("bookings")
  .select(`
    *,
    equipment:equipment_id (
      equipment_id,
      name,
      image_url,
      category,
      location,
      owner:owner_id (
        user_id,
        full_name,
        email
      )
    ),
    renter:renter_id (
      user_id,
      full_name,
      email
    )
  `)
  .eq("owner_id", userId);
```

**What This Returns**:
```javascript
{
  booking_id: 123,
  booking_number: "BK12345",
  status: "approved",
  equipment: {
    equipment_id: 456,
    name: "Canon EOS R5",
    image_url: "...",
    owner: {
      user_id: 789,
      full_name: "John Doe",
      email: "john@example.com"
    }
  },
  renter: {
    user_id: 101,
    full_name: "Jane Smith",
    email: "jane@example.com"
  }
}
```

**Benefits**:
- All data in one query (no N+1 problem)
- Reduces round trips to database
- Type-safe with TypeScript on backend

---

### 9. **Automatic Notification System**

**Location**: `js/notifications.js`, throughout app

**How It Works**:

**1. Create Notification**:
```javascript
async function createNotification(userId, type, title, message, relatedIds) {
  await window.supabaseClient
    .from("notifications")
    .insert({
      user_id: userId,
      type: type,
      title: title,
      message: message,
      related_booking_id: relatedIds.bookingId,
      related_equipment_id: relatedIds.equipmentId,
      is_read: false
    });
}
```

**2. Triggered On**:
- New booking request → notify owner
- Booking approved → notify renter
- Payment received → notify owner
- Equipment returned → notify owner
- Review posted → notify equipment owner

**3. Display in UI**:
```javascript
// Grouped by date (Today, Yesterday, etc.)
// Different icons and colors by type
// Action buttons (Review, Approve, Pay Now, etc.)
// Real-time badge updates
```

**Unique Features**:
- Type-based styling (colors, icons)
- Embedded action buttons
- Smart grouping by date
- Auto-hide badge on notifications page
- Mark as read individually or all at once

---

### 10. **Rating & Review System**

**Location**: `js/bookings.js` - `showRatingModal()`

**Workflow**:

1. **After Rental Completes**:
```javascript
// Show rating modal
const modal = showRatingModal(booking, userId);
```

2. **User Submits Review**:
```javascript
// Save to ratings table
await window.supabaseClient
  .from("ratings")
  .insert({
    booking_id: booking.booking_id,
    reviewer_id: userId,
    reviewee_id: equipmentOwnerId,
    equipment_id: booking.equipment_id,
    rating: stars,
    comment: reviewText
  });

// Update equipment average rating
await updateEquipmentRating(booking.equipment_id);
```

3. **Calculate Average**:
```javascript
async function updateEquipmentRating(equipmentId) {
  // Get all ratings for this equipment
  const { data: ratings } = await window.supabaseClient
    .from("ratings")
    .select("rating")
    .eq("equipment_id", equipmentId);

  // Calculate average
  const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  // Update equipment table
  await window.supabaseClient
    .from("equipment")
    .update({ rating: avg })
    .eq("equipment_id", equipmentId);
}
```

**Unique Aspects**:
- Prevents duplicate reviews (UNIQUE constraint on booking + reviewer)
- Ratings for both equipment AND owner
- Real-time average calculation
- Display on equipment details page

---

### 11. **Owner Profile Modal**

**Location**: `js/equipment-details.js` - `showOwnerProfile()`

**Features**:
- Shows owner's bio, rating, and stats
- Lists all their equipment
- Creates modal dynamically
- No separate page needed

**Implementation**:
```javascript
async function showOwnerProfile() {
  // 1. Fetch owner data
  const { data: owner } = await window.supabaseClient
    .from("users")
    .select("*")
    .eq("user_id", ownerId)
    .single();

  // 2. Fetch owner's equipment
  const { data: equipment } = await window.supabaseClient
    .from("equipment")
    .select("*")
    .eq("owner_id", ownerId);

  // 3. Calculate owner rating
  const { data: ratings } = await window.supabaseClient
    .from("ratings")
    .select("rating")
    .eq("reviewee_id", ownerId);

  // 4. Create and show modal with all data
  showModal(owner, equipment, avgRating);
}
```

---

### 12. **Smart Search & Filtering**

**Location**: `js/browse.js`

**Features**:
- Real-time search as you type
- Multi-filter (category, location, price)
- Debounced queries (waits 300ms before searching)

**Implementation**:
```javascript
let searchTimeout;

function handleSearch(query) {
  // Clear previous timeout
  clearTimeout(searchTimeout);
  
  // Wait 300ms before searching
  searchTimeout = setTimeout(async () => {
    let queryBuilder = window.supabaseClient
      .from("equipment")
      .select("*")
      .eq("is_available", true);
    
    // Add filters
    if (query) {
      queryBuilder = queryBuilder.ilike("name", `%${query}%`);
    }
    if (category) {
      queryBuilder = queryBuilder.eq("category", category);
    }
    if (maxPrice) {
      queryBuilder = queryBuilder.lte("price_per_day", maxPrice);
    }
    
    const { data } = await queryBuilder;
    renderResults(data);
  }, 300);
}
```

---

## Data Flow Patterns

### Example: Creating a Booking

```
1. User selects dates on calendar
   ↓
2. Frontend validates dates (no overlap with booked dates)
   ↓
3. Calculate pricing (base + fees)
   ↓
4. User clicks "Request Booking"
   ↓
5. INSERT into bookings table
   ↓
6. CREATE notification for equipment owner
   ↓
7. SEND email via Edge Function
   ↓
8. REDIRECT user to bookings page
   ↓
9. Owner sees notification badge (real-time update)
   ↓
10. Owner reviews and approves
   ↓
11. UPDATE booking status to "approved"
   ↓
12. CREATE notification for renter
   ↓
13. SEND approval email via Edge Function
```

### Example: User Authentication

```
1. User enters email/password
   ↓
2. Frontend validates input
   ↓
3. Call supabaseClient.auth.signIn()
   ↓
4. Supabase Auth verifies credentials
   ↓
5. Returns JWT token (stored in httpOnly cookie)
   ↓
6. Frontend fetches user profile from users table
   ↓
7. Store profile in localStorage (for fast access)
   ↓
8. Check is_admin flag
   ↓
9. Redirect to appropriate page (admin.html or browse.html)
   ↓
10. All subsequent requests include JWT automatically
```

---

## Security Implementations

### 1. **Row Level Security (RLS)**
- Users can only access their own data
- Enforced at database level
- Prevents unauthorized access even if frontend is compromised

### 2. **JWT Authentication**
- Supabase handles token generation/validation
- Tokens auto-refresh
- Stored in httpOnly cookies (XSS protection)

### 3. **Input Validation**
- Frontend validation (UX)
- Backend validation (database constraints)
- SQL injection prevention (parameterized queries)

### 4. **File Upload Security**
- File size limits
- Type restrictions (images only)
- Stored in isolated bucket (ghana-cards)
- Public URLs are read-only

### 5. **Admin-Only Routes**
```javascript
// Check admin status before showing admin page
const { data: profile } = await window.supabaseClient
  .from("users")
  .select("is_admin")
  .eq("email", user.email)
  .single();

if (!profile.is_admin) {
  window.location.href = "browse.html";  // Redirect
}
```

---

## Summary

### Backend Connection Methods:
1. **Supabase JavaScript Client** - Main communication layer
2. **PostgreSQL Queries** - Via Supabase client (SELECT, INSERT, UPDATE, DELETE)
3. **Authentication** - Supabase Auth service
4. **File Storage** - Supabase Storage for images
5. **Edge Functions** - Serverless backend for emails

### Unique Implementations:
1. Custom modal system (no external libraries)
2. Dynamic avatar generation
3. Real-time notification badges
4. Interactive calendar booking system
5. Dual-role booking management
6. Ghana Card verification workflow
7. Row Level Security policies
8. Complex relational queries
9. Automatic notification system
10. Rating & review system with averages
11. Owner profile modals
12. Debounced search & filtering

### Key Strengths:
- **No backend code** - Serverless architecture
- **Type-safe queries** - PostgreSQL + Supabase client
- **Real-time updates** - Via Supabase subscriptions (can be added)
- **Security-first** - RLS policies + JWT tokens
- **Modern UX** - Custom modals, animations, responsive design

---

