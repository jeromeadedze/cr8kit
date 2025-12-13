/**
 * Equipment Details Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

let currentCalendarDate = new Date(); // Track currently viewed month
let selectedStartDate = null; // Selected start date (Date object)
let selectedEndDate = null; // Selected end date (Date object)
let bookedDates = []; // Array of objects { start: Date, end: Date }
let equipmentId = null; // Current equipment ID
let pricePerDay = 0; // Equipment price per day
let equipmentData = null; // Full equipment data

// Send booking request email to owner
async function sendBookingRequestEmail(equipmentId, ownerId, bookingDetails, bookingId = null) {
  try {
    // Get owner details
    const { data: owner } = await window.supabaseClient
      .from("users")
      .select("email, full_name, user_id")
      .eq("user_id", ownerId)
      .single();

    if (!owner) return;

    // Get renter details
    const userId = await window.getCurrentUserId();
    const { data: renter } = await window.supabaseClient
      .from("users")
      .select("full_name, email")
      .eq("user_id", userId)
      .single();

    // Create notification in database (notifications table must exist)
    try {
      await window.supabaseClient.from("notifications").insert({
        user_id: ownerId,
        type: "booking_request",
        title: "New Booking Request",
        message: `${renter?.full_name || "A renter"} has requested to book ${
          bookingDetails.equipmentName
        } from ${bookingDetails.startDate} to ${
          bookingDetails.endDate
        }. Total: GHS ${bookingDetails.totalAmount.toFixed(2)}`,
        related_equipment_id: equipmentId,
        related_booking_id: bookingId,
      });
      
      // Update notification badge
      if (window.updateGlobalNotificationBadge) {
        window.updateGlobalNotificationBadge();
      }
    } catch (notifError) {
      // If notifications table doesn't exist yet, just log
      console.log("Notifications table not available yet:", notifError);
    }

    // TODO: Send actual email via Edge Function or webhook
    // For now, notification is created in database
    console.log("Booking request notification created for owner:", owner.email);
  } catch (error) {
    console.error("Error sending booking request notification:", error);
    // Don't fail the booking if email fails
  }
}

console.log("Equipment details script loaded successfully");

// Wait for both DOM and Supabase to be ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, waiting for Supabase...");

  // Check if Supabase is already loaded
  if (window.supabaseClient) {
    console.log("Supabase already available");
    initializePage();
    return;
  }

  // Wait for Supabase to be ready (check every 100ms)
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max

  const checkSupabase = setInterval(() => {
    attempts++;

    if (window.supabaseClient) {
      console.log("Supabase ready after", attempts * 100, "ms");
      clearInterval(checkSupabase);
      initializePage();
    } else if (attempts >= maxAttempts) {
      console.error("Supabase client not available after 5 seconds");
      clearInterval(checkSupabase);
      const container = document.querySelector(".page-container");
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 4rem 2rem;">
            <h1 style="color: var(--error-red); margin-bottom: 1rem;">Database Connection Error</h1>
            <p style="color: var(--text-gray); margin-bottom: 2rem;">Unable to connect to database. Please refresh the page.</p>
            <button onclick="window.location.reload()" class="btn-primary">Refresh Page</button>
          </div>
        `;
      }
    }
  }, 100);
});

function initializePage() {
  // Update user info
  if (window.updateUserInfo) {
    window.updateUserInfo();
  }

  // Get equipment ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  equipmentId = urlParams.get("id");

  if (!equipmentId) {
    console.error("Equipment ID not found in URL");
    const container = document.querySelector(".page-container");
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem;">
          <h1 style="color: var(--error-red); margin-bottom: 1rem;">Invalid Equipment</h1>
          <p style="color: var(--text-gray); margin-bottom: 2rem;">No equipment ID provided in the URL.</p>
          <a href="browse.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Browse Equipment</a>
        </div>
      `;
    }
    return; // Cannot proceed without ID
  }

  // Convert to integer if it's a string
  equipmentId = parseInt(equipmentId);
  if (isNaN(equipmentId)) {
    console.error("Invalid equipment ID:", urlParams.get("id"));
    const container = document.querySelector(".page-container");
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem;">
          <h1 style="color: var(--error-red); margin-bottom: 1rem;">Invalid Equipment ID</h1>
          <p style="color: var(--text-gray); margin-bottom: 2rem;">The equipment ID "${urlParams.get(
            "id"
          )}" is not valid.</p>
          <a href="browse.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Browse Equipment</a>
        </div>
      `;
    }
    return;
  }

  // Load equipment details from API
  loadEquipmentDetails();

  // Load availability
  fetchAvailability();

  // Initialize calendar interactions
  initCalendar();

  // Initialize booking form
  initBookingForm();

  // Clear initial inputs (user must select dates)
  const startInput = document.getElementById("startDateInput");
  const endInput = document.getElementById("endDateInput");
  if (startInput) startInput.value = "";
  if (endInput) endInput.value = "";

  // Update price display to 0/empty initially
  if (typeof updateBreakdownDisplay === "function") {
    updateBreakdownDisplay(0, 0, 0, 0);
  }
}

// Load equipment details from Supabase (must be defined before initializePage calls it)
async function loadEquipmentDetails() {
  if (!equipmentId) {
    console.error("Equipment ID not found");
    // Show error message on page
    const container = document.querySelector(".page-container");
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem;">
          <h1 style="color: var(--error-red); margin-bottom: 1rem;">Equipment Not Found</h1>
          <p style="color: var(--text-gray); margin-bottom: 2rem;">The equipment you're looking for doesn't exist or has been removed.</p>
          <a href="browse.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Browse Equipment</a>
        </div>
      `;
    }
    return;
  }

  try {
    // Check if Supabase client is available
    if (!window.supabaseClient) {
      console.error("Supabase client not initialized");
      throw new Error(
        "Database connection not available. Please refresh the page."
      );
    }

    // Show loading state
    const productTitle = document.querySelector(".product-title");
    if (productTitle) productTitle.textContent = "Loading...";

    console.log("Loading equipment with ID:", equipmentId);
    console.log("Supabase client available:", !!window.supabaseClient);

    // Try simple query first (more reliable)
    let { data: equipment, error } = await window.supabaseClient
      .from("equipment")
      .select("*")
      .eq("equipment_id", equipmentId)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);

      // If it's a "not found" error, show appropriate message
      if (error.code === "PGRST116" || error.message?.includes("No rows")) {
        const container = document.querySelector(".page-container");
        if (container) {
          container.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem;">
              <h1 style="color: var(--error-red); margin-bottom: 1rem;">Equipment Not Found</h1>
              <p style="color: var(--text-gray); margin-bottom: 2rem;">The equipment with ID ${equipmentId} doesn't exist in the database.</p>
              <a href="browse.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Browse Equipment</a>
            </div>
          `;
        }
        return;
      }

      throw error;
    }

    if (!equipment) {
      console.error("Equipment is null");
      const container = document.querySelector(".page-container");
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 4rem 2rem;">
            <h1 style="color: var(--error-red); margin-bottom: 1rem;">Equipment Not Found</h1>
            <p style="color: var(--text-gray); margin-bottom: 2rem;">The equipment you're looking for doesn't exist or has been removed.</p>
            <a href="browse.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Browse Equipment</a>
          </div>
        `;
      }
      return;
    }

    console.log("Loaded equipment:", equipment);
    console.log("Equipment data:", JSON.stringify(equipment, null, 2));

    if (!equipment) {
      console.error("Equipment not found");
      const container = document.querySelector(".page-container");
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 4rem 2rem;">
            <h1 style="color: var(--error-red); margin-bottom: 1rem;">Equipment Not Found</h1>
            <p style="color: var(--text-gray); margin-bottom: 2rem;">The equipment you're looking for doesn't exist or has been removed.</p>
            <a href="browse.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Browse Equipment</a>
          </div>
        `;
      }
      return;
    }

    equipmentData = equipment;
    pricePerDay = parseFloat(equipment.price_per_day) || 0;
    window.equipmentPrice = pricePerDay; // Set global for booking form

    // Update page title
    document.title = `${equipment.name} - Cr8Kit`;

    // Update product header
    if (productTitle) productTitle.textContent = equipment.name;

    // Update rating in header
    const ratingEl = document.querySelector(".product-rating span");
    if (ratingEl) {
      ratingEl.textContent = (equipment.rating || 0).toFixed(2);
    }

    // Update rating in price header
    const priceRatingEl = document.querySelector(".price-rating span");
    if (priceRatingEl) {
      priceRatingEl.textContent = (equipment.rating || 0).toFixed(2);
    }

    // Update location
    const locationEl = document.querySelector(".product-location");
    if (locationEl) {
      const locationText = equipment.city
        ? `${equipment.city}${
            equipment.location ? ", " + equipment.location : ""
          }`
        : equipment.location || "Location not specified";
      locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${locationText}`;
    }

    // Update location in location section
    const locationSectionText = document.querySelector(
      ".info-section .section-text"
    );
    if (
      locationSectionText &&
      locationSectionText
        .closest(".info-section")
        .querySelector(".section-heading")?.textContent === "Location"
    ) {
      locationSectionText.textContent = equipment.city
        ? `${equipment.city}${
            equipment.location ? ", " + equipment.location : ""
          }`
        : equipment.location || "Location not specified";
    }

    // Update verified badge - show only if verified
    const verifiedBadge = document.querySelector(".verified-badge-inline");
    if (verifiedBadge) {
      if (equipment.is_verified) {
        verifiedBadge.style.display = "inline-flex";
      } else {
        verifiedBadge.style.display = "none";
      }
    }

    // Update main image
    const mainImage = document.querySelector(".main-product-image");
    if (mainImage) {
      if (equipment.image_url) {
        mainImage.src = equipment.image_url;
        mainImage.alt = equipment.name;
      } else {
        mainImage.src = "https://via.placeholder.com/800x600?text=No+Image";
        mainImage.alt = equipment.name;
      }
    }

    // Update description
    const descriptionEl = document.querySelector(".section-text");
    if (
      descriptionEl &&
      descriptionEl.closest(".info-section").querySelector(".section-heading")
        ?.textContent === "About this gear"
    ) {
      if (equipment.description) {
        descriptionEl.textContent = equipment.description;
      } else {
        descriptionEl.textContent =
          "No description available for this equipment.";
      }
    }

    // Update host info - fetch owner separately if not included
    let ownerInfo = equipment.owner;
    if (!ownerInfo && equipment.owner_id) {
      try {
        const { data: owner } = await window.supabaseClient
          .from("users")
          .select("user_id, full_name, email, created_at")
          .eq("user_id", equipment.owner_id)
          .single();
        ownerInfo = owner;
      } catch (err) {
        console.warn("Could not fetch owner info:", err);
      }
    }

    if (ownerInfo) {
      const hostName = document.querySelector(".host-name");
      if (hostName) {
        hostName.textContent = `Hosted by ${ownerInfo.full_name || "Unknown"}`;
      }
      const hostAvatar = document.querySelector(".host-avatar");
      if (hostAvatar) {
        hostAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          ownerInfo.full_name || ownerInfo.email || "User"
        )}&background=fe742c&color=fff&size=60`;
        hostAvatar.alt = ownerInfo.full_name || "Owner";
      }

      // Update host meta (member since)
      const hostMeta = document.querySelector(".host-meta");
      if (hostMeta) {
        if (ownerInfo.created_at) {
          const memberSince = new Date(ownerInfo.created_at).getFullYear();
          hostMeta.textContent = `Member since ${memberSince} • Response time: 1 hour`;
        } else {
          hostMeta.textContent = "Response time: 1 hour";
        }
      }
    } else {
      // Fallback if owner info not available
      const hostName = document.querySelector(".host-name");
      if (hostName) {
        hostName.textContent = "Hosted by Unknown";
      }
    }

    // Update price
    const priceEl = document.querySelector(".price-per-day");
    if (priceEl) {
      priceEl.innerHTML = `GHC ${pricePerDay.toFixed(
        2
      )} <span class="price-unit">/ day</span>`;
    }

    // Update reviews count
    const reviewCount = document.querySelector(".review-count");
    if (reviewCount) {
      const count = equipment.total_rentals || 0;
      reviewCount.textContent = `(${count} ${
        count === 1 ? "review" : "reviews"
      })`;
    }

    // Update reviews rating
    const reviewsRating = document.querySelector(".reviews-rating");
    if (reviewsRating) {
      reviewsRating.textContent = (equipment.rating || 0).toFixed(2);
    }

    // Update reviews section
    const reviewsSection = document.querySelector(
      ".info-section:has(.reviews-header)"
    );
    const reviewsContainer = document.getElementById("reviewsContainer");

    if (reviewsSection) {
      // Hide any hardcoded review cards
      const hardcodedReviewCards =
        reviewsSection.querySelectorAll(".review-card");
      hardcodedReviewCards.forEach((card) => {
        if (!card.closest("#reviewsContainer")) {
          card.style.display = "none";
        }
      });

      if (!equipment.total_rentals || equipment.total_rentals === 0) {
        // No reviews
        if (reviewsContainer) {
          reviewsContainer.innerHTML =
            '<p style="color: var(--text-gray); padding: 1rem 0;">No reviews yet. Be the first to review this equipment!</p>';
        }
        const showAllBtn = reviewsSection.querySelector(".btn-secondary");
        if (showAllBtn) {
          showAllBtn.textContent = "No reviews yet";
          showAllBtn.disabled = true;
          showAllBtn.style.opacity = "0.5";
          showAllBtn.style.cursor = "not-allowed";
        }
      } else {
        // Has reviews
        if (reviewsContainer) {
          reviewsContainer.innerHTML =
            '<p style="color: var(--text-gray); padding: 1rem 0;">Loading reviews...</p>';
        }
        const showAllBtn = reviewsSection.querySelector(".btn-secondary");
        if (showAllBtn) {
          showAllBtn.textContent = `Show all ${equipment.total_rentals} reviews`;
          showAllBtn.disabled = false;
          showAllBtn.style.opacity = "1";
          showAllBtn.style.cursor = "pointer";
        }
      }
    }

    // Hide kit list container if no kit info in description
    const kitListContainer = document.getElementById("kitListContainer");
    if (kitListContainer) {
      if (
        equipment.description?.toLowerCase().includes("kit includes") ||
        equipment.description?.toLowerCase().includes("includes:")
      ) {
        kitListContainer.style.display = "block";
      } else {
        kitListContainer.style.display = "none";
      }
    }

    // Hide specs section (can be enabled later if needed)
    const specsSection = document.getElementById("specsSection");
    if (specsSection) {
      specsSection.style.display = "none";
    }

    // Hide hardcoded review cards - they'll be replaced with dynamic ones if available
    const reviewCards = document.querySelectorAll(".review-card");
    reviewCards.forEach((card) => {
      if (card.closest("#reviewsContainer") === null) {
        card.style.display = "none";
      }
    });
  } catch (error) {
    console.error("Error loading equipment details:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    const container = document.querySelector(".page-container");
    if (container) {
      let errorMessage = "Failed to load equipment details. Please try again.";

      if (error.code === "PGRST116") {
        errorMessage = "Equipment not found. The item may have been removed.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem;">
          <h1 style="color: var(--error-red); margin-bottom: 1rem;">Error Loading Equipment</h1>
          <p style="color: var(--text-gray); margin-bottom: 1rem;">${errorMessage}</p>
          <p style="color: var(--text-gray); font-size: 14px; margin-bottom: 2rem;">Error Code: ${
            error.code || "Unknown"
          }</p>
          <a href="browse.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Browse Equipment</a>
        </div>
      `;
    }
    if (window.showToast) {
      window.showToast(
        "Failed to load equipment details: " +
          (error.message || "Unknown error"),
        "error"
      );
    }
  }
}

// Update inputs and price breakdown
function updateInputsAndPrice() {
  const startInput = document.getElementById("startDateInput");
  const endInput = document.getElementById("endDateInput");

  if (selectedStartDate && startInput) {
    startInput.value = formatDateInput(selectedStartDate);
  }
  if (selectedEndDate && endInput) {
    endInput.value = formatDateInput(selectedEndDate);
  }

  // Update price breakdown
  if (selectedStartDate && selectedEndDate) {
    const days =
      Math.round(
        (selectedEndDate - selectedStartDate) / (1000 * 60 * 60 * 24)
      ) + 1;
    const basePrice = pricePerDay * days;
    const serviceFee = basePrice * 0.1; // 10% service fee
    const insurance = basePrice * 0.05; // 5% insurance
    const total = basePrice + serviceFee + insurance;

    updateBreakdownDisplay(days, basePrice, serviceFee, insurance, total);
  } else {
    updateBreakdownDisplay(0, 0, 0, 0, 0);
  }
}

// Format date for input field (MM/DD/YYYY)
function formatDateInput(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

// Update price breakdown display
function updateBreakdownDisplay(days, basePrice, serviceFee, insurance, total) {
  const breakdown = document.querySelector(".booking-breakdown");
  if (!breakdown) return;

  if (days === 0 || basePrice === 0) {
    breakdown.innerHTML = `
      <div class="breakdown-row">
        <span>Select dates to see pricing</span>
      </div>
    `;
    return;
  }

  breakdown.innerHTML = `
    <div class="breakdown-row">
      <span>GHC ${pricePerDay.toFixed(2)} x ${days} ${
    days === 1 ? "day" : "days"
  }</span>
      <span>GHC ${basePrice.toFixed(2)}</span>
    </div>
    <div class="breakdown-row">
      <span>Service fee</span>
      <span>GHC ${serviceFee.toFixed(2)}</span>
    </div>
    <div class="breakdown-row">
      <span>Insurance</span>
      <span>GHC ${insurance.toFixed(2)}</span>
    </div>
    <div class="breakdown-total">
      <span>Total</span>
      <span>GHC ${total.toFixed(2)}</span>
    </div>
  `;
}

// Fetch availability (booked dates)
async function fetchAvailability() {
  if (!equipmentId) return;

  try {
    const { data: bookings, error } = await window.supabaseClient
      .from("bookings")
      .select("start_date, end_date")
      .eq("equipment_id", equipmentId)
      .in("status", ["approved", "active", "pending"]) // Include pending to avoid double booking
      .gte("end_date", new Date().toISOString()); // Only future/current bookings

    if (error) throw error;

    bookedDates = (bookings || []).map((b) => ({
      start: new Date(b.start_date),
      end: new Date(b.end_date),
    }));

    // Re-render calendar with new data
    renderCalendar();
  } catch (error) {
    console.error("Error fetching availability:", error);
  }
}

// Initialize calendar
function initCalendar() {
  // Navigation buttons
  const prevBtn = document.querySelector(".calendar-nav i.fa-chevron-left");
  const nextBtn = document.querySelector(".calendar-nav i.fa-chevron-right");

  if (prevBtn) {
    prevBtn.parentElement.addEventListener("click", () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.parentElement.addEventListener("click", () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendar();
    });
  }

  // Input click listeners
  const startInput = document.getElementById("startDateInput");
  const endInput = document.getElementById("endDateInput");

  const scrollHandler = () => {
    const calendar = document.querySelector(".calendar-container");
    if (calendar)
      calendar.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (startInput) startInput.addEventListener("click", scrollHandler);
  if (endInput) endInput.addEventListener("click", scrollHandler);

  renderCalendar();
}

// Render dynamic calendar
function renderCalendar() {
  const grid = document.querySelector(".calendar-grid");
  const monthLabel = document.querySelector(".calendar-month");
  if (!grid || !monthLabel) return;

  // Update header
  const monthName = currentCalendarDate.toLocaleString("default", {
    month: "long",
  });
  const year = currentCalendarDate.getFullYear();
  monthLabel.textContent = `${monthName} ${year}`;

  // Clear existing days (keep headers)
  const headers = grid.querySelectorAll(".calendar-day-header");
  grid.innerHTML = "";
  headers.forEach((h) => grid.appendChild(h));

  // Calendar logic
  const firstDayOfMonth = new Date(year, currentCalendarDate.getMonth(), 1);
  const lastDayOfMonth = new Date(year, currentCalendarDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

  // Today for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Padding days
  for (let i = 0; i < startDayOfWeek; i++) {
    const pad = document.createElement("div");
    pad.className = "calendar-day empty";
    grid.appendChild(pad);
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, currentCalendarDate.getMonth(), d);
    const el = document.createElement("div");
    el.className = "calendar-day";
    el.textContent = d;

    // Check availability
    let isBooked = false;
    for (const range of bookedDates) {
      // Normalize range dates to midnight for comparison
      const rStart = new Date(range.start);
      rStart.setHours(0, 0, 0, 0);
      const rEnd = new Date(range.end);
      rEnd.setHours(0, 0, 0, 0);

      if (date >= rStart && date <= rEnd) {
        isBooked = true;
        break;
      }
    }

    if (date < today || isBooked) {
      el.classList.add("unavailable");
      // Add visual style for unavailable
      el.style.opacity = "0.4";
      el.style.backgroundColor = "#eee";
      el.style.cursor = "not-allowed";
      if (isBooked) {
        el.title = "Booked";
        el.style.backgroundColor = "rgba(254, 116, 44, 0.1)"; // Light orange tint
      } else {
        el.title = "Past date";
      }
    } else {
      // Click handler for valid days
      el.addEventListener("click", () => handleDateClick(date));
    }

    // Selection styling
    if (selectedStartDate && date.getTime() === selectedStartDate.getTime()) {
      el.classList.add("selected", "start");
    }
    if (selectedEndDate && date.getTime() === selectedEndDate.getTime()) {
      el.classList.add("selected", "end");
    }
    if (
      selectedStartDate &&
      selectedEndDate &&
      date > selectedStartDate &&
      date < selectedEndDate
    ) {
      el.classList.add("selected");
    }

    grid.appendChild(el);
  }
}

// Handle date selection
function handleDateClick(date) {
  // If clicking start again or resetting
  if (
    !selectedStartDate ||
    (selectedStartDate && selectedEndDate) ||
    date < selectedStartDate
  ) {
    selectedStartDate = date;
    selectedEndDate = null;
  } else if (date.getTime() === selectedStartDate.getTime()) {
    // Deselect if clicking start again
    selectedStartDate = null;
    selectedEndDate = null;
  } else {
    // Check for booked dates in range
    let hasConflict = false;
    for (const range of bookedDates) {
      const rStart = new Date(range.start);
      rStart.setHours(0, 0, 0, 0);
      if (range.start >= selectedStartDate && range.start <= date) {
        hasConflict = true;
        break;
      }
    }

    if (hasConflict) {
      if (window.showToast)
        window.showToast(
          "Selection includes booked dates. Please choose another range.",
          "error"
        );
      else
        alert("Selection includes booked dates. Please choose another range.");
      return;
    }

    selectedEndDate = date;
  }

  // Update logic triggers re-render to show selection
  renderCalendar();
  updateInputsAndPrice();
}

// ... (functions unchanged in between) ...

// Init Booking Form
function initBookingForm() {
  const btn = document.querySelector(".btn-book-request");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (!selectedStartDate || !selectedEndDate) {
      if (window.showToast)
        window.showToast("Please select a valid date range.", "error");
      else alert("Please select a valid date range.");
      return;
    }

    const userId = await window.getCurrentUserId();
    if (!userId) {
      if (window.showToast)
        window.showToast("Please sign in to book.", "error");
      else alert("Please sign in to book.");
      return;
    }

    // Ensure price is loaded
    if (!pricePerDay || pricePerDay === 0) {
      // Try to reload equipment details
      await loadEquipmentDetails();
      if (!pricePerDay || pricePerDay === 0) {
        if (window.showToast)
          window.showToast(
            "Equipment price not available. Please refresh the page.",
            "error"
          );
        else alert("Equipment price not available. Please refresh the page.");
        return;
      }
    }

    // Prepare Submission
    const days =
      Math.round(
        (selectedEndDate - selectedStartDate) / (1000 * 60 * 60 * 24)
      ) + 1;
    const basePrice = pricePerDay * days;
    const serviceFee = basePrice * 0.1; // 10% service fee
    const insurance = basePrice * 0.05; // 5% insurance
    const totalAmount = basePrice + serviceFee + insurance;

    // Create Booking
    try {
      btn.disabled = true;
      btn.textContent = "Requesting...";

      // Get owner ID again to be safe
      const { data: eq } = await window.supabaseClient
        .from("equipment")
        .select("owner_id")
        .eq("equipment_id", equipmentId)
        .single();

      const { error } = await window.supabaseClient.from("bookings").insert({
        renter_id: userId,
        equipment_id: parseInt(equipmentId),
        owner_id: eq.owner_id,
        start_date: selectedStartDate.toISOString().split("T")[0],
        end_date: selectedEndDate.toISOString().split("T")[0],
        total_days: days,
        price_per_day: pricePerDay,
        total_amount: totalAmount,
        status: "pending",
        payment_status: "pending",
        booking_number: "BK" + Date.now().toString().slice(-6),
      });

      if (error) throw error;

      // Get booking number from the created booking
      const { data: createdBooking } = await window.supabaseClient
        .from("bookings")
        .select("booking_id, booking_number")
        .eq("renter_id", userId)
        .eq("equipment_id", parseInt(equipmentId))
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Send email notification to owner
      if (createdBooking) {
        await sendBookingRequestEmail(parseInt(equipmentId), eq.owner_id, {
          equipmentName: equipmentData?.name || "Equipment",
          startDate: selectedStartDate.toISOString().split("T")[0],
          endDate: selectedEndDate.toISOString().split("T")[0],
          totalDays: days,
          totalAmount: totalAmount,
          bookingNumber:
            createdBooking.booking_number ||
            "BK" + Date.now().toString().slice(-6),
        }, createdBooking.booking_id);
      }

      if (window.showToast)
        window.showToast("Booking requested successfully!", "success");
      else alert("Booking requested successfully!");

      setTimeout(() => {
        window.location.href = "bookings.html";
      }, 1000);
    } catch (e) {
      console.error(e);
      if (window.showToast)
        window.showToast("Failed to book: " + e.message, "error");
      else alert("Failed to book: " + e.message);

      btn.disabled = false;
      btn.textContent = "Request to Book";
    }
  });
}
