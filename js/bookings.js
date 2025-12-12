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
    if (!userId) {
      console.error("User not authenticated");
      document.querySelector(".booking-list").innerHTML =
        '<p style="text-align: center; padding: 2rem; color: var(--text-gray);">Please sign in to view bookings.</p>';
      return;
    }

    // Get user role
    const { data: user } = await window.supabaseClient
      .from("users")
      .select("role")
      .eq("user_id", userId)
      .single();

    const role = user?.role || "renter";

    // Build query based on role
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
    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data: bookings, error } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match expected format
    allBookings = (bookings || []).map((booking) => ({
      id: booking.booking_id,
      booking_number: booking.booking_number,
      status: booking.status,
      payment_status: booking.payment_status,
      role: role,
      equipment: {
        name: booking.equipment?.name || "Unknown Equipment",
        image_url: booking.equipment?.image_url || "",
        category: booking.equipment?.category || "",
      },
      other_user:
        role === "owner"
          ? { name: booking.renter?.full_name || "Unknown" }
          : { name: booking.owner?.full_name || "Unknown" },
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

    renderBookings(allBookings);

    // Calculate stats from ALL bookings (not filtered)
    // We need to fetch all bookings for stats, regardless of filter
    let statsQuery = window.supabaseClient
      .from("bookings")
      .select("status, payment_status, total_amount")
      .order("created_at", { ascending: false });

    if (role === "owner") {
      statsQuery = statsQuery.eq("owner_id", userId);
    } else {
      statsQuery = statsQuery.eq("renter_id", userId);
    }

    const { data: allBookingsForStats, error: statsError } = await statsQuery;

    if (!statsError && allBookingsForStats) {
      const stats = {
        active_rentals: allBookingsForStats.filter(
          (b) => b.status === "active" || b.status === "approved"
        ).length,
        pending_requests: allBookingsForStats.filter((b) => b.status === "pending")
          .length,
        total_spent: allBookingsForStats
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
    document.querySelector(".booking-list").innerHTML =
      '<p style="text-align: center; padding: 2rem; color: var(--error-red);">Error loading bookings. Please try again.</p>';
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
    imageUrl = `https://via.placeholder.com/200x150?text=${encodeURIComponent(equipmentName)}`;
  } else if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://") && !imageUrl.startsWith("//")) {
    // If it's not a valid URL (might be a Cloudinary public_id or relative path), use placeholder
    // In production, you might want to construct Cloudinary URL here
    imageUrl = `https://via.placeholder.com/200x150?text=${encodeURIComponent(equipmentName)}`;
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
  const canCancel = (role === "renter" && (booking.status === "pending" || (booking.status === "approved" && booking.payment_status === "pending")));
  
  if (canCancel) {
    const cancelText = booking.status === "pending" ? "Cancel Request" : "Cancel";
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
      actionButtons = `
        <div style="display: flex; gap: var(--spacing-xs);">
          <button class="btn-list-item" style="padding: 8px 16px; font-size: 12px" onclick="completeBooking(${booking.id})">Mark Complete</button>
        </div>
      `;
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
    }
  }

  return `
    <div class="booking-card" data-status="${
      booking.status
    }" data-booking-id="${booking.id}">
      <img src="${imageUrl}" alt="${
    booking.equipment.name
  }" class="booking-image" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/200x150?text=${encodeURIComponent(booking.equipment.name || 'Equipment')}'" />
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
              <span>${formatDate(booking.dates.start)} - ${formatDate(booking.dates.end)}</span>
            </div>
            <div class="booking-detail-item">
              <i class="fas fa-user"></i>
              <span>Owner: ${otherUserName}</span>
            </div>
          </div>
        </div>
        <div class="booking-actions">
          ${cancelButtonHtml}
          <div class="booking-price">
            <div class="price-amount">GHC ${booking.pricing.total_amount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</div>
            <div class="price-breakdown">${booking.dates.total_days} ${booking.dates.total_days === 1 ? "day" : "days"} x GHC ${booking.pricing.price_per_day.toLocaleString()}/day</div>
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

// Expose other functions globally
window.approveBooking = approveBooking;
window.rejectBooking = rejectBooking;
window.cancelBooking = cancelBooking;
window.payBooking = payBooking;
window.loadOlderBookings = loadOlderBookings;

// Complete booking (owner only)
async function completeBooking(bookingId) {
  if (!confirm("Mark this booking as completed?")) return;
  updateBookingStatus(bookingId, "completed");
}

// Approve booking (owner only)
function approveBooking(bookingId) {
  if (!confirm("Approve this booking request?")) return;

  updateBookingStatus(bookingId, "approved");
}

// Reject booking (owner only)
function rejectBooking(bookingId) {
  if (!confirm("Reject this booking request?")) return;

  updateBookingStatus(bookingId, "rejected");
}

// Cancel booking
function cancelBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking?")) return;

  updateBookingStatus(bookingId, "cancelled");
}

// Update booking status
async function updateBookingStatus(bookingId, status) {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      alert("Please sign in to update bookings.");
      return;
    }

    // Verify ownership/renter rights
    const { data: booking } = await window.supabaseClient
      .from("bookings")
      .select("owner_id, renter_id, status")
      .eq("booking_id", bookingId)
      .single();

    if (!booking) {
      alert("Booking not found.");
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
        alert("Only the owner can approve or reject bookings.");
        return;
      }
      if (booking.status !== "pending") {
        alert("Only pending bookings can be approved or rejected.");
        return;
      }
    } else if (status === "cancelled") {
      if (!isOwner && !isRenter) {
        alert("You don't have permission to cancel this booking.");
        return;
      }
      if (booking.status === "completed" || booking.status === "cancelled") {
        alert("This booking cannot be cancelled.");
        return;
      }
    }

    // Update booking status
    const { error } = await window.supabaseClient
      .from("bookings")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);

    if (error) {
      throw error;
    }

    alert("Booking status updated successfully");
    loadBookings(currentFilter); // Reload bookings
  } catch (error) {
    console.error("Error updating booking:", error);
    alert("An error occurred. Please try again.");
  }
}

// Pay booking (Demo Payment Flow)
async function payBooking(bookingId) {
  try {
    // Get booking details
    const userId = await window.getCurrentUserId();
    if (!userId) {
      alert("Please sign in to make a payment.");
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
      alert("Booking not found or access denied.");
      return;
    }

    if (booking.status !== "approved") {
      alert("This booking must be approved before payment.");
      return;
    }

    if (booking.payment_status === "paid") {
      alert("This booking is already paid.");
      return;
    }

    // Show demo payment confirmation
    const confirmMessage =
      `DEMO PAYMENT MODE\n\n` +
      `Equipment: ${booking.equipment?.name || "Unknown"}\n` +
      `Amount: GHS ${parseFloat(booking.total_amount).toFixed(2)}\n` +
      `Booking: ${booking.booking_number}\n\n` +
      `This is a demo payment. No actual money will be charged.\n\n` +
      `Click OK to simulate payment.`;

    if (!confirm(confirmMessage)) {
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

    // Show success message
    if (window.showToast) {
      window.showToast("Payment successful! Booking confirmed.", "success");
    } else {
      alert("Payment successful! Booking confirmed.");
    }

    // Reload bookings
    loadBookings(currentFilter);
  } catch (error) {
    console.error("Payment error:", error);
    if (window.showToast) {
      window.showToast("Payment failed: " + error.message, "error");
    } else {
      alert("Payment failed: " + error.message);
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
  // TODO: Implement pagination when API supports it
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  // Update user info (avatar)
  if (window.updateUserInfo) {
    window.updateUserInfo();
  }
  loadBookings("all");
});
