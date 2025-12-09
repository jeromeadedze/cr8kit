# Cr8Kit - Ghana Creative Rentals Platform

A digital rental platform connecting independent photographers and filmmakers in Accra with equipment owners.

## Project Overview

Cr8Kit facilitates renting, listing, and secure transactions for creative equipment, fostering trust and accessibility within the Ghanaian creative community.

## Phase 1: Authentication Pages

This phase includes the login and sign-up pages with full form validation.

### Features Implemented

#### Sign In Page (`index.html`)
- Email and password authentication
- Password visibility toggle
- "Keep me signed in" checkbox
- Forgot password link
- Form validation with regex patterns
- Responsive design

#### Sign Up Page (`signup.html`)
- Full name input with validation
- Email address validation
- Ghana phone number validation (supports +233, 0XX, and 233 formats)
- Strong password validation (8+ chars, uppercase, lowercase, number)
- Role selection (Renter/Owner)
- Terms & Conditions agreement checkbox
- "Keep me signed in" option
- Form validation with regex patterns
- Responsive design

### Validation Features

#### Email Validation
- Regex pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Real-time validation on blur and input

#### Ghana Phone Number Validation
- Supports multiple formats:
  - `+233XXXXXXXXX` (9 digits after country code)
  - `0XXXXXXXXX` (10 digits starting with 0)
  - `233XXXXXXXXX` (11 digits starting with 233)
- Spaces and dashes are automatically handled

#### Password Validation
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Real-time feedback

#### Full Name Validation
- Minimum 3 characters
- Must contain first and last name (at least 2 words)
- Regex pattern: `/^[a-zA-Z\s]{2,50}(\s[a-zA-Z\s]{2,50})+$/`

### File Structure

```
Cr8kit/
├── index.html          # Sign In page
├── signup.html         # Sign Up page
├── css/
│   └── styles.css      # Main stylesheet
├── js/
│   └── auth.js         # Authentication logic and validation
└── README.md           # Project documentation
```

### Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables, gradients, and responsive design
- **JavaScript (ES6+)** - Form validation, interactivity, and user experience enhancements
- **Font Awesome** - Icons for UI elements

### Design Features

- Modern, clean interface matching reference designs
- Orange/gold gradient buttons and accents
- Light beige background (#F5F5F0)
- White rounded cards with shadows
- Fully responsive (mobile, tablet, desktop)
- Accessible form labels and error messages
- Smooth transitions and hover effects

### Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Getting Started

1. Clone or download the project
2. Open `index.html` in a web browser
3. Navigate between Sign In and Create Account pages using the tabs or links

### Form Validation

All forms include:
- Client-side validation using JavaScript and regex
- Real-time error messages
- Visual feedback (error/success states)
- Required field validation
- Format validation (email, phone, password)

### Next Steps (Future Phases)

- Backend PHP integration for CRUD operations
- Database connection and user management
- Ghana Card verification system
- Equipment listing and browsing
- Booking system
- Payment integration (Paystack)
- Messaging and notifications
- Owner dashboard
- Rating system

### Development Notes

- Forms currently show console logs and alerts for demo purposes
- Backend API endpoints need to be integrated
- Password validation can be enhanced with special character requirements
- Phone number formatting can be improved with auto-formatting

### Contact

For questions or support, please refer to the Help Center or Contact Support links in the footer.

