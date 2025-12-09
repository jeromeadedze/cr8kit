/**
 * Bookings Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

// Filter bookings
function filterBookings(status) {
  const bookingCards = document.querySelectorAll(".booking-card");
  const filterButtons = document.querySelectorAll(".filter-btn");

  // Update active filter button
  filterButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-filter") === status) {
      btn.classList.add("active");
    }
  });

  bookingCards.forEach((card) => {
    const cardStatus = card.getAttribute("data-status");
    if (status === "all" || cardStatus === status) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
}

// Load older bookings
function loadOlderBookings() {
    console.log('Loading older bookings...');
    // TODO: Implement pagination
}

// Cancel booking
function cancelBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        // TODO: Implement cancel booking API call
        console.log('Cancel booking:', bookingId);
    }
}

// Return equipment
function returnEquipment(bookingId) {
    if (confirm('Mark this equipment as returned?')) {
        // TODO: Implement return equipment API call
        console.log('Return equipment:', bookingId);
    }
}

