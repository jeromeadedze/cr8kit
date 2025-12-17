/**
 * Equipment Details Page JavaScript
 * 
 */

let currentCalendarDate = new Date(); // Track currently viewed month
let selectedStartDate = null; // Selected start date (Date object)
let selectedEndDate = null; // Selected end date (Date object)
let bookedDates = []; // Array of objects { start: Date, end: Date }
let equipmentId = null; // Current equipment ID
let pricePerDay = 0; // Equipment price per day
let equipmentData = null; // Full equipment data

// Send booking request email to owner
async function sendBookingRequestEmail(
  equipmentId,
  ownerId,
  bookingDetails,
  bookingId = null
) {
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

    // Email can be sent via Supabase Edge Functions if needed
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

    // Load additional images from equipment_images table
    const imageGrid = document.querySelector(".image-grid");
    if (imageGrid) {
      // Always clear the placeholder images first
      imageGrid.innerHTML = "";
      
      try {
        console.log("Fetching images for equipment_id:", equipmentId);
        
        const { data: additionalImages, error: imgError } = await window.supabaseClient
          .from("equipment_images")
          .select("image_url, is_primary")
          .eq("equipment_id", parseInt(equipmentId))
          .order("is_primary", { ascending: false });
        
        console.log("equipment_images query result:", additionalImages, imgError);
        
        if (imgError) {
          console.error("Error fetching images:", imgError);
          imageGrid.style.display = "none";
        } else if (additionalImages && additionalImages.length > 0) {
          // We have images from the equipment_images table
          const allImages = additionalImages.map(img => img.image_url).filter(url => url);
          console.log("All image URLs:", allImages);
          
          if (allImages.length === 0) {
            // No valid images - hide the grid
            imageGrid.style.display = "none";
          } else if (allImages.length === 1) {
            // Only one image - hide the grid (it's already shown as main)
            imageGrid.style.display = "none";
          } else {
            // Multiple images - populate the grid dynamically
            imageGrid.style.display = ""; // Ensure grid is visible
            
            // Show up to 3 thumbnail images (skip the first/primary which is already shown as main)
            const thumbnailImages = allImages.slice(1, 4);
            thumbnailImages.forEach((imgUrl, index) => {
              const thumbnail = document.createElement("div");
              thumbnail.className = "image-thumbnail";
              thumbnail.innerHTML = `<img src="${imgUrl}" alt="Photo ${index + 2}" onclick="updateMainImage('${imgUrl}')" style="cursor: pointer;">`;
              imageGrid.appendChild(thumbnail);
            });
            
            // If there are more than 4 images total, show "View all photos" button
            if (allImages.length > 4) {
              const showAllDiv = document.createElement("div");
              showAllDiv.className = "image-thumbnail show-all";
              showAllDiv.innerHTML = `
                <img src="${allImages[4] || allImages[3]}" alt="More photos">
                <button class="show-all-btn" onclick="showAllPhotos()">View all ${allImages.length} photos</button>
              `;
              imageGrid.appendChild(showAllDiv);
            }
          }
        } else {
          // No images in equipment_images table - hide the grid completely
          console.log("No images found in equipment_images table");
          imageGrid.style.display = "none";
        }
      } catch (imgError) {
        console.warn("Could not load additional images:", imgError);
        imageGrid.style.display = "none";
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

    // Hide booking button and disable date inputs if user is the owner
    const bookingBtn = document.querySelector(".btn-book-request");
    const startDateInput = document.getElementById("startDateInput");
    const endDateInput = document.getElementById("endDateInput");

    if (bookingBtn) {
      const userId = await window.getCurrentUserId();
      // Ensure both are numbers for proper comparison
      const ownerId =
        typeof equipment.owner_id === "string"
          ? parseInt(equipment.owner_id, 10)
          : equipment.owner_id;
      const currentUserId =
        typeof userId === "string" ? parseInt(userId, 10) : userId;

      if (currentUserId && ownerId && currentUserId === ownerId) {
        // Hide and disable booking button
        bookingBtn.style.display = "none";
        bookingBtn.disabled = true;

        // Disable date inputs
        if (startDateInput) {
          startDateInput.disabled = true;
          startDateInput.style.cursor = "not-allowed";
          startDateInput.style.opacity = "0.6";
        }
        if (endDateInput) {
          endDateInput.disabled = true;
          endDateInput.style.cursor = "not-allowed";
          endDateInput.style.opacity = "0.6";
        }

        // Show a message instead
        const bookingCard = bookingBtn.closest(".booking-card-sticky");
        if (bookingCard) {
          // Remove any existing message first
          const existingMessage = bookingCard.querySelector(
            ".owner-booking-message"
          );
          if (existingMessage) {
            existingMessage.remove();
          }

          const message = document.createElement("p");
          message.className = "owner-booking-message";
          message.style.cssText =
            "text-align: center; color: var(--text-gray); padding: 1rem; font-size: 14px; background: rgba(254, 116, 44, 0.1); border-radius: 8px; margin-top: 1rem;";
          message.innerHTML =
            '<i class="fas fa-info-circle" style="margin-right: 8px;"></i>This is your equipment. You cannot book it.';
          bookingCard.insertBefore(message, bookingBtn);
        }
      } else {
        // User is not the owner - ensure button is visible and inputs are enabled
        bookingBtn.style.display = "";
        bookingBtn.disabled = false;
        if (startDateInput) {
          startDateInput.disabled = false;
          startDateInput.style.cursor = "";
          startDateInput.style.opacity = "";
        }
        if (endDateInput) {
          endDateInput.disabled = false;
          endDateInput.style.cursor = "";
          endDateInput.style.opacity = "";
        }
        // Remove owner message if it exists
        const bookingCard = bookingBtn.closest(".booking-card-sticky");
        if (bookingCard) {
          const existingMessage = bookingCard.querySelector(
            ".owner-booking-message"
          );
          if (existingMessage) {
            existingMessage.remove();
          }
        }
      }
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

      // Always load reviews from database
      if (reviewsContainer) {
        reviewsContainer.innerHTML =
          '<p style="color: var(--text-gray); padding: 1rem 0;">Loading reviews...</p>';
      }
      
      // Load reviews from database - this will update the container
      loadReviews();
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

    // CRITICAL: Always check if user is trying to book their own equipment
    // Fetch owner_id directly from database to ensure accuracy
    let ownerId = null;
    try {
      const { data: eq, error: eqError } = await window.supabaseClient
        .from("equipment")
        .select("owner_id")
        .eq("equipment_id", equipmentId)
        .single();

      if (eqError) {
        console.error("Error fetching equipment owner:", eqError);
        if (window.showToast)
          window.showToast(
            "Error verifying equipment ownership. Please try again.",
            "error"
          );
        else alert("Error verifying equipment ownership. Please try again.");
        return;
      }

      if (eq && eq.owner_id) {
        ownerId =
          typeof eq.owner_id === "string"
            ? parseInt(eq.owner_id, 10)
            : eq.owner_id;
      }
    } catch (error) {
      console.error("Error checking equipment owner:", error);
      if (window.showToast)
        window.showToast(
          "Error verifying equipment ownership. Please try again.",
          "error"
        );
      else alert("Error verifying equipment ownership. Please try again.");
      return;
    }

    // Ensure userId is a number for comparison
    const currentUserId =
      typeof userId === "string" ? parseInt(userId, 10) : userId;

    // Block booking if user is the owner
    if (ownerId && currentUserId && currentUserId === ownerId) {
      if (window.showToast) {
        window.showToast("Owners cannot book their own equipment.", "error");
      } else {
        alert("Owners cannot book their own equipment.");
      }
      return;
    }

    // Double-check: Also verify from equipmentData if available
    if (equipmentData && equipmentData.owner_id) {
      const equipmentOwnerId =
        typeof equipmentData.owner_id === "string"
          ? parseInt(equipmentData.owner_id, 10)
          : equipmentData.owner_id;
      if (currentUserId === equipmentOwnerId) {
        if (window.showToast) {
          window.showToast("Owners cannot book their own equipment.", "error");
        } else {
          alert("Owners cannot book their own equipment.");
        }
        return;
      }
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

      // Get owner ID again to be safe - FINAL CHECK before inserting
      const { data: eq, error: eqError } = await window.supabaseClient
        .from("equipment")
        .select("owner_id")
        .eq("equipment_id", equipmentId)
        .single();

      if (eqError) {
        throw eqError;
      }

      // FINAL VALIDATION: Prevent owner from booking their own equipment
      const finalOwnerId =
        typeof eq.owner_id === "string"
          ? parseInt(eq.owner_id, 10)
          : eq.owner_id;
      const finalUserId =
        typeof userId === "string" ? parseInt(userId, 10) : userId;

      if (finalOwnerId && finalUserId && finalOwnerId === finalUserId) {
        btn.disabled = false;
        btn.textContent = "Request to Book";
        if (window.showToast) {
          window.showToast("Owners cannot book their own equipment.", "error");
        } else {
          alert("Owners cannot book their own equipment.");
        }
        return;
      }

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
        await sendBookingRequestEmail(
          parseInt(equipmentId),
          eq.owner_id,
          {
            equipmentName: equipmentData?.name || "Equipment",
            startDate: selectedStartDate.toISOString().split("T")[0],
            endDate: selectedEndDate.toISOString().split("T")[0],
            totalDays: days,
            totalAmount: totalAmount,
            bookingNumber:
              createdBooking.booking_number ||
              "BK" + Date.now().toString().slice(-6),
          },
          createdBooking.booking_id
        );
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

// Load reviews from the ratings table
async function loadReviews() {
  console.log("loadReviews called with equipmentId:", equipmentId);
  
  if (!equipmentId) {
    console.error("No equipment ID for loading reviews");
    return;
  }
  
  const reviewsContainer = document.getElementById("reviewsContainer");
  const reviewsRating = document.querySelector(".reviews-rating");
  const reviewsCount = document.querySelector(".reviews-count");
  
  if (!reviewsContainer) {
    console.log("Reviews container not found");
    return;
  }
  
  try {
    // Ensure equipmentId is an integer
    const eqId = parseInt(equipmentId);
    console.log("Fetching reviews for equipment ID:", eqId);
    
    // Fetch ratings for this equipment
    const { data: ratings, error } = await window.supabaseClient
      .from("ratings")
      .select(`
        *,
        reviewer:reviewer_id (
          full_name,
          email
        )
      `)
      .eq("equipment_id", eqId)
      .order("created_at", { ascending: false });
    
    console.log("Reviews fetch result:", { ratings, error });
    
    if (error) {
      console.error("Error fetching reviews:", error);
      reviewsContainer.innerHTML = '<p style="color: var(--text-gray); padding: 1rem 0;">Could not load reviews.</p>';
      return;
    }
    
    if (!ratings || ratings.length === 0) {
      console.log("No reviews found for this equipment");
      reviewsContainer.innerHTML = '<p style="color: var(--text-gray); padding: 1rem 0;">No reviews yet. Be the first to review this equipment!</p>';
      if (reviewsRating) reviewsRating.textContent = "-";
      if (reviewsCount) reviewsCount.textContent = "(0 reviews)";
      return;
    }

    
    // Calculate average rating
    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    
    // Update rating display
    if (reviewsRating) reviewsRating.textContent = avgRating.toFixed(2);
    if (reviewsCount) reviewsCount.textContent = `(${ratings.length} review${ratings.length !== 1 ? 's' : ''})`;
    
    // Render reviews
    reviewsContainer.innerHTML = ratings.map(review => {
      const reviewerName = review.reviewer?.full_name || review.reviewer?.email || "Anonymous";
      const reviewDate = new Date(review.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      const initials = reviewerName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
      
      // Generate star HTML
      let starsHtml = "";
      for (let i = 1; i <= 5; i++) {
        if (i <= review.rating) {
          starsHtml += '<i class="fas fa-star" style="color: #ffc107; font-size: 14px;"></i>';
        } else {
          starsHtml += '<i class="fas fa-star" style="color: #ddd; font-size: 14px;"></i>';
        }
      }
      
      return `
        <div class="review-card" style="
          padding: 20px;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          margin-bottom: 16px;
          background: white;
        ">
          <div class="review-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: var(--primary-orange);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 16px;
              ">${initials}</div>
              <div>
                <div style="font-weight: 600; color: var(--text-dark); font-size: 15px;">${reviewerName}</div>
                <div style="font-size: 12px; color: var(--text-gray);">${reviewDate}</div>
              </div>
            </div>
            <div style="display: flex; gap: 2px;">${starsHtml}</div>
          </div>
          ${review.comment ? `
            <p style="color: var(--text-gray); line-height: 1.6; margin: 0; font-size: 14px;">${review.comment}</p>
          ` : `
            <p style="color: var(--text-gray); line-height: 1.6; margin: 0; font-size: 14px; font-style: italic;">No comment provided</p>
          `}
        </div>
      `;
    }).join("");
    
  } catch (error) {
    console.error("Error loading reviews:", error);
    reviewsContainer.innerHTML = '<p style="color: var(--text-gray); padding: 1rem 0;">Could not load reviews.</p>';
  }
}

// Update main image when clicking on thumbnail
function updateMainImage(imageUrl) {
  const mainImage = document.querySelector(".main-product-image");
  if (mainImage && imageUrl) {
    mainImage.src = imageUrl;
  }
}

// Show all photos (placeholder for future modal implementation)
function showAllPhotos() {
  // For now, just show an alert. In the future, this could open a full-screen gallery
  if (window.showAlert) {
    showAlert("Photo gallery feature coming soon!", { type: "info", title: "Photo Gallery" });
  } else {
    alert("Photo gallery feature coming soon!");
  }
}

// Make functions globally available
window.updateMainImage = updateMainImage;
window.showAllPhotos = showAllPhotos;

// Show owner profile modal with their equipment, bio, and rating
async function showOwnerProfile() {
  if (!equipmentData || !equipmentData.owner_id) {
    showAlert("Owner information not available", { type: "error", title: "Error" });
    return;
  }
  
  const ownerId = equipmentData.owner_id;
  
  try {
    // Fetch owner details
    const { data: owner, error: ownerError } = await window.supabaseClient
      .from("users")
      .select("*")
      .eq("user_id", ownerId)
      .single();
    
    if (ownerError || !owner) {
      throw new Error("Could not load owner information");
    }
    
    // Fetch owner's equipment
    const { data: ownerEquipment, error: eqError } = await window.supabaseClient
      .from("equipment")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("is_available", true)
      .order("created_at", { ascending: false });
    
    // Fetch owner's rating
    const { data: ratings } = await window.supabaseClient
      .from("ratings")
      .select("rating")
      .eq("reviewee_id", ownerId);
    
    // Calculate average rating
    let avgRating = 0;
    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
      avgRating = sum / ratings.length;
    }
    
    // Get total completed rentals as owner
    const { data: completedRentals } = await window.supabaseClient
      .from("bookings")
      .select("booking_id")
      .eq("owner_id", ownerId)
      .in("status", ["completed", "returned"]);
    
    const totalRentals = completedRentals?.length || 0;
    
    // Create modal HTML
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "ownerProfileModal";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 style="margin: 0; font-size: 20px;">Owner Profile</h2>
          <button class="modal-close" onclick="closeOwnerProfileModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body" style="padding: 24px;">

          <!-- Owner Info -->
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(owner.full_name || owner.email)}&background=fe742c&color=fff&size=80" 
                 alt="${owner.full_name}" 
                 style="width: 80px; height: 80px; border-radius: 50%;">
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 20px; color: var(--text-dark);">${owner.full_name || "User"}</h3>
              <div style="display: flex; align-items: center; gap: 12px; color: var(--text-gray); font-size: 14px; flex-wrap: wrap;">
                <span><i class="fas fa-star" style="color: #f1c40f;"></i> ${avgRating > 0 ? avgRating.toFixed(1) : "New"}</span>
                <span>(${totalRentals} rentals)</span>
              </div>
              <div style="margin-top: 8px;">
                ${owner.is_verified 
                  ? '<span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(39, 174, 96, 0.1); color: #27ae60; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;"><i class="fas fa-check-circle"></i> Ghana Card Verified</span>'
                  : '<span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(243, 156, 18, 0.1); color: #f39c12; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;"><i class="fas fa-exclamation-circle"></i> Not Verified</span>'
                }
              </div>
              <p style="margin: 8px 0 0 0; color: var(--text-gray); font-size: 13px;">
                Member since ${new Date(owner.created_at).getFullYear()}
              </p>
            </div>
          </div>

          
          ${owner.bio ? `
          <!-- Bio -->
          <div style="margin-bottom: 24px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--text-dark);">About</h4>
            <p style="margin: 0; color: var(--text-gray); line-height: 1.6;">${owner.bio}</p>
          </div>
          ` : ''}
          
          <!-- Owner's Equipment -->
          <div>
            <h4 style="margin: 0 0 16px 0; font-size: 14px; color: var(--text-dark);">
              Equipment by ${owner.full_name?.split(' ')[0] || 'this owner'} (${ownerEquipment?.length || 0})
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;">
              ${ownerEquipment && ownerEquipment.length > 0 ? ownerEquipment.map(eq => `
                <div onclick="window.location.href='equipment-details.html?id=${eq.equipment_id}'" 
                     style="cursor: pointer; border-radius: 8px; overflow: hidden; background: #f9f9f9; transition: transform 0.2s;"
                     onmouseover="this.style.transform='translateY(-2px)'" 
                     onmouseout="this.style.transform='translateY(0)'">
                  <img src="${eq.image_url || 'https://via.placeholder.com/180x120?text=No+Image'}" 
                       alt="${eq.name}"
                       style="width: 100%; height: 100px; object-fit: cover;">
                  <div style="padding: 10px;">
                    <p style="margin: 0; font-weight: 600; font-size: 13px; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${eq.name}</p>
                    <p style="margin: 4px 0 0 0; color: var(--primary-orange); font-weight: 700; font-size: 14px;">GHS ${eq.price_per_day?.toFixed(2) || '0.00'}/day</p>
                  </div>
                </div>
              `).join('') : '<p style="color: var(--text-gray); grid-column: 1/-1;">No equipment listed yet.</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add modal styles if not present
    if (!document.getElementById("ownerProfileModalStyles")) {
      const styles = document.createElement("style");
      styles.id = "ownerProfileModalStyles";
      styles.textContent = `
        #ownerProfileModal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s;
          padding: 20px;
        }
        #ownerProfileModal .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        #ownerProfileModal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          background: white;
          border-radius: 12px 12px 0 0;
          z-index: 10;
        }
        #ownerProfileModal .modal-body {
          overflow-y: auto;
          flex: 1;
        }
        #ownerProfileModal .modal-close {
          background: none;
          border: none;
          font-size: 20px;
          color: var(--text-gray);
          cursor: pointer;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }
        #ownerProfileModal .modal-close:hover {
          background: #f0f0f0;
          color: var(--text-dark);
        }
        @media (max-width: 768px) {
          #ownerProfileModal .modal-content {
            max-width: 100%;
            max-height: 95vh;
            margin: 10px;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    
  } catch (error) {
    console.error("Error loading owner profile:", error);
    showAlert("Error loading owner profile. Please try again.", { type: "error", title: "Error" });
  }
}

// Close owner profile modal
function closeOwnerProfileModal() {
  const modal = document.getElementById("ownerProfileModal");
  if (modal) {
    modal.remove();
  }
}

// Make new functions globally available
window.showOwnerProfile = showOwnerProfile;
window.closeOwnerProfileModal = closeOwnerProfileModal;
