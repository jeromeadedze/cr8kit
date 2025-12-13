/**
 * My Listings Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

let allListings = [];
let pendingRequests = [];
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", async function () {
  // Update user info (avatar) - call immediately and with retry
  if (window.updateUserInfo) {
    window.updateUserInfo();
    // Retry after a short delay to ensure it runs
    setTimeout(() => {
      if (window.updateUserInfo) {
        window.updateUserInfo();
      }
    }, 500);
  }

  // Initialize summary cards with 0 values first (immediate feedback)
  updateSummaryCardsUI(0, 0, 0);

  // Load listings and pending requests in parallel
  await Promise.all([loadListings(), loadPendingRequests()]);

  // Initialize listings page
  initListingsPage();
});

// Load listings from Supabase
async function loadListings() {
  const container =
    document.querySelector(".booking-list") ||
    document.querySelector("#listingsGrid");
  const loadingSkeleton = document.getElementById("loadingSkeleton");

  try {
    // Check if Supabase client is available
    if (!window.supabaseClient) {
      console.error("Supabase client not initialized");
      if (container) {
        container.innerHTML =
          '<p style="text-align: center; padding: 2rem; color: var(--error-red);">Database connection error. Please refresh the page.</p>';
      }
      updateSummaryCardsUI(0, 0, 0);
      return;
    }

    // Show loading skeleton
    if (container && loadingSkeleton) {
      container.innerHTML = "";
      container.appendChild(loadingSkeleton);
      loadingSkeleton.style.display = "flex";
    } else if (container) {
      container.innerHTML =
        '<p style="text-align: center; padding: 2rem; color: var(--text-gray);"><i class="fas fa-spinner fa-spin"></i> Loading listings...</p>';
    }

    const userId = await window.getCurrentUserId();
    if (!userId) {
      console.error("User not authenticated");
      if (container) {
        container.innerHTML =
          '<p style="text-align: center; padding: 2rem; color: var(--text-gray);">Please sign in to view your listings. <a href="index.html" style="color: var(--primary-orange); text-decoration: underline;">Sign in here</a></p>';
      }
      // Set stats to 0 when not authenticated
      updateSummaryCardsUI(0, 0, 0);
      return;
    }

    console.log("Loading listings for user:", userId);

    // Parallelize all queries for better performance
    const [userResult, listingsResult, bookingsResult] = await Promise.all([
      // Get user data
      window.supabaseClient
        .from("users")
        .select("user_id, role, full_name, email")
        .eq("user_id", userId)
        .single(),
      // Get owner's equipment
      window.supabaseClient
        .from("equipment")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false }),
      // Get all bookings for stats and rental status (fetch all needed data at once)
      window.supabaseClient
        .from("bookings")
        .select("equipment_id, total_amount, payment_status, status")
        .eq("owner_id", userId),
    ]);

    const { data: userData, error: userError } = userResult;
    const { data: listings, error } = listingsResult;
    const { data: allBookings, error: bookingsError } = bookingsResult;

    if (userError) {
      console.error("Error fetching user data:", userError);
    } else {
      console.log("User data:", userData);
      if (userData?.role !== "owner") {
        console.warn("User is not an owner, but showing listings page anyway");
      }
    }

    if (error) {
      console.error("Error fetching equipment:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);

      // Check if it's a permissions error
      if (
        error.code === "PGRST116" ||
        error.message?.includes("permission") ||
        error.message?.includes("policy")
      ) {
        if (container) {
          container.innerHTML =
            '<p style="text-align: center; padding: 2rem; color: var(--error-red);">Permission denied. Please check your database Row Level Security (RLS) policies.</p>';
        }
      }

      throw error;
    }

    console.log("Query successful. Found listings:", listings?.length || 0);

    // Check if listings is null or undefined
    if (!listings) {
      console.warn(
        "Listings is null or undefined - this might indicate a permissions issue"
      );
      if (container) {
        container.innerHTML =
          '<p style="text-align: center; padding: 2rem; color: var(--error-red);">Unable to load listings. Please check your database permissions.</p>';
      }
      return;
    }

    if (bookingsError) {
      console.warn("Error fetching bookings (non-critical):", bookingsError);
    }

    // Process bookings data
    const bookings = allBookings || [];

    // Get active bookings for rental status
    const activeBookings = bookings.filter((b) =>
      ["approved", "active", "pending"].includes(b.status)
    );
    const rentedEquipmentIds = new Set(
      activeBookings.map((b) => b.equipment_id)
    );

    // Mark equipment as rented if it has active bookings
    allListings = (listings || []).map((listing) => ({
      ...listing,
      is_rented: rentedEquipmentIds.has(listing.equipment_id),
    }));

    console.log("Processed listings:", allListings.length);

    // Hide loading skeleton
    if (loadingSkeleton) {
      loadingSkeleton.style.display = "none";
    }

    // Render listings
    renderListings(allListings);

    // Calculate and update summary cards from already-fetched data (no additional queries)
    const totalListings = listings.length;
    const currentlyRented = rentedEquipmentIds.size;
    const totalEarnings = bookings
      .filter((b) => b.payment_status === "paid")
      .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

    updateSummaryCardsUI(totalListings, currentlyRented, totalEarnings);
  } catch (error) {
    console.error("Error loading listings:", error);

    // Hide loading skeleton on error
    if (loadingSkeleton) {
      loadingSkeleton.style.display = "none";
    }

    if (container) {
      container.innerHTML =
        '<p style="text-align: center; padding: 2rem; color: var(--error-red);">Error loading listings: ' +
        (error.message || "Unknown error") +
        ". Please try again.</p>";
    }
    // Set stats to 0 on error
    updateSummaryCardsUI(0, 0, 0);
  }
}

// Render listings to page
function renderListings(listings) {
  console.log("renderListings called with:", listings?.length || 0, "listings");

  const listingsContainer =
    document.querySelector(".booking-list") ||
    document.querySelector("#listingsGrid");

  if (!listingsContainer) {
    console.error(
      "Listings container not found! Tried both .booking-list and #listingsGrid"
    );
    console.error("Available containers:", {
      bookingList: document.querySelector(".booking-list"),
      listingsGrid: document.querySelector("#listingsGrid"),
    });
    return;
  }

  console.log("Container found:", listingsContainer);

  if (!listings || listings.length === 0) {
    console.log("No listings to render - showing empty state");
    listingsContainer.innerHTML =
      '<p style="text-align: center; padding: 2rem; color: var(--text-gray);">No listings found. <a href="list-item.html" style="color: var(--primary-orange); text-decoration: underline;">Create your first listing</a></p>';
    return;
  }

  try {
    listingsContainer.innerHTML = listings
      .map((listing) => {
        try {
          return createListingCard(listing);
        } catch (cardError) {
          console.error("Error creating listing card:", cardError, listing);
          return ""; // Skip this listing if there's an error
        }
      })
      .filter((card) => card !== "") // Remove any empty cards
      .join("");

    console.log("Listings rendered successfully");

    // Attach event listeners
    attachListingEventListeners();
  } catch (error) {
    console.error("Error rendering listings:", error);
    listingsContainer.innerHTML =
      '<p style="text-align: center; padding: 2rem; color: var(--error-red);">Error rendering listings. Please refresh the page.</p>';
  }
}

// Create listing card HTML
function createListingCard(listing) {
  // Defensive checks for required fields
  if (!listing) {
    console.error("Listing is null or undefined");
    return "";
  }

  if (!listing.equipment_id) {
    console.error("Invalid listing data - missing equipment_id:", listing);
    return "";
  }

  console.log("Creating card for listing:", listing.equipment_id, listing.name);

  const isAvailable =
    listing.is_available !== undefined ? listing.is_available : true;
  const isRented = listing.is_rented || false;

  // Determine status based on availability and rental status
  let statusClass, statusText, cardStatus, priceStatusClass, priceStatusText;

  if (isRented && isAvailable) {
    // Equipment is available but currently rented
    statusClass = "pending";
    statusText = "Rented";
    cardStatus = "rented";
    priceStatusClass = "pending";
    priceStatusText = "Rented";
  } else if (isAvailable) {
    statusClass = "active";
    statusText = "Available";
    cardStatus = "available";
    priceStatusClass = "paid";
    priceStatusText = "Active";
  } else {
    statusClass = "completed";
    statusText = "Inactive";
    cardStatus = "inactive";
    priceStatusClass = "pending";
    priceStatusText = "Inactive";
  }

  // Format date
  let listedDate = "Unknown";
  if (listing.created_at) {
    try {
      const date = new Date(listing.created_at);
      if (!isNaN(date.getTime())) {
        listedDate = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch (e) {
      console.warn("Error formatting date:", e);
    }
  }

  // Image - Fallback to placeholder if null
  const imageUrl =
    listing.image_url || "https://via.placeholder.com/120?text=No+Image";

  // Safe field access with defaults
  const listingName = listing.name || "Unnamed Equipment";
  const listingDescription = listing.description || "No description provided.";
  const listingCategory = listing.category || "Uncategorized";
  const pricePerDay = parseFloat(listing.price_per_day || 0);

  return `
    <div class="booking-card" data-status="${cardStatus}" data-equipment-id="${
    listing.equipment_id
  }">
      <img
        src="${imageUrl}"
        alt="${listingName}"
        class="booking-image"
        onerror="this.onerror=null; this.src='https://via.placeholder.com/200x150?text=No+Image'"
      />
      <div class="booking-content">
        <div class="booking-info">
          <div class="booking-status">
            <span class="status-dot ${statusClass}"></span>
            <span>${statusText}</span>
          </div>
          <div class="booking-id">ID: #EQ-${listing.equipment_id}</div>
          <h3 class="booking-title">${listingName}</h3>
          <p class="booking-description">
            ${listingDescription}
          </p>
          <div class="booking-meta">
            <span><i class="fas fa-tag"></i> ${listingCategory}</span>
            <span><i class="fas fa-calendar"></i> Listed: ${listedDate}</span>
          </div>
        </div>
        <div class="booking-actions">
          <div class="booking-price">
            <div class="price-amount">
              GH₵ ${pricePerDay.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
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
                ${isAvailable ? "checked" : ""}
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
            <button class="icon-btn" style="font-size: 16px" onclick="deleteListing(${
              listing.equipment_id
            })">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Update summary cards (kept for backward compatibility, but now uses data from loadListings)
async function updateSummaryCards() {
  // This function is now mainly for backward compatibility
  // Stats are calculated directly in loadListings() to avoid redundant queries
  const userId = await window.getCurrentUserId();
  if (!userId) {
    updateSummaryCardsUI(0, 0, 0);
    return;
  }

  // Only fetch if we don't have data already (fallback)
  try {
    const [listingsResult, bookingsResult] = await Promise.all([
      window.supabaseClient
        .from("equipment")
        .select("equipment_id")
        .eq("owner_id", userId),
      window.supabaseClient
        .from("bookings")
        .select("equipment_id, total_amount, payment_status, status")
        .eq("owner_id", userId),
    ]);

    const { data: listings } = listingsResult;
    const { data: bookings } = bookingsResult;

    const totalListings = (listings || []).length;
    const activeBookings = (bookings || []).filter(
      (b) => b.status === "approved" || b.status === "active"
    );
    const rentedEquipmentIds = new Set(
      activeBookings.map((b) => b.equipment_id)
    );
    const currentlyRented = rentedEquipmentIds.size;
    const totalEarnings = (bookings || [])
      .filter((b) => b.payment_status === "paid")
      .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

    updateSummaryCardsUI(totalListings, currentlyRented, totalEarnings);
  } catch (error) {
    console.error("Error fetching stats:", error);
    updateSummaryCardsUI(0, 0, 0);
  }
}

// Helper function to update summary cards UI
function updateSummaryCardsUI(totalListings, currentlyRented, totalEarnings) {
  console.log("Updating summary cards UI with:", {
    totalListings,
    currentlyRented,
    totalEarnings,
  });

  const totalCard = document.querySelector('[data-summary="total"]');
  const rentedCard = document.querySelector('[data-summary="rented"]');
  const earningsCard = document.querySelector('[data-summary="earnings"]');

  console.log("Found cards:", {
    total: !!totalCard,
    rented: !!rentedCard,
    earnings: !!earningsCard,
  });

  if (totalCard) {
    totalCard.textContent = totalListings || 0;
    console.log("✓ Updated total listings:", totalListings);
  } else {
    console.warn("✗ Total listings card not found - retrying...");
    // Retry after a short delay in case DOM isn't ready
    setTimeout(() => {
      const retryCard = document.querySelector('[data-summary="total"]');
      if (retryCard) {
        retryCard.textContent = totalListings || 0;
        console.log("✓ Retry: Updated total listings:", totalListings);
      } else {
        console.error("✗ Retry failed: Total listings card still not found");
      }
    }, 100);
  }

  if (rentedCard) {
    rentedCard.textContent = currentlyRented || 0;
    console.log("✓ Updated currently rented:", currentlyRented);
  } else {
    console.warn("✗ Currently rented card not found - retrying...");
    setTimeout(() => {
      const retryCard = document.querySelector('[data-summary="rented"]');
      if (retryCard) {
        retryCard.textContent = currentlyRented || 0;
        console.log("✓ Retry: Updated currently rented:", currentlyRented);
      } else {
        console.error("✗ Retry failed: Currently rented card still not found");
      }
    }, 100);
  }

  if (earningsCard) {
    const formatted = (totalEarnings || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    earningsCard.textContent = `GH₵ ${formatted}`;
    console.log("✓ Updated total earnings:", formatted);
  } else {
    console.warn("✗ Total earnings card not found - retrying...");
    setTimeout(() => {
      const retryCard = document.querySelector('[data-summary="earnings"]');
      if (retryCard) {
        const formatted = (totalEarnings || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        retryCard.textContent = `GH₵ ${formatted}`;
        console.log("✓ Retry: Updated total earnings:", formatted);
      } else {
        console.error("✗ Retry failed: Total earnings card still not found");
      }
    }, 100);
  }
}

// Initialize listings page
function initListingsPage() {
  // Initialize filters
  initFilters();

  // Check URL parameters for tab and booking
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get("tab");
  const bookingId = urlParams.get("booking");

  // If tab=requests is in URL, automatically switch to requests tab
  if (tab === "requests") {
    // Wait a bit for requests to load, then switch to requests tab
    setTimeout(() => {
      const requestsBtn = document.querySelector('[data-filter="requests"]');
      if (requestsBtn) {
        requestsBtn.click();

        // If a specific booking ID is provided, scroll to it after a short delay
        if (bookingId) {
          setTimeout(() => {
            const bookingCard = document.querySelector(
              `[data-booking-id="${bookingId}"]`
            );
            if (bookingCard) {
              bookingCard.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              // Highlight the card briefly
              bookingCard.style.transition = "box-shadow 0.3s ease";
              bookingCard.style.boxShadow = "0 0 0 3px rgba(254, 116, 44, 0.5)";
              setTimeout(() => {
                bookingCard.style.boxShadow = "";
              }, 2000);
            }
          }, 500);
        }
      }
    }, 300);
  }

  // Clean up URL parameters after processing (optional - keeps URL clean)
  if (tab || bookingId) {
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);
  }
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

// Load pending booking requests
async function loadPendingRequests() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) return;

    const { data: requests, error } = await window.supabaseClient
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
        )
      `
      )
      .eq("owner_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading requests:", error);
      return;
    }

    pendingRequests = requests || [];
    updateRequestsBadge(pendingRequests.length);
  } catch (error) {
    console.error("Error loading pending requests:", error);
  }
}

// Update requests badge
function updateRequestsBadge(count) {
  const badge = document.getElementById("requestsBadge");
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }
}

// Apply filter (exposed globally)
window.applyFilter = function (filter) {
  currentFilter = filter;
  const listingCards = document.querySelectorAll(".booking-card");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const listingsContainer = document.querySelector(".booking-list");

  // Update active filter button
  filterButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-filter") === filter) {
      btn.classList.add("active");
    }
  });

  if (filter === "requests") {
    // Show requests instead of listings
    renderRequests();
  } else {
    // Re-render listings to show them again (in case we were on requests)
    renderListings(allListings);

    // Apply filter to listings
    const updatedCards = document.querySelectorAll(".booking-card");
    updatedCards.forEach((card) => {
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
};

// Approve request with pickup details
async function approveRequest(bookingId) {
  try {
    const request = pendingRequests.find((r) => r.booking_id === bookingId);
    if (!request) {
      alert("Request not found.");
      return;
    }

    // Create modal for pickup details
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
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
    `;

    modal.innerHTML = `
      <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <h2 style="margin-bottom: 1.5rem; color: var(--text-dark);">Approve Booking Request</h2>
        <form id="approveRequestForm">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-dark);">
              Pickup Location <span style="color: var(--error-red);">*</span>
            </label>
            <input
              type="text"
              id="pickupLocation"
              required
              placeholder="Enter pickup address"
              style="width: 100%; padding: 10px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px;"
            />
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-dark);">
              Pickup Time <span style="color: var(--error-red);">*</span>
            </label>
            <input
              type="text"
              id="pickupTime"
              required
              placeholder="e.g., 10:00 AM or 2:00 PM"
              style="width: 100%; padding: 10px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px;"
            />
          </div>
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button
              type="button"
              onclick="closeApproveModal()"
              style="flex: 1; padding: 12px; background: var(--border-color); color: var(--text-dark); border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"
            >
              Cancel
            </button>
            <button
              type="submit"
              style="flex: 1; padding: 12px; background: var(--primary-orange); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"
            >
              Approve & Send
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    const form = modal.querySelector("#approveRequestForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const pickupLocation = document
        .getElementById("pickupLocation")
        .value.trim();
      const pickupTime = document.getElementById("pickupTime").value.trim();

      if (!pickupLocation || !pickupTime) {
        alert("Please fill in all required fields.");
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing...";

      try {
        const userId = await window.getCurrentUserId();

        // Update booking status
        const { error: updateError } = await window.supabaseClient
          .from("bookings")
          .update({
            status: "approved",
            pickup_location: pickupLocation,
            pickup_time: pickupTime,
            updated_at: new Date().toISOString(),
          })
          .eq("booking_id", bookingId);

        if (updateError) throw updateError;

        // Fetch updated booking with all details for email
        const { data: updatedBooking, error: fetchError } =
          await window.supabaseClient
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
            )
          `
            )
            .eq("booking_id", bookingId)
            .single();

        if (fetchError) throw fetchError;

        // Send email notification with receipt details
        await sendBookingApprovalEmail(
          updatedBooking,
          pickupLocation,
          pickupTime
        );

        alert(
          "Booking approved! Pickup details have been sent to the renter's email."
        );

        // Remove modal
        document.body.removeChild(modal);

        // Reload requests
        await loadPendingRequests();

        // If we're on requests view, refresh it; otherwise just update badge
        if (currentFilter === "requests") {
          renderRequests();
        }
      } catch (error) {
        console.error("Error approving request:", error);
        console.error("Error details:", error);
        alert(
          "An error occurred. Please try again. Error: " +
            (error.message || "Unknown error")
        );
        submitBtn.disabled = false;
        submitBtn.textContent = "Approve & Send";
      }
    });

    // Close modal on overlay click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeApproveModal();
      }
    });
  } catch (error) {
    console.error("Error in approveRequest:", error);
    alert("An error occurred. Please try again.");
  }
}

// Close approve modal
function closeApproveModal() {
  const modal = document.querySelector(".modal-overlay");
  if (modal) {
    document.body.removeChild(modal);
  }
}

// Reject request
async function rejectRequest(bookingId) {
  const reason = prompt(
    "Please provide a reason for rejecting this booking (optional):"
  );
  if (reason === null) return; // User cancelled

  if (!confirm("Are you sure you want to reject this booking request?")) {
    return;
  }

  try {
    const userId = await window.getCurrentUserId();

    const { error } = await window.supabaseClient
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);

    if (error) throw error;

    alert("Booking request rejected.");

    // Reload requests
    await loadPendingRequests();

    // If we're on requests view, refresh it; otherwise just update badge
    if (currentFilter === "requests") {
      renderRequests();
    }
  } catch (error) {
    console.error("Error rejecting request:", error);
    alert("An error occurred. Please try again.");
  }
}

// Send booking approval email with receipt
async function sendBookingApprovalEmail(booking, pickupLocation, pickupTime) {
  try {
    const renter = booking.renter || {};
    const equipment = booking.equipment || {};

    if (!renter.email) {
      console.warn("No email address for renter, skipping email");
      return;
    }

    // Format dates
    const startDate = new Date(booking.start_date).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const endDate = new Date(booking.end_date).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const pickupDate = new Date(booking.start_date).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

    // Calculate breakdown
    const basePrice =
      parseFloat(booking.price_per_day || 0) *
      parseFloat(booking.total_days || 0);
    const serviceFee = basePrice * 0.1; // 10% service fee
    const insurance = basePrice * 0.05; // 5% insurance
    const totalAmount = parseFloat(booking.total_amount || 0);

    // Create email HTML with receipt
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fe742c; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #fe742c; }
          .receipt-header { border-bottom: 2px solid #fe742c; padding-bottom: 10px; margin-bottom: 15px; }
          .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .receipt-row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; color: #fe742c; }
          .pickup-details { background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fe742c; }
          .button { display: inline-block; background: #fe742c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Booking Approved!</h1>
          </div>
          <div class="content">
            <p>Hi ${renter.full_name || renter.email},</p>
            
            <p>Great news! Your booking request has been <strong>approved</strong>.</p>
            
            <div class="receipt">
              <div class="receipt-header">
                <h2 style="margin: 0; color: #fe742c;">Booking Receipt</h2>
                <p style="margin: 5px 0; color: #666;">Booking #${
                  booking.booking_number || "N/A"
                }</p>
              </div>
              
              <div class="receipt-row">
                <span><strong>Equipment:</strong></span>
                <span>${equipment.name || "Equipment"}</span>
              </div>
              
              <div class="receipt-row">
                <span><strong>Rental Period:</strong></span>
                <span>${startDate} to ${endDate}</span>
              </div>
              
              <div class="receipt-row">
                <span><strong>Duration:</strong></span>
                <span>${booking.total_days || 0} ${
      booking.total_days === 1 ? "day" : "days"
    }</span>
              </div>
              
              <div class="receipt-row">
                <span><strong>Price per Day:</strong></span>
                <span>GHS ${parseFloat(booking.price_per_day || 0).toFixed(
                  2
                )}</span>
              </div>
              
              <div class="receipt-row">
                <span><strong>Subtotal:</strong></span>
                <span>GHS ${basePrice.toFixed(2)}</span>
              </div>
              
              <div class="receipt-row">
                <span><strong>Service Fee (10%):</strong></span>
                <span>GHS ${serviceFee.toFixed(2)}</span>
              </div>
              
              <div class="receipt-row">
                <span><strong>Insurance (5%):</strong></span>
                <span>GHS ${insurance.toFixed(2)}</span>
              </div>
              
              <div class="receipt-row">
                <span><strong>Total Amount:</strong></span>
                <span>GHS ${totalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="pickup-details">
              <h3 style="margin-top: 0; color: #fe742c;">📍 Pickup Details</h3>
              <p><strong>Date:</strong> ${pickupDate}</p>
              <p><strong>Time:</strong> ${pickupTime}</p>
              <p><strong>Location:</strong> ${pickupLocation}</p>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Make payment to confirm your booking</li>
              <li>Arrive at the pickup location on time</li>
              <li>Bring a valid ID for verification</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${
                window.location.origin
              }/bookings.html" class="button">View Booking Details</a>
            </div>
            
            <p>If you have any questions, please contact the equipment owner or our support team.</p>
            
            <div class="footer">
              <p>Thank you for using Cr8Kit!</p>
              <p>This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create notification in database
    if (renter.user_id) {
      try {
        await window.supabaseClient.from("notifications").insert({
          user_id: renter.user_id,
          type: "booking_approved",
          title: "Booking Approved",
          message: `Your booking for ${
            equipment.name || "equipment"
          } has been approved. Pickup: ${pickupLocation} at ${pickupTime}`,
          related_booking_id: booking.booking_id,
        });

        // Update notification badge
        if (window.updateGlobalNotificationBadge) {
          window.updateGlobalNotificationBadge();
        }
      } catch (notifError) {
        console.warn("Could not create notification:", notifError);
        // Continue even if notification fails
      }
    }

    // Try to send email via Supabase Edge Function (if configured)
    try {
      const { data, error } = await window.supabaseClient.functions.invoke(
        "send-email",
        {
          body: {
            to: renter.email,
            subject: `Booking Approved - ${equipment.name || "Equipment"} - ${
              booking.booking_number || ""
            }`,
            html: emailHtml,
            type: "booking_approved",
          },
        }
      );

      if (error) {
        console.warn(
          "Edge function email failed, logging email details:",
          error
        );
        // Fall through to console log
      } else {
        console.log("Email sent successfully via Edge Function");
        return; // Success, exit early
      }
    } catch (edgeError) {
      console.warn("Edge function not available or failed:", edgeError);
      // Fall through to console log for manual sending
    }

    // Fallback: Log email details for manual sending or external service
    console.log("=".repeat(60));
    console.log("BOOKING APPROVAL EMAIL (Send via your email service)");
    console.log("=".repeat(60));
    console.log("To:", renter.email);
    console.log(
      "Subject:",
      `Booking Approved - ${equipment.name || "Equipment"} - ${
        booking.booking_number || ""
      }`
    );
    console.log("HTML Content:", emailHtml);
    console.log("=".repeat(60));

    // You can copy the HTML above and send via:
    // - Resend API
    // - SendGrid API
    // - Mailgun API
    // - Or any other email service
  } catch (error) {
    console.error("Error sending approval email:", error);
    // Don't fail the approval if email fails
  }
}

// Expose functions globally
window.toggleListing = toggleListing;
window.deleteListing = deleteListing;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.closeApproveModal = closeApproveModal;

// Toggle listing active status
async function toggleListing(checkbox, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const equipmentId = checkbox.getAttribute("data-equipment-id");
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
        updated_at: new Date().toISOString(),
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
    const listing = allListings.find(
      (l) => l.equipment_id === parseInt(equipmentId)
    );
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
  if (
    !confirm(
      "Are you sure you want to delete this listing? This action cannot be undone."
    )
  ) {
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

// Render booking requests
function renderRequests() {
  const listingsContainer = document.querySelector(".booking-list");
  if (!listingsContainer) return;

  if (pendingRequests.length === 0) {
    listingsContainer.innerHTML =
      '<p style="text-align: center; padding: 2rem; color: var(--text-gray);">No pending booking requests.</p>';
    return;
  }

  listingsContainer.innerHTML = pendingRequests
    .map((request) => createRequestCard(request))
    .join("");

  // Attach event listeners for approve/reject buttons
  attachRequestEventListeners();
}

// Create request card HTML
function createRequestCard(request) {
  const equipment = request.equipment || {};
  const renter = request.renter || {};
  const imageUrl =
    equipment.image_url || "https://via.placeholder.com/200x150?text=No+Image";

  const startDate = new Date(request.start_date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const endDate = new Date(request.end_date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `
    <div class="booking-card" data-booking-id="${request.booking_id}">
      <img
        src="${imageUrl}"
        alt="${equipment.name || "Equipment"}"
        class="booking-image"
      />
      <div class="booking-content">
        <div class="booking-info">
          <div class="booking-status">
            <span class="status-dot pending"></span>
            <span>Pending Request</span>
          </div>
          <div class="booking-id">Booking #${request.booking_number}</div>
          <h3 class="booking-title">${
            equipment.name || "Unknown Equipment"
          }</h3>
          <p class="booking-description">
            Request from: <strong>${
              renter.full_name || renter.email || "Unknown"
            }</strong>
          </p>
          <div class="booking-meta">
            <span><i class="fas fa-calendar"></i> ${startDate} - ${endDate}</span>
            <span><i class="fas fa-clock"></i> ${request.total_days} ${
    request.total_days === 1 ? "day" : "days"
  }</span>
          </div>
        </div>
        <div class="booking-actions">
          <div class="booking-price">
            <div class="price-amount">
              GH₵ ${parseFloat(request.total_amount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div class="price-status pending">Awaiting Approval</div>
          </div>
          <div style="display: flex; gap: var(--spacing-xs);">
            <button 
              class="btn-list-item" 
              style="padding: 8px 16px; font-size: 12px"
              onclick="approveRequest(${request.booking_id})"
            >
              Approve
            </button>
            <button 
              class="btn-cancel" 
              onclick="rejectRequest(${request.booking_id})"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Attach event listeners
function attachListingEventListeners() {
  // Event listeners are attached via onclick in HTML
}

// Attach request event listeners
function attachRequestEventListeners() {
  // Event listeners are attached via onclick in HTML
}
