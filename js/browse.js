/**
 * Browse Equipment JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

let currentPage = 1;
let isLoading = false;

// Helper function to get optimized Cloudinary image URL
function getOptimizedImageUrl(publicId, width = 280, height = 200) {
  if (!publicId) return "https://via.placeholder.com/280x200?text=No+Image";

  const transformations = [
    `w_${width}`,
    `h_${height}`,
    "c_fill",
    "q_auto:good",
    "f_auto",
    "dpr_auto",
  ].join(",");

  return `https://res.cloudinary.com/dpfsqrccq/image/upload/${transformations}/${publicId}`;
}

// Sample equipment data (replace with API call)
// Note: In production, these would have Cloudinary public_ids
const sampleEquipment = [
  {
    id: 1,
    name: "Sony A7S III Body",
    category: "Cameras",
    image: getOptimizedImageUrl("cr8kit/equipment/sony-a7s-iii", 280, 200),
    rating: 4.9,
    location: "Osu, Accra",
    owner: "Kojo Studios",
    price: 450,
    verified: true,
    isNew: false,
  },
  {
    id: 2,
    name: "Aputure 300d II Set",
    category: "Lighting",
    image: getOptimizedImageUrl("cr8kit/equipment/aputure-300d", 280, 200),
    rating: 5.0,
    location: "East Legon",
    owner: "Lens Queen",
    price: 300,
    verified: false,
    isNew: true,
  },
  {
    id: 3,
    name: "DJI Mavic 3 Cine",
    category: "Drones",
    image: getOptimizedImageUrl("cr8kit/equipment/dji-mavic-3", 280, 200),
    rating: 4.8,
    location: "Kumasi Central",
    owner: "Sky High",
    price: 850,
    verified: false,
    isNew: false,
  },
  {
    id: 4,
    name: "Rode NTG3 Shotgun",
    category: "Audio",
    image: getOptimizedImageUrl("cr8kit/equipment/rode-ntg3", 280, 200),
    rating: 4.7,
    location: "Tema",
    owner: "Audio Pro",
    price: 150,
    verified: false,
    isNew: true,
  },
  {
    id: 5,
    name: "Canon RF 24-70mm",
    category: "Cameras",
    image: getOptimizedImageUrl("cr8kit/equipment/canon-rf-24-70", 280, 200),
    rating: 5.0,
    location: "Cantonments",
    owner: "Kojo Studios",
    price: 220,
    verified: true,
    isNew: false,
  },
  {
    id: 6,
    name: "DJI Ronin RS3 Pro",
    category: "Accessories",
    image: getOptimizedImageUrl("cr8kit/equipment/dji-ronin-rs3", 280, 200),
    rating: 4.7,
    location: "Spintex",
    owner: "Motion Gh",
    price: 350,
    verified: false,
    isNew: false,
  },
];

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  // Update user info (welcome message, avatar)
  if (window.updateUserInfo) {
    window.updateUserInfo();
  }
  loadEquipment();
  setupSearch();
});

// Load equipment
async function loadEquipment() {
  if (isLoading) return;

  isLoading = true;
  const grid = document.getElementById("equipmentGrid");

  // Load user's favorites
  const userFavorites = await loadUserFavorites();

  // Get filter values
  const checkedCategories = Array.from(
    document.querySelectorAll(".category-checkbox:checked")
  ).map((cb) => cb.value);

  // Separate favorites from regular categories
  const favoritesFilter = checkedCategories.includes("favorites");
  const regularCategories = checkedCategories.filter(
    (cat) => cat !== "favorites"
  );

  const minPrice = document.getElementById("minPriceSlider")?.value || 50;
  const maxPrice = document.getElementById("maxPriceSlider")?.value || 1200;
  const city = document.getElementById("locationFilter")?.value || "";
  const search = document.getElementById("searchInput")?.value || "";

  // Build Supabase query with owner information
  let query = window.supabaseClient
    .from("equipment")
    .select(
      `
      equipment_id, 
      name, 
      category, 
      description, 
      price_per_day, 
      location, 
      city, 
      rating, 
      total_rentals, 
      is_available, 
      owner_id, 
      image_url,
      owner:owner_id (
        user_id,
        full_name,
        email
      )
      `
    )
    .order("created_at", { ascending: false })
    .range((currentPage - 1) * 12, currentPage * 12 - 1);

  // Apply filters
  // Only show available equipment
  query = query.eq("is_available", true);

  // Apply category filter (excluding favorites, which is handled separately)
  if (regularCategories.length > 0) {
    query = query.in("category", regularCategories);
  }

  if (city) query = query.ilike("city", `%${city}%`);
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (minPrice) query = query.gte("price_per_day", minPrice);
  if (maxPrice) query = query.lte("price_per_day", maxPrice);

  query
    .then(({ data, error }) => {
      if (error) throw error;

      if (currentPage === 1) {
        grid.innerHTML = "";
      }

      if (data && data.length > 0) {
        // Filter by favorites if favorites filter is active
        let filteredData = data;
        if (favoritesFilter) {
          filteredData = data.filter((item) =>
            userFavorites.has(item.equipment_id)
          );
        }

        if (filteredData.length > 0) {
          filteredData.forEach((item) => {
            const normalized = {
              id: item.equipment_id,
              name: item.name,
              category: item.category,
              description: item.description,
              price_per_day: item.price_per_day,
              location: item.location,
              city: item.city,
              rating: item.rating,
              total_rentals: item.total_rentals,
              is_available: item.is_available,
              image_url: item.image_url,
              owner: item.owner
                ? {
                    id: item.owner.user_id,
                    name: item.owner.full_name || item.owner.email || "Unknown",
                    email: item.owner.email,
                  }
                : { id: item.owner_id, name: "Unknown" },
              is_favorite: userFavorites.has(item.equipment_id),
            };
            const card = createEquipmentCard(normalized);
            grid.appendChild(card);
          });
        } else if (favoritesFilter && currentPage === 1) {
          grid.innerHTML =
            '<p style="text-align: center; padding: var(--spacing-lg); color: var(--text-gray); grid-column: 1/-1;">No favorite equipment found. Start favoriting items to see them here!</p>';
        }
      } else {
        if (currentPage === 1) {
          grid.innerHTML =
            '<p style="text-align: center; padding: var(--spacing-lg); color: var(--text-gray); grid-column: 1/-1;">No equipment found matching your filters.</p>';
        }
      }
      isLoading = false;
    })
    .catch((error) => {
      console.error("Error loading equipment:", error);
      // Fallback to sample data ONLY if we are on page 1 and really failed significantly (e.g. offline)
      // Otherwise showing sample data mixed with real data is confusing.
      // For now, let's just show the error in console or toast.
      if (currentPage === 1 && grid.innerHTML === "") {
        // Maybe show empty state instead of sample data?
        // But sticking to original behavior of falling back to sample data for demo purposes might be desired.
        // Let's keep sample data loading if it was purely empty.
        if (sampleEquipment.length > 0) {
          sampleEquipment.forEach((item) => {
            const card = createEquipmentCard(item);
            grid.appendChild(card);
          });
        }
      }
      isLoading = false;
    });
}

// Create equipment card element
function createEquipmentCard(item) {
  const card = document.createElement("div");
  card.className = "equipment-card";
  card.onclick = () =>
    (window.location.href = `equipment-details.html?id=${item.id}`);

  // Use optimized image URL with lazy loading
  // Handle both API response format and sample data format
  const imageUrl = item.image_url || item.image || "";
  const optimizedImage = imageUrl
    ? imageUrl.startsWith("http")
      ? imageUrl
      : getOptimizedImageUrl(imageUrl, 280, 200)
    : getOptimizedImageUrl("", 280, 200);

  // Format location (API returns city, sample data has location)
  const location = item.location || `${item.city || "Accra"}`;
  // Get owner name - handle both object format (from API) and string/number format (from sample data)
  const ownerName =
    typeof item.owner === "object" && item.owner !== null
      ? item.owner.name || item.owner.full_name || "Unknown"
      : item.owner || "Unknown";
  const price = item.price_per_day || item.price || 0;
  const rating = item.rating || 0;

  card.innerHTML = `
        <div style="position: relative;">
            <img 
                src="${optimizedImage}" 
                alt="${item.name}" 
                class="card-image" 
                loading="lazy"
                onerror="this.src='https://via.placeholder.com/280x200?text=No+Image'"
            />
            <button class="card-favorite ${
              item.is_favorite ? "active" : ""
            }" onclick="event.stopPropagation(); toggleFavorite(${item.id})">
                <i class="${item.is_favorite ? "fas" : "far"} fa-heart"></i>
            </button>
        </div>
        <div class="card-content">
            <h3 class="card-title">${item.name}</h3>
            <div class="card-rating">
                <i class="fas fa-star star-icon"></i>
                <span>${rating.toFixed(1)}</span>
            </div>
            <div class="card-location">
                <i class="fas fa-map-marker-alt"></i>
                <span>${location}</span>
            </div>
            <div class="card-owner">Listed by ${ownerName}</div>
            <div class="card-price">GHS ${price.toFixed(2)}/day</div>
        </div>
    `;

  return card;
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        applyFilters();
      }, 500);
    });
  }
}

// Update price range display
function updatePriceRange() {
  const minSlider = document.getElementById("minPriceSlider");
  const maxSlider = document.getElementById("maxPriceSlider");
  const minPrice = document.getElementById("minPrice");
  const maxPrice = document.getElementById("maxPrice");

  if (minSlider && maxSlider && minPrice && maxPrice) {
    minPrice.textContent = minSlider.value;
    maxPrice.textContent = maxSlider.value;
  }
}

// Apply filters
function applyFilters() {
  const grid = document.getElementById("equipmentGrid");
  grid.innerHTML = "";
  currentPage = 1;
  loadEquipment();
  updateActiveFilters();
}

// Update active filters display
function updateActiveFilters() {
  const activeFilters = document.getElementById("activeFilters");
  const checkedCategories = Array.from(
    document.querySelectorAll(".category-checkbox:checked")
  ).map((cb) => cb.value);

  activeFilters.innerHTML = "";

  checkedCategories.forEach((category) => {
    const tag = document.createElement("span");
    tag.className = "filter-tag";
    tag.innerHTML = `
            Category: ${category}
            <span class="filter-tag-close" onclick="removeFilter('category', '${category}')">×</span>
        `;
    activeFilters.appendChild(tag);
  });

  if (checkedCategories.length > 0) {
    const clearBtn = document.createElement("button");
    clearBtn.className = "btn-clear";
    clearBtn.textContent = "Clear All";
    clearBtn.onclick = clearFilters;
    activeFilters.appendChild(clearBtn);
  }
}

// Remove filter
function removeFilter(type, value) {
  if (type === "category") {
    const checkbox = document.querySelector(
      `.category-checkbox[value="${value}"]`
    );
    if (checkbox) {
      checkbox.checked = false;
      applyFilters();
    }
  }
}

// Clear all filters
function clearFilters() {
  document
    .querySelectorAll(".category-checkbox")
    .forEach((cb) => (cb.checked = false));
  document.getElementById("minPriceSlider").value = 50;
  document.getElementById("maxPriceSlider").value = 1200;
  document.getElementById("locationFilter").value = "";
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("sortSelect").value = "recommended";
  updatePriceRange();
  applyFilters();
}

// Load more equipment
function loadMoreEquipment() {
  if (!isLoading) {
    currentPage++;
    loadEquipment();
  }
}

// Toggle favorite
async function toggleFavorite(id) {
  const btn = event.currentTarget;
  const icon = btn.querySelector("i");
  const isCurrentlyFavorite = icon.classList.contains("fas");

  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      if (window.showToast) {
        window.showToast("Please sign in to save favorites", "error");
      } else {
        alert("Please sign in to save favorites");
      }
      return;
    }

    if (isCurrentlyFavorite) {
      // Remove from favorites
      const { error } = await window.supabaseClient
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("equipment_id", id);

      if (error) throw error;

      icon.classList.remove("fas");
      icon.classList.add("far");
      btn.classList.remove("active");

      if (window.showToast) {
        window.showToast("Removed from favorites", "success");
      }
    } else {
      // Add to favorites
      const { error } = await window.supabaseClient.from("favorites").insert({
        user_id: userId,
        equipment_id: id,
      });

      if (error) {
        // If it's a unique constraint error, it's already favorited (shouldn't happen, but handle gracefully)
        if (error.code === "23505") {
          // Already exists, just update UI
          icon.classList.remove("far");
          icon.classList.add("fas");
          btn.classList.add("active");
          return;
        }
        throw error;
      }

      icon.classList.remove("far");
      icon.classList.add("fas");
      btn.classList.add("active");

      if (window.showToast) {
        window.showToast("Added to favorites", "success");
      }
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    if (window.showToast) {
      window.showToast("Failed to update favorite. Please try again.", "error");
    } else {
      alert("Failed to update favorite. Please try again.");
    }
  }
}

// Load user's favorites
async function loadUserFavorites() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) return new Set();

    const { data: favorites, error } = await window.supabaseClient
      .from("favorites")
      .select("equipment_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading favorites:", error);
      return new Set();
    }

    return new Set((favorites || []).map((f) => f.equipment_id));
  } catch (error) {
    console.error("Error loading favorites:", error);
    return new Set();
  }
}
