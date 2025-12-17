/**
 * Bookings Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
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
  const statusText =
    booking.status === "pending" && booking.role === "renter"
      ? "Pending Approval"
      : booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
  const role = booking.role || "renter";
  const otherUserName = booking.other_user?.name || "Unknown";

  // Get equipment image - validate URL format
  let imageUrl = booking.equipment?.image_url || "";
  const equipmentName = booking.equipment?.name || "Equipment";

  // Validate URL - must start with http:// or https://
  if (!imageUrl || imageUrl.trim() === "") {
    // No image URL provided, use placeholder
    imageUrl = `https://via.placeholder.com/200x150?text=${encodeURIComponent(
      equipmentName
    )}`;
  } else if (
    !imageUrl.startsWith("http://") &&
    !imageUrl.startsWith("https://") &&
    !imageUrl.startsWith("//")
  ) {
    // If it's not a valid URL (might be a Cloudinary public_id or relative path), use placeholder
    // In production, you might want to construct Cloudinary URL here
    imageUrl = `https://via.placeholder.com/200x150?text=${encodeURIComponent(
      equipmentName
    )}`;
  }

  // Ensure imageUrl is properly encoded
  imageUrl = imageUrl.trim();

  // Payment status display
  let paymentStatusHtml = "";
  if (booking.payment_status === "paid") {
    paymentStatusHtml = '<div class="price-status paid">Paid</div>';
  } else if (
    booking.status === "approved" &&
    booking.payment_status === "pending"
  ) {
    paymentStatusHtml =
      '<div class="price-status pending">Payment Required</div>';
  } else if (booking.status === "pending") {
    paymentStatusHtml =
      '<div class="price-status pending">Awaiting Confirmation</div>';
  }

  // Determine cancel button visibility
  let cancelButtonHtml = "";
  const canCancel =
    role === "renter" &&
    (booking.status === "pending" ||
      (booking.status === "approved" && booking.payment_status === "pending"));

  if (canCancel) {
    const cancelText =
      booking.status === "pending" ? "Cancel Request" : "Cancel";
    cancelButtonHtml = `<button class="btn-cancel-top" onclick="cancelBooking(${booking.id})">${cancelText}</button>`;
  }

  let actionButtons = "";
  if (role === "owner") {
    if (booking.status === "pending") {
      actionButtons = `
        <div style="display: flex; gap: var(--spacing-xs);">
          <button class="btn-list-item" style="padding: 8px 16px; font-size: 12px" onclick="approveBooking(${booking.id})">Approve</button>
          <button class="btn-cancel" onclick="rejectBooking(${booking.id})">Reject</button>
        </div>
      `;
    } else if (booking.status === "active") {
      // Check if renter has marked as returned
      const returnStatus = booking.return_status || "not_returned";
      if (returnStatus === "returned") {
        // Owner needs to confirm return
        actionButtons = `
          <div style="display: flex; gap: var(--spacing-xs);">
            <button class="btn-list-item" style="padding: 8px 16px; font-size: 12px" onclick="confirmReturn(${booking.id})">Confirm Return</button>
          </div>
        `;
      } else {
        // Waiting for renter to return
        actionButtons = `
          <p style="font-size: 12px; color: var(--text-gray); margin-top: 8px;">
            <i class="fas fa-clock"></i> Waiting for equipment return
          </p>
        `;
      }
    } else if (
      booking.status === "approved" &&
      booking.payment_status === "paid"
    ) {
      // Show pickup details if available
      let pickupInfo = "";
      if (booking.pickup_location || booking.pickup_time) {
        pickupInfo = `
          <div style="margin-top: var(--spacing-xs); padding: var(--spacing-xs); background: rgba(254, 116, 44, 0.05); border-radius: var(--radius-sm);">
            <div style="font-size: 12px; font-weight: 600; color: var(--primary-orange); margin-bottom: 4px;">
              <i class="fas fa-map-marker-alt"></i> Pickup Details
            </div>
            ${
              booking.pickup_location
                ? `<div style="font-size: 11px; color: var(--text-dark);">Location: ${booking.pickup_location}</div>`
                : ""
            }
            ${
              booking.pickup_time
                ? `<div style="font-size: 11px; color: var(--text-dark);">Time: ${booking.pickup_time}</div>`
                : ""
            }
          </div>
        `;
      }
      actionButtons = pickupInfo;
    }
  } else {
    if (booking.status === "approved" && booking.payment_status === "pending") {
      actionButtons = `
        <div style="display: flex; gap: var(--spacing-xs);">
          <button class="btn-list-item" style="padding: 8px 16px; font-size: 12px" onclick="payBooking(${booking.id})">Pay Now</button>
        </div>
      `;
    } else if (booking.status === "pending") {
      actionButtons = `
        <p style="font-size: 12px; color: var(--text-gray); margin-top: 8px;">
          <i class="fas fa-info-circle"></i> Free cancellation
        </p>
      `;
    } else if (
      booking.status === "active" &&
      booking.payment_status === "paid"
    ) {
      // Renter can mark equipment as returned
      const returnStatus = booking.return_status || "not_returned";
      if (returnStatus === "not_returned") {
        actionButtons = `
          <div style="display: flex; gap: var(--spacing-xs);">
            <button class="btn-list-item" style="padding: 8px 16px; font-size: 12px" onclick="markAsReturned(${booking.id})">Mark as Returned</button>
          </div>
        `;
      } else if (returnStatus === "returned") {
        actionButtons = `
          <p style="font-size: 12px; color: var(--text-gray); margin-top: 8px;">
            <i class="fas fa-check-circle"></i> Returned - Awaiting owner confirmation
          </p>
        `;
      } else if (returnStatus === "confirmed") {
        actionButtons = `
          <p style="font-size: 12px; color: var(--success-green); margin-top: 8px;">
            <i class="fas fa-check-circle"></i> Return confirmed by owner
          </p>
        `;
      }
    }
  }

  return `
    <div class="booking-card" data-status="${
      booking.status
    }" data-booking-id="${booking.id}">
      <img src="${imageUrl}" alt="${
    booking.equipment.name
  }" class="booking-image" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/200x150?text=${encodeURIComponent(
    booking.equipment.name || "Equipment"
  )}'" />
      <div class="booking-content">
        <div class="booking-info">
          <div class="booking-header">
            <h3 class="booking-title">${booking.equipment.name}</h3>
            <div class="booking-id">Booking #${booking.booking_number}</div>
          </div>
          <div class="booking-status">
            <span class="status-dot ${statusClass}"></span>
            <span style="text-transform: uppercase; font-weight: 500">${statusText}</span>
          </div>
          <div class="booking-details">
            <div class="booking-detail-item">
              <i class="fas fa-calendar"></i>
              <span>${formatDate(booking.dates.start)} - ${formatDate(
    booking.dates.end
  )}</span>
            </div>
            <div class="booking-detail-item">
              <i class="fas fa-user"></i>
              <span>${
                role === "owner" ? "Renter" : "Owner"
              }: ${otherUserName}</span>
            </div>
            ${
              booking.pickup_location &&
              (booking.status === "approved" || booking.status === "active")
                ? `
            <div class="booking-detail-item" style="margin-top: var(--spacing-xs); padding: var(--spacing-xs); background: rgba(254, 116, 44, 0.05); border-radius: var(--radius-sm);">
              <div style="font-size: 12px; font-weight: 600; color: var(--primary-orange); margin-bottom: 4px;">
                <i class="fas fa-map-marker-alt"></i> Pickup Details
              </div>
              <div style="font-size: 11px; color: var(--text-dark);">${
                booking.pickup_location
              }</div>
              ${
                booking.pickup_time
                  ? `<div style="font-size: 11px; color: var(--text-dark); margin-top: 2px;">Time: ${booking.pickup_time}</div>`
                  : ""
              }
            </div>
            `
                : ""
            }
          </div>
        </div>
        <div class="booking-actions">
          ${cancelButtonHtml}
          <div class="booking-price">
            <div class="price-amount">GHC ${booking.pricing.total_amount.toLocaleString(
              "en-US",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}</div>
            <div class="price-breakdown">${booking.dates.total_days} ${
    booking.dates.total_days === 1 ? "day" : "days"
  } x GHC ${booking.pricing.price_per_day.toLocaleString()}/day</div>
            ${paymentStatusHtml}
          </div>
          ${actionButtons}
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

    // Verify this is the renter's booking
    const { data: booking } = await window.supabaseClient
      .from("bookings")
      .select("renter_id, status")
      .eq("booking_id", bookingId)
      .single();

    if (!booking || booking.renter_id !== userId) {
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
    loadBookings(currentFilter);
  } catch (error) {
    console.error("Error marking as returned:", error);
    showAlert("An error occurred. Please try again.", { type: "error", title: "Error" });
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
