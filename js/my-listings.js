/**
 * My Listings Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

document.addEventListener("DOMContentLoaded", function () {
  // Initialize listings page
  initListingsPage();
});

// Initialize listings page
function initListingsPage() {
  // Initialize filters
  initFilters();
}

// Initialize filter buttons
function initFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Remove active class from all buttons
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      // Add active class to clicked button
      this.classList.add("active");

      const filter = this.getAttribute("data-filter");
      applyFilter(filter);
    });
  });
}

// Apply filter
function applyFilter(filter) {
  const listingCards = document.querySelectorAll(".booking-card");
  const filterButtons = document.querySelectorAll(".filter-btn");

  // Update active filter button
  filterButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-filter") === filter) {
      btn.classList.add("active");
    }
  });

  listingCards.forEach((card) => {
    const status = card.getAttribute("data-status");

    if (filter === "all") {
      card.style.display = "flex";
    } else if (filter === "active") {
      card.style.display = status === "available" ? "flex" : "none";
    } else if (filter === "booked") {
      card.style.display = status === "rented" ? "flex" : "none";
    } else if (filter === "drafts") {
      card.style.display = status === "draft" ? "flex" : "none";
    } else {
      card.style.display = "flex";
    }
  });
}

// Toggle listing active status
function toggleListing(checkbox, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const card = checkbox.closest(".booking-card");
  const statusText = card.querySelector(".booking-status span:last-child");
  const statusDot = card.querySelector(".status-dot");
  const priceStatus = card.querySelector(".price-status");

  if (checkbox.checked) {
    // Activate listing
    if (statusText) {
      statusText.textContent = "Available";
    }
    if (statusDot) {
      statusDot.className = "status-dot active";
    }
    if (priceStatus) {
      priceStatus.textContent = "Active";
      priceStatus.className = "price-status paid";
    }
    card.setAttribute("data-status", "available");

    // In real app, this would update the backend
    console.log("Listing activated");
  } else {
    // Deactivate listing
    if (statusText) {
      statusText.textContent = "Inactive";
    }
    if (statusDot) {
      statusDot.className = "status-dot completed";
    }
    if (priceStatus) {
      priceStatus.textContent = "Inactive";
      priceStatus.className = "price-status pending";
    }
    card.setAttribute("data-status", "inactive");

    // In real app, this would update the backend
    console.log("Listing deactivated");
  }
}
