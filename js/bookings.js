/**
 * Bookings Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

let currentFilter = 'all';
let allBookings = [];

// Load bookings from Supabase
async function loadBookings(filter = 'all') {
  currentFilter = filter;
  
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      console.error("User not authenticated");
      document.querySelector('.booking-list').innerHTML = 
        '<p style="text-align: center; padding: 2rem; color: var(--text-gray);">Please sign in to view bookings.</p>';
      return;
    }

    // Get user role
    const { data: user } = await window.supabaseClient
      .from("users")
      .select("role")
      .eq("user_id", userId)
      .single();

    const role = user?.role || 'renter';

    // Build query based on role
    let query = window.supabaseClient
      .from("bookings")
      .select(`
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
      `)
      .order("created_at", { ascending: false });

    if (role === 'owner') {
      query = query.eq("owner_id", userId);
    } else {
      query = query.eq("renter_id", userId);
    }

    // Apply status filter
    if (filter !== 'all') {
      query = query.eq("status", filter);
    }

    const { data: bookings, error } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match expected format
    allBookings = (bookings || []).map(booking => ({
      id: booking.booking_id,
      booking_number: booking.booking_number,
      status: booking.status,
      payment_status: booking.payment_status,
      role: role,
      equipment: {
        name: booking.equipment?.name || 'Unknown Equipment',
        image_url: booking.equipment?.image_url || '',
        category: booking.equipment?.category || ''
      },
      other_user: role === 'owner' 
        ? { name: booking.renter?.full_name || 'Unknown' }
        : { name: booking.owner?.full_name || 'Unknown' },
      dates: {
        start: booking.start_date,
        end: booking.end_date,
        total_days: booking.total_days
      },
      pricing: {
        price_per_day: parseFloat(booking.price_per_day),
        total_amount: parseFloat(booking.total_amount)
      }
    }));

    renderBookings(allBookings);
    
    // Calculate stats
    const stats = {
      active_rentals: allBookings.filter(b => b.status === 'active' || b.status === 'approved').length,
      pending_requests: allBookings.filter(b => b.status === 'pending').length,
      total_spent: allBookings
        .filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + b.pricing.total_amount, 0)
    };
    updateStats(stats);

  } catch (error) {
    console.error("Error loading bookings:", error);
    document.querySelector('.booking-list').innerHTML = 
      '<p style="text-align: center; padding: 2rem; color: var(--error-red);">Error loading bookings. Please try again.</p>';
  }
}

// Render bookings to page
function renderBookings(bookings) {
  const bookingList = document.querySelector('.booking-list');
  if (!bookingList) return;

  if (bookings.length === 0) {
    bookingList.innerHTML = 
      '<p style="text-align: center; padding: 2rem; color: var(--text-gray);">No bookings found.</p>';
    return;
  }

  bookingList.innerHTML = bookings.map(booking => createBookingCard(booking)).join('');
  
  // Attach event listeners
  attachBookingEventListeners();
}

// Create booking card HTML
function createBookingCard(booking) {
  const statusClass = booking.status.toLowerCase();
  const statusText = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
  const role = booking.role || 'renter';
  const otherUserName = booking.other_user?.name || 'Unknown';
  
  let actionButtons = '';
  if (role === 'owner') {
    if (booking.status === 'pending') {
      actionButtons = `
        <button class="btn-approve" onclick="approveBooking(${booking.id})">Approve</button>
        <button class="btn-reject" onclick="rejectBooking(${booking.id})">Reject</button>
      `;
    }
  } else {
    if (booking.status === 'approved' && booking.payment_status === 'pending') {
      actionButtons = `<button class="btn-pay" onclick="payBooking(${booking.id})">Pay Now</button>`;
    }
    if (booking.status === 'pending' || booking.status === 'approved') {
      actionButtons += `<button class="btn-cancel" onclick="cancelBooking(${booking.id})">Cancel</button>`;
    }
  }

  return `
    <div class="booking-card" data-status="${booking.status}" data-booking-id="${booking.id}">
      <div class="booking-header">
        <div class="booking-title">${booking.equipment.name}</div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="booking-details">
        <div class="booking-info">
          <div class="booking-id">Booking #${booking.booking_number}</div>
          <div class="booking-dates">${formatDate(booking.dates.start)} - ${formatDate(booking.dates.end)}</div>
          <div class="booking-user">${role === 'owner' ? 'Renter' : 'Owner'}: ${otherUserName}</div>
        </div>
        <div class="booking-price">
          <div class="price-amount">GHC ${booking.pricing.total_amount.toLocaleString()}</div>
          <div class="price-detail">${booking.dates.total_days} days × GHC ${booking.pricing.price_per_day.toLocaleString()}/day</div>
        </div>
      </div>
      ${actionButtons ? `<div class="booking-actions">${actionButtons}</div>` : ''}
    </div>
  `;
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Update statistics
function updateStats(stats) {
  const activeRentals = document.querySelector('[data-stat="active"]');
  const pendingRequests = document.querySelector('[data-stat="pending"]');
  const totalSpent = document.querySelector('[data-stat="total"]');
  
  if (activeRentals) activeRentals.textContent = stats.active_rentals || 0;
  if (pendingRequests) pendingRequests.textContent = stats.pending_requests || 0;
  if (totalSpent) totalSpent.textContent = `GHC ${(stats.total_spent || 0).toLocaleString()}`;
}

// Filter bookings
function filterBookings(status) {
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
}

// Approve booking (owner only)
function approveBooking(bookingId) {
  if (!confirm("Approve this booking request?")) return;
  
  updateBookingStatus(bookingId, 'approved');
}

// Reject booking (owner only)
function rejectBooking(bookingId) {
  if (!confirm("Reject this booking request?")) return;
  
  updateBookingStatus(bookingId, 'rejected');
}

// Cancel booking
function cancelBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking?")) return;
  
  updateBookingStatus(bookingId, 'cancelled');
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
    if (status === 'approved' || status === 'rejected') {
      if (!isOwner || userRole !== 'owner') {
        alert("Only the owner can approve or reject bookings.");
        return;
      }
      if (booking.status !== 'pending') {
        alert("Only pending bookings can be approved or rejected.");
        return;
      }
    } else if (status === 'cancelled') {
      if (!isOwner && !isRenter) {
        alert("You don't have permission to cancel this booking.");
        return;
      }
      if (booking.status === 'completed' || booking.status === 'cancelled') {
        alert("This booking cannot be cancelled.");
        return;
      }
    }

    // Update booking status
    const { error } = await window.supabaseClient
      .from("bookings")
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
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

// Pay booking
async function payBooking(bookingId) {
  try {
    // For now, redirect to PHP payment processor
    // In production, you might want to use Supabase Edge Functions for payment processing
    const formData = new FormData();
    formData.append('action', 'initialize');
    formData.append('booking_id', bookingId);

    const response = await fetch('api/process_payment.php', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    
    if (data.success && data.data.authorization_url) {
      // Redirect to Paystack payment page
      window.location.href = data.data.authorization_url;
    } else {
      alert("Error: " + (data.message || "Failed to initialize payment"));
    }
  } catch (error) {
    console.error("Payment error:", error);
    alert("An error occurred. Please try again.");
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
document.addEventListener("DOMContentLoaded", function() {
  // Update user info (avatar)
  if (window.updateUserInfo) {
    window.updateUserInfo();
  }
  loadBookings('all');
});
