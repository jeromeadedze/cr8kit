/**
 * My Listings Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

let allListings = [];

document.addEventListener("DOMContentLoaded", function () {
  // Update user info (avatar)
  if (window.updateUserInfo) {
    window.updateUserInfo();
  }
  // Load listings from API
  loadListings();
  
  // Initialize listings page
  initListingsPage();
});

// Load listings from Supabase
async function loadListings() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      console.error("User not authenticated");
      document.querySelector('.booking-list').innerHTML = 
        '<p style="text-align: center; padding: 2rem; color: var(--text-gray);">Please sign in to view your listings.</p>';
      return;
    }

    // Get owner's equipment
    const { data: listings, error } = await window.supabaseClient
      .from("equipment")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    allListings = listings || [];
    renderListings(allListings);
    updateSummaryCards();

  } catch (error) {
    console.error("Error loading listings:", error);
    document.querySelector('.booking-list').innerHTML = 
      '<p style="text-align: center; padding: 2rem; color: var(--error-red);">Error loading listings. Please try again.</p>';
  }
}

// Render listings to page
function renderListings(listings) {
  const listingsContainer = document.querySelector('.booking-list');
  if (!listingsContainer) return;

  if (listings.length === 0) {
    listingsContainer.innerHTML = 
      '<p style="text-align: center; padding: 2rem; color: var(--text-gray);">No listings found. <a href="list-item.html" style="color: var(--primary-orange);">Create your first listing</a></p>';
    return;
  }

  listingsContainer.innerHTML = listings.map(listing => createListingCard(listing)).join('');
  
  // Attach event listeners
  attachListingEventListeners();
}

// Create listing card HTML
function createListingCard(listing) {
  const statusClass = listing.is_available ? 'available' : 'inactive';
  const statusText = listing.is_available ? 'Available' : 'Inactive';
  
  return `
    <div class="booking-card" data-status="${statusClass}" data-equipment-id="${listing.id}">
      <div class="booking-header">
        <div class="booking-title">${listing.name}</div>
        <div class="booking-status">
          <span class="status-dot ${statusClass}"></span>
          <span>${statusText}</span>
        </div>
      </div>
      <div class="booking-details">
        <div class="booking-info">
          <div class="booking-id">${listing.category}</div>
          <div class="booking-dates">${listing.location}, ${listing.city}</div>
          <div class="booking-user">Rating: ${listing.rating || 0} ⭐ | ${listing.total_rentals || 0} rentals</div>
        </div>
        <div class="booking-price">
          <div class="price-amount">GHC ${listing.price_per_day.toLocaleString()}/day</div>
          <div class="price-status ${statusClass}">${statusText}</div>
        </div>
      </div>
      <div class="booking-actions">
        <label class="toggle-switch">
          <input type="checkbox" ${listing.is_available ? 'checked' : ''} 
                 onchange="toggleListing(this, event)" 
                 data-equipment-id="${listing.id}">
          <span class="toggle-slider"></span>
        </label>
        <button class="btn-edit" onclick="editListing(${listing.id})">Edit</button>
        <button class="btn-delete" onclick="deleteListing(${listing.id})">Delete</button>
      </div>
    </div>
  `;
}

// Update summary cards
function updateSummaryCards() {
  const totalListings = allListings.length;
  const activeListings = allListings.filter(l => l.is_available).length;
  const totalRentals = allListings.reduce((sum, l) => sum + (l.total_rentals || 0), 0);
  
  // Update summary cards if they exist
  const totalCard = document.querySelector('[data-summary="total"]');
  const activeCard = document.querySelector('[data-summary="active"]');
  const rentalsCard = document.querySelector('[data-summary="rentals"]');
  
  if (totalCard) totalCard.textContent = totalListings;
  if (activeCard) activeCard.textContent = activeListings;
  if (rentalsCard) rentalsCard.textContent = totalRentals;
}

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
async function toggleListing(checkbox, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const equipmentId = checkbox.getAttribute('data-equipment-id');
  const isAvailable = checkbox.checked;

  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      checkbox.checked = !isAvailable;
      alert("Please sign in to update listings.");
      return;
    }

    // Verify ownership
    const { data: equipment } = await window.supabaseClient
      .from("equipment")
      .select("owner_id")
      .eq("equipment_id", equipmentId)
      .single();

    if (!equipment || equipment.owner_id !== userId) {
      checkbox.checked = !isAvailable;
      alert("You don't have permission to update this listing.");
      return;
    }

    // Update availability
    const { error } = await window.supabaseClient
      .from("equipment")
      .update({ 
        is_available: isAvailable,
        updated_at: new Date().toISOString()
      })
      .eq("equipment_id", equipmentId);

    if (error) {
      throw error;
    }

    // Update UI
    const card = checkbox.closest(".booking-card");
    const statusText = card.querySelector(".booking-status span:last-child");
    const statusDot = card.querySelector(".status-dot");
    const priceStatus = card.querySelector(".price-status");

    if (isAvailable) {
      if (statusText) statusText.textContent = "Available";
      if (statusDot) statusDot.className = "status-dot available";
      if (priceStatus) {
        priceStatus.textContent = "Active";
        priceStatus.className = "price-status paid";
      }
      card.setAttribute("data-status", "available");
    } else {
      if (statusText) statusText.textContent = "Inactive";
      if (statusDot) statusDot.className = "status-dot inactive";
      if (priceStatus) {
        priceStatus.textContent = "Inactive";
        priceStatus.className = "price-status pending";
      }
      card.setAttribute("data-status", "inactive");
    }
    
    // Update listing in array
    const listing = allListings.find(l => l.equipment_id === parseInt(equipmentId));
    if (listing) {
      listing.is_available = isAvailable;
    }
    
    updateSummaryCards();

  } catch (error) {
    console.error("Error updating listing:", error);
    checkbox.checked = !isAvailable;
    alert("An error occurred. Please try again.");
  }
}

// Edit listing
function editListing(equipmentId) {
  // Redirect to edit page or open edit modal
  window.location.href = `list-item.html?edit=${equipmentId}`;
}

// Delete listing
async function deleteListing(equipmentId) {
  if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
    return;
  }

  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      alert("Please sign in to delete listings.");
      return;
    }

    // Verify ownership
    const { data: equipment } = await window.supabaseClient
      .from("equipment")
      .select("owner_id")
      .eq("equipment_id", equipmentId)
      .single();

    if (!equipment || equipment.owner_id !== userId) {
      alert("You don't have permission to delete this listing.");
      return;
    }

    // Delete equipment (cascade will delete related records)
    const { error } = await window.supabaseClient
      .from("equipment")
      .delete()
      .eq("equipment_id", equipmentId);

    if (error) {
      throw error;
    }

    alert("Listing deleted successfully");
    loadListings(); // Reload listings

  } catch (error) {
    console.error("Error deleting listing:", error);
    alert("An error occurred. Please try again.");
  }
}

// Attach event listeners
function attachListingEventListeners() {
  // Event listeners are attached via onclick in HTML
}
