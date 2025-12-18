# Cr8Kit

**Link to Live Website:** (https://cr8kit.vercel.app)

**Demo Video:** https://youtu.be/BUHCMXtES5I

**Link to Documents:** https://drive.google.com/drive/folders/1v-cZ9Ljhf8JWTAnT8FAi5dar6zkz6Ab9?usp=sharing

**Link to Slides:** https://www.canva.com/design/DAG7zSzaqo0/N6gOmI1p7N7VUODAOtGKwA/view?utm_content=DAG7zSzaqo0&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h24cd628549




## Project Description
**Cr8Kit** is a digital rental platform designed to connect independent photographers, filmmakers, and creatives in Accra with equipment owners. The platform facilitates a secure and efficient marketplace for renting and listing creative gear, fostering trust and accessibility within the Ghanaian creative community.

### Purpose
To bridge the gap between creatives who need high-quality equipment and owners who have underutilized gear. Cr8Kit streamlines the rental process, making it safer and more transparent for everyone involved.

### Goal
Make equipment access **affordable, safe, and efficient** for Ghanaian creatives while enabling owners to monetize their gear securely.

## Target Audience
- **Renters:** Independent photographers, filmmakers, and small production teams in Accra looking for high-quality gear at affordable rates.
- **Owners:** Freelancers, production houses, and small studios looking to earn extra income by renting out their cameras, lighting, drones, and audio equipment.

---

## Key Features & Functionalities

### User Authentication & Profiles
- **Secure Sign Up & Login:** 
- **Profile Management:** Users can update their bio, contact info, and manage their "Ghana Card" verification status to build trust.

### Equipment Discovery (Renters)
- **Browse & Search:** Filter equipment by category (Cameras, Drones, Lighting, etc.), price, and location.
- **Detailed Listings:** View high-quality images, specifications, and availability status of equipment.
- **Favorites:** Save items to a wishlist for later.

### Equipment Management (Owners)
- **List Your Gear:** Easy-to-use form to list equipment with details, specific amenities, and pricing.
- **Manage Listings:** Edit details, update availability, or remove listings from the customized "My Listings" dashboard.
- **Image Uploads:** visual gallery for each item.

### Booking System
- **Request to Book:** Renters can select dates and send booking requests.
- **Approval Workflow:** Owners can Approve or Reject booking requests.
- **Booking Status:** Track rentals through `Pending`, `Approved`, `Active`, and `Completed` stages.
- **Rental History:** View past and upcoming rentals.

### Notifications & Communication
- **Real-time Alerts:** Get notified about booking status changes, new requests, and system updates.
- **Dynamic Badges:** Visual indicators for unread notifications.

### Security & Trust
- **Verified Badge:** Visual cues for verified users (Ghana Card integration concept).
- **Row Level Security (RLS):** Data privacy ensured via database policies (users can only edit their own data).

### Admin Panel
- **Platform Oversight:** Admin interface to manage, verify users, and oversee platform activity.

---

## Technology Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend / Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Image Storage:** Cloudinary
- **Hosting:** [Vercel]


## How to Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cr8kit.git
   cd cr8kit
   ```

2. **Serve the project**
   Since this is a static site using vanilla JS modules, you need a local server. You can use Python or Node.js.

   **Using Python:**
   ```bash
   python3 -m http.server 8000
   ```

3. **Access the App**
   Open your browser and navigate to `http://localhost:8000`.

---
