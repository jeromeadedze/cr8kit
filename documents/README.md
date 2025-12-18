# Cr8Kit Page Flow Diagrams

This directory contains PlantUML diagrams documenting the page flows and user journeys for the Cr8Kit application.

## 📊 Diagrams

### 1. Page Navigation Map (`1-page-navigation-map.puml`)
**Type:** Component Diagram  
**Purpose:** Shows all pages in the application and how they connect to each other  
**Best For:** Understanding the overall application structure

### 2. User Journey (`2-user-journey.puml`)
**Type:** Activity Diagram  
**Purpose:** Shows the complete user journey from sign-in through various features  
**Best For:** Understanding user flows and decision points

### 3. Authentication Flow (`3-authentication-flow.puml`)
**Type:** Activity Diagram  
**Purpose:** Details the authentication and authorization logic  
**Best For:** Understanding access control and role-based redirects

### 4. Booking Flow (`4-booking-flow.puml`)
**Type:** Activity Diagram with Swimlanes  
**Purpose:** Shows the complete booking process from browse to payment  
**Best For:** Understanding renter/owner interactions

### 5. Listing Flow (`5-listing-flow.puml`)
**Type:** Activity Diagram  
**Purpose:** Shows how equipment listings are created and managed  
**Best For:** Understanding the listing management process

### 6. Admin Verification (`6-admin-verification.puml`)
**Type:** Activity Diagram with Swimlanes  
**Purpose:** Shows the Ghana Card verification workflow  
**Best For:** Understanding admin verification process

### 7. Notification Flow (`7-notification-flow.puml`)
**Type:** Activity Diagram  
**Purpose:** Shows how notifications are created and handled  
**Best For:** Understanding the notification system

### 8. State Diagram (`8-state-diagram.puml`)
**Type:** State Diagram  
**Purpose:** Simplified page navigation state machine  
**Best For:** Quick visual reference of page transitions

## 🚀 How to Use

### Option 1: VS Code
1. Install the **PlantUML** extension
2. Open any `.puml` file
3. Press `Alt+D` (or `Option+D` on Mac) to preview

### Option 2: Online
1. Go to [plantuml.com](http://www.plantuml.com/plantuml/uml/)
2. Copy the contents of any `.puml` file
3. Paste and view the rendered diagram

### Option 3: Command Line
```bash
# Install PlantUML
brew install plantuml

# Generate PNG
plantuml 1-page-navigation-map.puml

# Generate SVG
plantuml -tsvg 1-page-navigation-map.puml

# Generate all diagrams
plantuml *.puml
```

## 🎨 Color Scheme

All diagrams use the Cr8Kit brand colors:
- Primary: `#FE742C` (Orange)
- Background: `#FFF5EB` (Light Cream)
- Accent: `#FFE0CC` (Light Orange)

## 📄 Pages Reference

| Page | Purpose |
|------|---------|
| `index.html` | Sign In page (entry point) |
| `signup.html` | Create new account |
| `admin.html` | Admin dashboard (Ghana Card verification) |
| `browse.html` | Main equipment browsing page |
| `equipment-details.html` | Individual equipment details |
| `dashboard.html` | User dashboard with stats |
| `bookings.html` | User's bookings (as renter) |
| `my-listings.html` | User's equipment listings (as owner) |
| `list-item.html` | Create/edit equipment listing |
| `profile.html` | User profile and settings |
| `notifications.html` | User notifications |

## 🔄 User Roles

### Regular User
- Browse equipment
- Book equipment
- List own equipment
- Manage bookings
- Receive/respond to rental requests

### Admin
- Verify Ghana Cards
- Manage users
- All regular user capabilities

## 💡 Tips

- Start with diagram #1 (Page Navigation Map) for overall structure
- Use diagram #2 (User Journey) to understand user flows
- Refer to specific flows (#4-7) for detailed processes
- Use diagram #8 (State Diagram) for quick reference
