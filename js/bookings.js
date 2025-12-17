/**
 * Bookings Page JavaScript
 * 
 */

let currentFilter = "all";
let allBookings = [];

// Load bookings from Supabase
async function loadBookings(filter = "all") {
  currentFilter = filter;

  try {
    const userId = await window.getCurrentUserId();
    const bookingList = document.querySelector(".booking-list");
    const loadingSkeleton = document.getElementById("loadingSkeleton");

    if (!userId) {
      console.error("User not authenticated");
      if (bookingList) {
        bookingList.innerHTML =
          '<p style="text-align: center; padding: 2rem; color: var(--text-gray);">Please sign in to view bookings.</p>';
      }
      return;
    }

    // Show loading skeleton
    if (bookingList && loadingSkeleton) {
      bookingList.innerHTML = "";
      bookingList.appendChild(loadingSkeleton);
      loadingSkeleton.style.display = "flex";
    }

    // Get user role first (needed to build bookings query)
    const { data: user } = await window.supabaseClient
      .from("users")
      .select("role")
      .eq("user_id", userId)
      .single();

    const role = user?.role || "renter";

    // Build filtered bookings query
    let query = window.supabaseClient
      .from("bookings")
      .select(
        `
        *,
        equipment:equipment_id (
          equipment_id,
          name,
          image_url,
          category
        ),
        renter:renter_id (
          user_id,
          full_name,
          email
        ),
        owner:owner_id (
          user_id,
          full_name,
          email
        )
      `
      )
      .order("created_at", { ascending: false });

    if (role === "owner") {
      query = query.eq("owner_id", userId);
    } else {
      query = query.eq("renter_id", userId);
    }

    // Apply status filter
    if (filter === "requests") {
      query = query.eq("status", "pending");
    } else if (filter !== "all") {
      query = query.eq("status", filter);
    }

    // If filter is not "all", we need to fetch all bookings for stats in parallel
    // If filter is "all", we can use the same data for stats
    let statsQuery = null;
    if (filter !== "all") {
      statsQuery = window.supabaseClient
        .from("bookings")
        .select("status, payment_status, total_amount")
        .order("created_at", { ascending: false });

      if (role === "owner") {
        statsQuery = statsQuery.eq("owner_id", userId);
      } else {
        statsQuery = statsQuery.eq("renter_id", userId);
      }
    }

    // Execute queries in parallel
    const queries = [query];
    if (statsQuery) {
      queries.push(statsQuery);
    }

    const results = await Promise.all(queries);
    const { data: bookings, error } = results[0];
    const { data: allBookingsForStats, error: statsError } = statsQuery
      ? results[1]
      : { data: null, error: null };

    if (error) {
      throw error;
    }

    // Transform data to match expected format
    allBookings = (bookings || []).map((booking) => ({
      id: booking.booking_id,
      booking_number: booking.booking_number,
      status: booking.status,
      payment_status: booking.payment_status,
      return_status: booking.return_status || "not_returned",
      pickup_location: booking.pickup_location || "",
      pickup_time: booking.pickup_time || "",
      role: role,
      equipment: {
        name: booking.equipment?.name || "Unknown Equipment",
        image_url: booking.equipment?.image_url || "",
        category: booking.equipment?.category || "",
      },
      other_user:
        role === "owner"
          ? {
              name: booking.renter?.full_name || "Unknown",
              email: booking.renter?.email || "",
            }
          : {
              name: booking.owner?.full_name || "Unknown",
              email: booking.owner?.email || "",
            },
      dates: {
        start: booking.start_date,
        end: booking.end_date,
        total_days: booking.total_days,
      },
      pricing: {
        price_per_day: parseFloat(booking.price_per_day),
        total_amount: parseFloat(booking.total_amount),
      },
    }));

    // Hide loading skeleton
    if (loadingSkeleton) {
      loadingSkeleton.style.display = "none";
    }

    renderBookings(allBookings);

    // Calculate stats from fetched data
    // If filter is "all", use the bookings we already fetched (they're all bookings)
    // Otherwise, use the allBookingsForStats we fetched in parallel
    const statsData = filter === "all" ? bookings : allBookingsForStats;

    if (statsData && !statsError) {
      const stats = {
        active_rentals: statsData.filter(
          (b) => b.status === "active" || b.status === "approved"
        ).length,
        pending_requests: statsData.filter((b) => b.status === "pending")
          .length,
        total_spent: statsData
          .filter((b) => b.payment_status === "paid")
          .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0),
      };
      updateStats(stats);
    } else {
      // Fallback to calculating from current filtered bookings
      const stats = {
        active_rentals: allBookings.filter(
          (b) => b.status === "active" || b.status === "approved"
        ).length,
        pending_requests: allBookings.filter((b) => b.status === "pending")
          .length,
        total_spent: allBookings
          .filter((b) => b.payment_status === "paid")
          .reduce((sum, b) => sum + b.pricing.total_amount, 0),
      };
      updateStats(stats);
    }
  } catch (error) {
    console.error("Error loading bookings:", error);

    // Hide loading skeleton on error
    const loadingSkeleton = document.getElementById("loadingSkeleton");
    const bookingList = document.querySelector(".booking-list");

    if (loadingSkeleton) {
      loadingSkeleton.style.display = "none";
    }

    if (bookingList) {
      bookingList.innerHTML =
        '<p style="text-align: center; padding: 2rem; color: var(--error-red);">Error loading bookings. Please try again.</p>';
    }
  }
}

// Render bookings to page
function renderBookings(bookings) {
  const bookingList = document.querySelector(".booking-list");
  if (!bookingList) return;

  if (bookings.length === 0) {
    bookingList.innerHTML =
      '<p style="text-align: center; padding: 2rem; color: var(--text-gray);">No bookings found.</p>';
    return;
  }

  bookingList.innerHTML = bookings
    .map((booking) => createBookingCard(booking))
    .join("");

  // Attach event listeners
  attachBookingEventListeners();
}

// Create booking card HTML
function createBookingCard(booking) {
  const statusClass = booking.status.toLowerCase();
  let statusText = booking.status === "pending" && booking.role === "renter" ? "Pending Approval" : booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
  if (booking.status === "active") statusText = "Active";
  if (booking.status === "completed") statusText = "Completed";
  
  // Custom status text override for active rentals
  if (booking.role === 'renter' && booking.status === 'active') {
      statusText = 'Active';
  }

  const role = booking.role || "renter";
  const otherUserName = booking.other_user?.name || "Unknown";

  // Get equipment image
  let imageUrl = booking.equipment?.image_url || "";
  const equipmentName = booking.equipment?.name || "Equipment";
  
  if (!imageUrl || imageUrl.trim() === "" || (!imageUrl.startsWith("http") && !imageUrl.startsWith("//"))) {
    imageUrl = `https://via.placeholder.com/200x150?text=${encodeURIComponent(equipmentName)}`;
  }
  imageUrl = imageUrl.trim();

  // Color logic
  let statusDotColor = 'var(--text-gray)';
  if (booking.status === 'active') statusDotColor = 'var(--success-green)';
  if (booking.status === 'pending') statusDotColor = 'var(--primary-orange)';
  if (booking.status === 'completed') statusDotColor = 'var(--text-gray)';

  // Payment Status HTML
  let paymentStatusHtml = "";
  if (booking.payment_status === "paid") {
    paymentStatusHtml = '<span style="color: var(--success-green); font-weight: 500; font-size: 10px; margin-top: 4px; display: block;">Paid</span>';
  } else if (booking.status === "approved" && booking.payment_status === "pending") {
    paymentStatusHtml = '<span style="color: var(--primary-orange); font-weight: 500; font-size: 10px; margin-top: 4px; display: block;">Payment Due</span>';
  }

  // Button Logic
  let actionButton = "";
  if (role === "renter") {
    if (booking.status === "pending") {
       // Pending Request
       actionButton = `<button class="btn-cancel-top" style="font-size: 12px; padding: 6px 16px;" onclick="cancelBooking(${booking.id})">Cancel Request</button>`;
    } else if (booking.status === "approved" && booking.payment_status === "pending") {
       // Approved, needs payment
       actionButton = `<button class="btn-list-item" style="font-size: 12px; padding: 8px 16px; width: 100%;" onclick="payBooking(${booking.id})">Pay Now</button>`;
    } else if (booking.status === "active" && booking.return_status === "returned") {
       // Already marked as returned, waiting for owner confirmation
       actionButton = `<button class="btn-list-item" style="font-size: 12px; padding: 8px 16px; width: 100%; background: var(--text-gray); cursor: not-allowed; opacity: 0.7;" disabled>Awaiting Confirmation</button>`;
    } else if (booking.status === "active") {
       // Active rental - can mark as returned
       actionButton = `<button class="btn-list-item" style="font-size: 12px; padding: 8px 16px; width: 100%;" onclick="markAsReturned(${booking.id})">Mark as Returned</button>`;
    }

  } else {
    // Owner Actions
     if (booking.status === "pending") {
        actionButton = `
         <div style="display: flex; gap: 8px; width: 100%; justify-content: flex-end;">
             <button class="btn-list-item" onclick="approveBooking(${booking.id})" style="font-size: 12px; padding: 6px 12px;">Approve</button>
             <button class="btn-cancel-top" onclick="rejectBooking(${booking.id})" style="font-size: 12px; padding: 6px 12px;">Reject</button>
         </div>`;
     } else if (booking.return_status === "returned") {
        actionButton = `<button class="btn-list-item" onclick="confirmReturn(${booking.id})" style="font-size: 12px; padding: 8px 16px;">Confirm Return</button>`;
     }
  }

  // Completed State
  if (booking.status === 'completed') {
      // No button typically, or view receipt
  }

  return `
    <div class="booking-card" data-status="${booking.status}" data-booking-id="${booking.id}">
      <!-- Left: Image -->
      <div class="booking-card-left">
        <img src="${imageUrl}" class="booking-image" alt="${equipmentName}" />
      </div>
      
      <!-- Center: Info -->
      <div class="booking-card-center">
        <h3 class="booking-title" style="margin-bottom: 8px;">${equipmentName}</h3>
        
        <div class="booking-status-row" style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span class="status-dot" style="background-color: ${statusDotColor};"></span>
            <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-dark); letter-spacing: 0.5px;">${statusText}</span>
        </div>

        <div class="booking-meta-row" style="margin-bottom: 6px; font-size: 12px; color: var(--text-gray); display: flex; align-items: center; gap: 8px;">
             <i class="fas fa-calendar-alt" style="width: 14px; text-align: center;"></i>
             <span>${formatDate(booking.dates.start)} - ${formatDate(booking.dates.end)}</span>
        </div>

        <div class="booking-meta-row" style="font-size: 12px; color: var(--text-gray); display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-user" style="width: 14px; text-align: center;"></i>
            <span>${role === "owner" ? "Renter" : "Owner"}: ${otherUserName}</span>
        </div>
        
        ${booking.pickup_location ? `
        <div class="booking-pickup-row" style="margin-top: 12px; font-size: 11px; padding: 8px 12px; background: rgba(254, 116, 44, 0.05); border-radius: 4px; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fas fa-map-marker-alt" style="color: var(--primary-orange);"></i> 
            <span style="font-weight: 600; color: var(--primary-orange);">Pickup Details</span>
            <span style="color: var(--text-dark); margin-left: 4px;">${booking.pickup_location}</span>
            <span style="margin: 0 4px; color: var(--border-color);">|</span> 
            <span style="color: var(--text-dark);">Time: ${booking.pickup_time || 'TBD'}</span>
        </div>` : ''}
      </div>

      <!-- Right: Price & Actions -->
      <div class="booking-card-right">
        <div class="booking-id" style="font-size: 11px; color: var(--text-gray); margin-bottom: 4px;">Booking #${booking.booking_number}</div>
        
        <div class="booking-price-display">
            <div class="price-amount" style="font-size: 18px; font-weight: 700; color: var(--text-dark);">GHC ${booking.pricing.total_amount.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            
            <div class="price-breakdown" style="font-size: 11px; color: var(--text-gray); margin-top: 2px;">
                ${booking.dates.total_days} days x GHC ${booking.pricing.price_per_day.toLocaleString()}/day
            </div>
            
            <div style="text-align: right;">
                ${paymentStatusHtml}
            </div>
        </div>
        
        <div class="booking-action-buttons" style="margin-top: auto; width: 100%; display: flex; justify-content: flex-end;">
             ${actionButton}
        </div>
      </div>
    </div>
  `;
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Update statistics
function updateStats(stats) {
  const activeRentals = document.querySelector('[data-stat="active"]');
  const pendingRequests = document.querySelector('[data-stat="pending"]');
  const totalSpent = document.querySelector('[data-stat="total"]');

  console.log("Updating stats:", stats);

  if (activeRentals) {
    activeRentals.textContent = stats.active_rentals || 0;
    console.log("Updated active rentals:", stats.active_rentals || 0);
  }
  if (pendingRequests) {
    pendingRequests.textContent = stats.pending_requests || 0;
    console.log("Updated pending requests:", stats.pending_requests || 0);
  }
  if (totalSpent) {
    // Format total spent with currency
    const formatted = (stats.total_spent || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    totalSpent.textContent = `GHS ${formatted}`;
    console.log("Updated total spent:", formatted);
  }
}

// Filter bookings (exposed globally for onclick handlers)
window.filterBookings = function (status) {
  currentFilter = status;

  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-filter") === status) {
      btn.classList.add("active");
    }
  });

  // Reload bookings with filter
  loadBookings(status);
};

// Mark equipment as returned (renter)
async function markAsReturned(bookingId) {
  const confirmed = await showConfirm(
    "Have you returned the equipment to the owner? This will notify them to confirm the return.",
    {
      title: "Mark as Returned",
      type: "question",
      confirmText: "Yes, I've Returned It",
      cancelText: "Cancel"
    }
  );
  if (!confirmed) {
    return;
  }

  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      showAlert("Please sign in to mark equipment as returned.", { type: "warning", title: "Sign In Required" });
      return;
    }

    // Get full booking details for the rating modal
    const { data: booking, error: fetchError } = await window.supabaseClient
      .from("bookings")
      .select(`
        *,
        equipment:equipment_id (
          equipment_id,
          name,
          image_url
        ),
        owner:owner_id (
          user_id,
          full_name
        )
      `)
      .eq("booking_id", bookingId)
      .single();

    if (fetchError || !booking) {
      console.error("Error fetching booking:", fetchError);
      showAlert("Could not load booking details.", { type: "error", title: "Error" });
      return;
    }

    if (booking.renter_id !== userId) {
      showAlert("You don't have permission to mark this booking as returned.", { type: "error", title: "Access Denied" });
      return;
    }

    if (booking.status !== "active") {
      showAlert("Only active bookings can be marked as returned.", { type: "warning", title: "Invalid Status" });
      return;
    }

    // Update return status
    const { error } = await window.supabaseClient
      .from("bookings")
      .update({
        return_status: "returned",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);

    if (error) {
      throw error;
    }

    // Send notification email to owner
    await sendReturnNotificationEmail(bookingId);

    showAlert("Equipment marked as returned. Owner will be notified to confirm.", { type: "success", title: "Marked as Returned" });
    
    // Show rating modal
    showRatingModal(booking, userId);
    
  } catch (error) {
    console.error("Error marking as returned:", error);
    showAlert("An error occurred. Please try again.", { type: "error", title: "Error" });
  }
}

// Show rating modal for the booking
function showRatingModal(booking, userId) {
  const equipmentName = booking.equipment?.name || "Equipment";
  const ownerName = booking.owner?.full_name || "Owner";
  const equipmentImage = booking.equipment?.image_url || "https://via.placeholder.com/100x100?text=No+Image";
  
  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "rating-modal-overlay";
  modal.style.cssText = `
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
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div class="rating-modal" style="
      background: white;
      border-radius: 16px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    ">
      <style>
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rating-star {
          font-size: 32px;
          color: #ddd;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .rating-star:hover,
        .rating-star.selected {
          color: #ffc107;
          transform: scale(1.1);
        }
        .rating-star.hovered {
          color: #ffc107;
        }
      </style>
      
      <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: var(--text-dark);">
            Rate Your Experience
          </h2>
          <button class="close-rating-modal" style="
            background: none;
            border: none;
            font-size: 24px;
            color: var(--text-gray);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
          ">&times;</button>
        </div>
        <p style="margin: 8px 0 0 0; color: var(--text-gray); font-size: 14px;">
          How was your rental experience?
        </p>
      </div>
      
      <div style="padding: 24px;">
        <!-- Equipment Info -->
        <div style="display: flex; gap: 16px; margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 12px;">
          <img src="${equipmentImage}" alt="${equipmentName}" style="
            width: 80px;
            height: 80px;
            border-radius: 8px;
            object-fit: cover;
          " />
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: var(--text-dark);">${equipmentName}</h3>
            <p style="margin: 0; font-size: 14px; color: var(--text-gray);">Rented from ${ownerName}</p>
          </div>
        </div>
        
        <!-- Star Rating -->
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="margin: 0 0 16px 0; font-weight: 600; color: var(--text-dark);">Rate the equipment</p>
          <div class="star-rating" style="display: flex; justify-content: center; gap: 8px;">
            <i class="fas fa-star rating-star" data-rating="1"></i>
            <i class="fas fa-star rating-star" data-rating="2"></i>
            <i class="fas fa-star rating-star" data-rating="3"></i>
            <i class="fas fa-star rating-star" data-rating="4"></i>
            <i class="fas fa-star rating-star" data-rating="5"></i>
          </div>
          <p class="rating-text" style="margin: 12px 0 0 0; font-size: 14px; color: var(--text-gray);">
            Click to rate
          </p>
        </div>
        
        <!-- Review Comment -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-dark); font-size: 14px;">
            Write a review (optional)
          </label>
          <textarea id="reviewComment" placeholder="Share your experience with this equipment..." style="
            width: 100%;
            min-height: 100px;
            padding: 12px;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            font-size: 14px;
            resize: vertical;
            font-family: inherit;
            box-sizing: border-box;
          "></textarea>
        </div>
        
        <!-- Submit Button -->
        <div style="display: flex; gap: 12px;">
          <button class="skip-rating-btn" style="
            flex: 1;
            padding: 14px 24px;
            border: 2px solid var(--border-color);
            background: white;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          ">Skip</button>
          <button class="submit-rating-btn" style="
            flex: 2;
            padding: 14px 24px;
            border: none;
            background: var(--primary-orange);
            color: white;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            opacity: 0.5;
          " disabled>Submit Rating</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Star rating interaction
  let selectedRating = 0;
  const stars = modal.querySelectorAll(".rating-star");
  const ratingText = modal.querySelector(".rating-text");
  const submitBtn = modal.querySelector(".submit-rating-btn");
  
  const ratingLabels = {
    1: "Poor",
    2: "Fair", 
    3: "Good",
    4: "Very Good",
    5: "Excellent"
  };
  
  stars.forEach(star => {
    star.addEventListener("mouseenter", function() {
      const rating = parseInt(this.dataset.rating);
      stars.forEach((s, i) => {
        s.classList.toggle("hovered", i < rating);
      });
    });
    
    star.addEventListener("mouseleave", function() {
      stars.forEach(s => s.classList.remove("hovered"));
    });
    
    star.addEventListener("click", function() {
      selectedRating = parseInt(this.dataset.rating);
      stars.forEach((s, i) => {
        s.classList.toggle("selected", i < selectedRating);
      });
      ratingText.textContent = ratingLabels[selectedRating];
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
    });
  });
  
  // Close modal
  modal.querySelector(".close-rating-modal").addEventListener("click", () => {
    modal.remove();
    loadBookings(currentFilter);
  });
  
  modal.querySelector(".skip-rating-btn").addEventListener("click", () => {
    modal.remove();
    loadBookings(currentFilter);
  });
  
  // Submit rating
  submitBtn.addEventListener("click", async () => {
    if (selectedRating === 0) return;
    
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    
    const comment = modal.querySelector("#reviewComment").value.trim();
    
    try {
      // Insert rating into database
      const { error } = await window.supabaseClient
        .from("ratings")
        .insert({
          booking_id: booking.booking_id,
          reviewer_id: userId,
          reviewee_id: booking.owner_id,
          equipment_id: booking.equipment_id,
          rating: selectedRating,
          comment: comment || null
        });
      
      if (error) {
        console.error("Error submitting rating:", error);
        showAlert("Failed to submit rating. Please try again.", { type: "error", title: "Error" });
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Rating";
        return;
      }
      
      // Update equipment average rating
      await updateEquipmentRating(booking.equipment_id);
      
      modal.remove();
      showAlert("Thank you for your rating!", { type: "success", title: "Rating Submitted" });
      loadBookings(currentFilter);
      
    } catch (error) {
      console.error("Error submitting rating:", error);
      showAlert("Failed to submit rating. Please try again.", { type: "error", title: "Error" });
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Rating";
    }
  });
  
  // Close on overlay click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
      loadBookings(currentFilter);
    }
  });
}

// Update equipment average rating
async function updateEquipmentRating(equipmentId) {
  try {
    // Get all ratings for this equipment
    const { data: ratings, error } = await window.supabaseClient
      .from("ratings")
      .select("rating")
      .eq("equipment_id", equipmentId);
    
    if (error || !ratings || ratings.length === 0) {
      console.log("No ratings found for equipment:", equipmentId);
      return;
    }
    
    // Calculate average
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / ratings.length;
    
    // Update equipment
    const { error: updateError } = await window.supabaseClient
      .from("equipment")
      .update({
        rating: parseFloat(average.toFixed(2)),
        total_rentals: ratings.length
      })
      .eq("equipment_id", equipmentId);
    
    if (updateError) {
      console.error("Error updating equipment rating:", updateError);
    }
  } catch (error) {
    console.error("Error in updateEquipmentRating:", error);
  }
}


// Confirm return (owner)
async function confirmReturn(bookingId) {
  const confirmed = await showConfirm(
    "Confirm that the equipment has been returned in good condition?",
    {
      title: "Confirm Return",
      type: "question",
      confirmText: "Confirm Return",
      cancelText: "Cancel"
    }
  );
  if (!confirmed) {
    return;
  }

  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      showAlert("Please sign in to confirm return.", { type: "warning", title: "Sign In Required" });
      return;
    }

    // Verify this is the owner's booking
    const { data: booking } = await window.supabaseClient
      .from("bookings")
      .select("owner_id, status, return_status")
      .eq("booking_id", bookingId)
      .single();

    if (!booking || booking.owner_id !== userId) {
      showAlert("You don't have permission to confirm this return.", { type: "error", title: "Access Denied" });
      return;
    }

    if (booking.return_status !== "returned") {
      showAlert("Equipment must be marked as returned by renter first.", { type: "warning", title: "Pending Return" });
      return;
    }

    // Update booking status
    const { error } = await window.supabaseClient
      .from("bookings")
      .update({
        return_status: "confirmed",
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);

    if (error) {
      throw error;
    }

    showAlert("Return confirmed! Booking marked as completed.", { type: "success", title: "Return Confirmed" });
    loadBookings(currentFilter);
  } catch (error) {
    console.error("Error confirming return:", error);
    showAlert("An error occurred. Please try again.", { type: "error", title: "Error" });
  }
}

// Send booking approval notification
async function sendBookingApprovalEmail(booking, pickupLocation, pickupTime) {
  // Creates notification in database (email can be added via Supabase Edge Functions)

  // For now, create a notification in the database
  try {
    const { data: renter } = await window.supabaseClient
      .from("users")
      .select("user_id, email")
      .eq("user_id", booking.renter_id)
      .single();

    if (renter) {
      await window.supabaseClient.from("notifications").insert({
        user_id: renter.user_id,
        type: "booking_approved",
        title: "Booking Approved",
        message: `Your booking for ${
          booking.equipment?.name || "equipment"
        } has been approved. Pickup: ${pickupLocation} at ${pickupTime}`,
        related_booking_id: booking.booking_id,
      });

      // Update notification badge
      if (window.updateGlobalNotificationBadge) {
        window.updateGlobalNotificationBadge();
      }
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

// Send return notification
async function sendReturnNotificationEmail(bookingId) {
  // Creates notification in database (email can be added via Supabase Edge Functions)

  // Create notification for owner
  try {
    const { data: booking } = await window.supabaseClient
      .from("bookings")
      .select("owner_id, equipment:equipment_id(name)")
      .eq("booking_id", bookingId)
      .single();

    if (booking) {
      await window.supabaseClient.from("notifications").insert({
        user_id: booking.owner_id,
        type: "equipment_returned",
        title: "Equipment Returned",
        message: `Equipment ${
          booking.equipment?.name || ""
        } has been returned. Please confirm the return.`,
        related_booking_id: bookingId,
      });

      // Update notification badge
      if (window.updateGlobalNotificationBadge) {
        window.updateGlobalNotificationBadge();
      }
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

// Expose other functions globally
window.approveBooking = approveBooking;
window.rejectBooking = rejectBooking;
window.cancelBooking = cancelBooking;
window.payBooking = payBooking;
window.loadOlderBookings = loadOlderBookings;
window.markAsReturned = markAsReturned;
window.confirmReturn = confirmReturn;

// Complete booking (owner only)
async function completeBooking(bookingId) {
  const confirmed = await showConfirm("Mark this booking as completed?", {
    title: "Complete Booking",
    type: "question",
    confirmText: "Complete",
    cancelText: "Cancel"
  });
  if (!confirmed) return;
  updateBookingStatus(bookingId, "completed");
}

// Approve booking (owner only) - with pickup details
async function approveBooking(bookingId) {
  // Get booking details first
  try {
    const { data: booking } = await window.supabaseClient
      .from("bookings")
      .select("*, equipment:equipment_id(name)")
      .eq("booking_id", bookingId)
      .single();

    if (!booking) {
      showAlert("Booking not found.", { type: "error", title: "Not Found" });
      return;
    }

    // Prompt for pickup details
    const pickupLocation = prompt(
      "Enter pickup location (address):",
      booking.equipment?.location || ""
    );
    if (pickupLocation === null) return; // User cancelled

    const pickupTime = prompt(
      "Enter pickup time (e.g., '10:00 AM' or '2:00 PM'):",
      "10:00 AM"
    );
    if (pickupTime === null) return; // User cancelled

    if (!pickupLocation.trim() || !pickupTime.trim()) {
      showAlert("Pickup location and time are required.", { type: "warning", title: "Missing Details" });
      return;
    }

    const approvalConfirmed = await showConfirm(
      `Approve this booking request?\n\nPickup Location: ${pickupLocation}\nPickup Time: ${pickupTime}`,
      {
        title: "Approve Booking",
        type: "question",
        confirmText: "Approve",
        cancelText: "Cancel"
      }
    );
    if (!approvalConfirmed) {
      return;
    }

    // Update booking with approval and pickup details
    const userId = await window.getCurrentUserId();
    const { error } = await window.supabaseClient
      .from("bookings")
      .update({
        status: "approved",
        pickup_location: pickupLocation.trim(),
        pickup_time: pickupTime.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);

    if (error) {
      throw error;
    }

    // Send email notification to renter (if email service is set up)
    await sendBookingApprovalEmail(booking, pickupLocation, pickupTime);

    showAlert("Booking approved! Renter has been notified with pickup details.", { type: "success", title: "Booking Approved" });
    loadBookings(currentFilter);
  } catch (error) {
    console.error("Error approving booking:", error);
    showAlert("An error occurred. Please try again.", { type: "error", title: "Error" });
  }
}

// Reject booking (owner only)
async function rejectBooking(bookingId) {
  const reason = prompt(
    "Please provide a reason for rejecting this booking (optional):"
  );
  if (reason === null) return; // User cancelled

  const confirmed = await showConfirm("Reject this booking request?", {
    title: "Reject Booking",
    type: "warning",
    confirmText: "Reject",
    cancelText: "Cancel",
    dangerous: true
  });
  if (!confirmed) return;

  updateBookingStatus(bookingId, "cancelled", reason);
}

// Cancel booking
async function cancelBooking(bookingId) {
  const confirmed = await showConfirm("Are you sure you want to cancel this booking?", {
    title: "Cancel Booking",
    type: "warning",
    confirmText: "Yes, Cancel",
    cancelText: "No, Keep It",
    dangerous: true
  });
  if (!confirmed) return;

  updateBookingStatus(bookingId, "cancelled");
}

// Update booking status
async function updateBookingStatus(
  bookingId,
  status,
  cancellationReason = null
) {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      showAlert("Please sign in to update bookings.", { type: "warning", title: "Sign In Required" });
      return;
    }

    // Verify ownership/renter rights
    const { data: booking } = await window.supabaseClient
      .from("bookings")
      .select("owner_id, renter_id, status")
      .eq("booking_id", bookingId)
      .single();

    if (!booking) {
      showAlert("Booking not found.", { type: "error", title: "Not Found" });
      return;
    }

    // Check permissions
    const { data: user } = await window.supabaseClient
      .from("users")
      .select("role")
      .eq("user_id", userId)
      .single();

    const userRole = user?.role;
    const isOwner = booking.owner_id === userId;
    const isRenter = booking.renter_id === userId;

    // Validate status transitions
    if (status === "approved" || status === "rejected") {
      if (!isOwner || userRole !== "owner") {
        showAlert("Only the owner can approve or reject bookings.", { type: "error", title: "Access Denied" });
        return;
      }
      if (booking.status !== "pending") {
        showAlert("Only pending bookings can be approved or rejected.", { type: "warning", title: "Invalid Status" });
        return;
      }
    } else if (status === "cancelled") {
      if (!isOwner && !isRenter) {
        showAlert("You don't have permission to cancel this booking.", { type: "error", title: "Access Denied" });
        return;
      }
      if (booking.status === "completed" || booking.status === "cancelled") {
        showAlert("This booking cannot be cancelled.", { type: "warning", title: "Invalid Status" });
        return;
      }
    }

    // Update booking status
    const updateData = {
      status: status,
      updated_at: new Date().toISOString(),
    };

    // Add cancellation reason if provided
    if (cancellationReason && cancellationReason.trim()) {
      updateData.cancellation_reason = cancellationReason.trim();
    }

    const { error } = await window.supabaseClient
      .from("bookings")
      .update(updateData)
      .eq("booking_id", bookingId);

    if (error) {
      throw error;
    }

    showAlert("Booking status updated successfully", { type: "success", title: "Updated" });
    loadBookings(currentFilter); // Reload bookings
  } catch (error) {
    console.error("Error updating booking:", error);
    showAlert("An error occurred. Please try again.", { type: "error", title: "Error" });
  }
}

// Pay booking (Demo Payment Flow)
async function payBooking(bookingId) {
  try {
    // Get booking details
    const userId = await window.getCurrentUserId();
    if (!userId) {
      showAlert("Please sign in to make a payment.", { type: "warning", title: "Sign In Required" });
      return;
    }

    const { data: booking, error: bookingError } = await window.supabaseClient
      .from("bookings")
      .select(
        `
        *,
        equipment:equipment_id (
          name,
          image_url
        )
      `
      )
      .eq("booking_id", bookingId)
      .eq("renter_id", userId)
      .single();

    if (bookingError || !booking) {
      showAlert("Booking not found or access denied.", { type: "error", title: "Access Denied" });
      return;
    }

    if (booking.status !== "approved") {
      showAlert("This booking must be approved before payment.", { type: "warning", title: "Not Approved" });
      return;
    }

    if (booking.payment_status === "paid") {
      showAlert("This booking is already paid.", { type: "info", title: "Already Paid" });
      return;
    }

    // Show demo payment confirmation
    const confirmMessage =
      `Equipment: ${booking.equipment?.name || "Unknown"}\n` +
      `Amount: GHS ${parseFloat(booking.total_amount).toFixed(2)}\n` +
      `Booking: ${booking.booking_number}\n\n` +
      `This is a demo payment. No actual money will be charged.`;

    const paymentConfirmed = await showConfirm(confirmMessage, {
      title: "Demo Payment",
      type: "info",
      confirmText: "Pay Now",
      cancelText: "Cancel"
    });
    if (!paymentConfirmed) {
      return;
    }

    // Simulate payment processing
    const loadingMessage = document.createElement("div");
    loadingMessage.style.cssText =
      "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10000; text-align: center;";
    loadingMessage.innerHTML =
      '<p>Processing payment...</p><div style="margin-top: 1rem;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i></div>';
    document.body.appendChild(loadingMessage);

    // Simulate payment delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update booking status in Supabase
    const { error: updateError } = await window.supabaseClient
      .from("bookings")
      .update({
        payment_status: "paid",
        status: "active",
        payment_reference: "DEMO_" + Date.now(),
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);

    document.body.removeChild(loadingMessage);

    if (updateError) {
      throw updateError;
    }

    // Create payment notification for owner
    if (booking && booking.owner_id) {
      try {
        await window.supabaseClient.from("notifications").insert({
          user_id: booking.owner_id,
          type: "payment_received",
          title: "Payment Received",
          message: `Payment of GHS ${parseFloat(
            booking.total_amount || 0
          ).toFixed(2)} has been received for booking ${
            booking.equipment?.name || "equipment"
          }.`,
          related_booking_id: bookingId,
        });

        // Update notification badge
        if (window.updateGlobalNotificationBadge) {
          window.updateGlobalNotificationBadge();
        }
      } catch (notifError) {
        console.error("Error creating payment notification:", notifError);
        // Don't fail payment if notification fails
      }
    }

    // Show success message
    if (window.showToast) {
      window.showToast("Payment successful! Booking confirmed.", { type: "success" });
    } else {
      showAlert("Payment successful! Booking confirmed.", { type: "success", title: "Payment Complete" });
    }

    // Reload bookings
    loadBookings(currentFilter);
  } catch (error) {
    console.error("Payment error:", error);
    if (window.showToast) {
      window.showToast("Payment failed: " + error.message, { type: "error" });
    } else {
      showAlert("Payment failed: " + error.message, { type: "error", title: "Payment Failed" });
    }
  }
}

// Attach event listeners to booking cards
function attachBookingEventListeners() {
  // Event listeners are attached via onclick in HTML
}

// Load older bookings (pagination)
function loadOlderBookings() {
  console.log("Loading older bookings...");
  // Pagination can be implemented when needed
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async function () {
  // Update user info (avatar)
  if (window.updateUserInfo) {
    window.updateUserInfo();
  }

  // Show Requests tab only for owners
  try {
    const userId = await window.getCurrentUserId();
    if (userId) {
      const { data: user } = await window.supabaseClient
        .from("users")
        .select("role")
        .eq("user_id", userId)
        .single();

      const requestsTab = document.getElementById("requestsTab");
      if (requestsTab && user?.role === "owner") {
        requestsTab.style.display = "inline-block";
      }
    }
  } catch (error) {
    console.error("Error checking user role:", error);
  }

  loadBookings("all");
});
