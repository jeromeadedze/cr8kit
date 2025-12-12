/**
 * My Listings Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

let allListings = [];

document.addEventListener("DOMContentLoaded", async function () {
  // Update user info (avatar)
  if (window.updateUserInfo) {
    window.updateUserInfo();
  }
  
  // Initialize summary cards with 0 values first (immediate feedback)
  updateSummaryCardsUI(0, 0, 0);
  
  // Load listings from API (this will also update summary cards with real data)
  await loadListings();
  
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

    // Get active bookings for owner's equipment to determine rental status
    const { data: activeBookings } = await window.supabaseClient
      .from("bookings")
      .select("equipment_id")
      .eq("owner_id", userId)
      .in("status", ["approved", "active", "pending"]);

    const rentedEquipmentIds = new Set((activeBookings || []).map(b => b.equipment_id));

    // Mark equipment as rented if it has active bookings
    allListings = (listings || []).map(listing => ({
      ...listing,
      is_rented: rentedEquipmentIds.has(listing.equipment_id)
    }));

    renderListings(allListings);
    
    // Update summary cards with fresh data
    await updateSummaryCards();

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
  const isAvailable = listing.is_available;
  const isRented = listing.is_rented || false;
  
  // Determine status based on availability and rental status
  let statusClass, statusText, cardStatus, priceStatusClass, priceStatusText;
  
  if (isRented && isAvailable) {
    // Equipment is available but currently rented
    statusClass = 'pending';
    statusText = 'Rented';
    cardStatus = 'rented';
    priceStatusClass = 'pending';
    priceStatusText = 'Rented';
  } else if (isAvailable) {
    statusClass = 'active';
    statusText = 'Available';
    cardStatus = 'available';
    priceStatusClass = 'paid';
    priceStatusText = 'Active';
  } else {
    statusClass = 'completed';
    statusText = 'Inactive';
    cardStatus = 'inactive';
    priceStatusClass = 'pending';
    priceStatusText = 'Inactive';
  }

  // Format date
  let listedDate = 'Unknown';
  if (listing.created_at) {
    const date = new Date(listing.created_at);
    listedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Image - Fallback to placeholder if null
  const imageUrl = listing.image_url || 'https://via.placeholder.com/120?text=No+Image';

  return `
    <div class="booking-card" data-status="${cardStatus}" data-equipment-id="${listing.equipment_id}">
      <img
        src="${imageUrl}"
        alt="${listing.name}"
        class="booking-image"
      />
      <div class="booking-content">
        <div class="booking-info">
          <div class="booking-status">
            <span class="status-dot ${statusClass}"></span>
            <span>${statusText}</span>
          </div>
          <div class="booking-id">ID: #EQ-${listing.equipment_id}</div>
          <h3 class="booking-title">${listing.name}</h3>
          <p class="booking-description">
            ${listing.description || 'No description provided.'}
          </p>
          <div class="booking-meta">
            <span><i class="fas fa-tag"></i> ${listing.category}</span>
            <span><i class="fas fa-calendar"></i> Listed: ${listedDate}</span>
          </div>
        </div>
        <div class="booking-actions">
          <div class="booking-price">
            <div class="price-amount">
              GH₵ ${listing.price_per_day.toLocaleString()}
              <span style="font-size: 14px; font-weight: 400; color: var(--text-gray);">/ day</span>
            </div>
            <div class="price-status ${priceStatusClass}">${priceStatusText}</div>
          </div>
          <div style="display: flex; gap: var(--spacing-xs); align-items: center;">
            <label
              class="listing-toggle-switch"
              onclick="event.stopPropagation();"
              style="margin: 0"
            >
              <input
                type="checkbox"
                ${isAvailable ? 'checked' : ''}
                onchange="toggleListing(this, event)"
                data-equipment-id="${listing.equipment_id}"
              />
              <span class="toggle-slider"></span>
            </label>
            <a
              href="list-item.html?edit=${listing.equipment_id}"
              class="icon-btn"
              style="font-size: 16px; text-decoration: none"
            >
              <i class="fas fa-edit"></i>
            </a>
            <button class="icon-btn" style="font-size: 16px" onclick="deleteListing(${listing.equipment_id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Update summary cards
async function updateSummaryCards() {
  const userId = await window.getCurrentUserId();
  if (!userId) {
    console.error("User not authenticated");
    // Set to 0 if not authenticated
    updateSummaryCardsUI(0, 0, 0);
    return;
  }

  // Initialize with 0 values
  let totalListings = 0;
  let currentlyRented = 0;
  let totalEarnings = 0;
  
  try {
    // Get all listings for owner
    const { data: allOwnerListings, error: listingsError } = await window.supabaseClient
      .from("equipment")
      .select("equipment_id, is_available")
      .eq("owner_id", userId);

    if (listingsError) {
      console.error("Error fetching listings:", listingsError);
    } else if (allOwnerListings) {
      totalListings = allOwnerListings.length || 0;
    }

    // Get ALL bookings for owner's equipment (for stats)
    const { data: allBookings, error: bookingsError } = await window.supabaseClient
      .from("bookings")
      .select("equipment_id, total_amount, payment_status, status")
      .eq("owner_id", userId);
    
    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
    } else if (allBookings) {
      // Count unique equipment items that are currently rented (active or approved bookings)
      const activeBookings = allBookings.filter(b => 
        b.status === "approved" || b.status === "active"
      );
      const rentedEquipmentIds = new Set(activeBookings.map(b => b.equipment_id));
      currentlyRented = rentedEquipmentIds.size || 0;
      
      // Calculate total earnings from ALL paid bookings (not just active ones)
      totalEarnings = allBookings
        .filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
    }
  } catch (error) {
    console.error("Error fetching stats:", error);
    // On error, values remain 0
  }
  
  // Update UI with calculated values
  updateSummaryCardsUI(totalListings, currentlyRented, totalEarnings);
}

// Helper function to update summary cards UI
function updateSummaryCardsUI(totalListings, currentlyRented, totalEarnings) {
  const totalCard = document.querySelector('[data-summary="total"]');
  const rentedCard = document.querySelector('[data-summary="rented"]');
  const earningsCard = document.querySelector('[data-summary="earnings"]');
  
  if (totalCard) {
    totalCard.textContent = totalListings;
    console.log("Updated total listings:", totalListings);
  } else {
    console.warn("Total listings card not found");
  }
  
  if (rentedCard) {
    rentedCard.textContent = currentlyRented;
    console.log("Updated currently rented:", currentlyRented);
  } else {
    console.warn("Currently rented card not found");
  }
  
  if (earningsCard) {
    earningsCard.textContent = `GH₵ ${totalEarnings.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
    console.log("Updated total earnings:", totalEarnings);
  } else {
    console.warn("Total earnings card not found");
  }
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

// Apply filter (exposed globally)
window.applyFilter = function(filter) {
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
};

// Expose functions globally
window.toggleListing = toggleListing;
window.deleteListing = deleteListing;

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
      if (statusDot) statusDot.className = "status-dot active";
      if (priceStatus) {
        priceStatus.textContent = "Active";
        priceStatus.className = "price-status paid";
      }
      card.setAttribute("data-status", "available");
    } else {
      if (statusText) statusText.textContent = "Inactive";
      if (statusDot) statusDot.className = "status-dot completed";
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
    
    await updateSummaryCards();

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
