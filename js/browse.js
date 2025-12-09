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
    "dpr_auto"
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
  loadEquipment();
  setupSearch();
});

// Load equipment
function loadEquipment() {
  if (isLoading) return;

  isLoading = true;
  const grid = document.getElementById("equipmentGrid");

  // Get filter values
  const checkedCategories = Array.from(
    document.querySelectorAll(".category-checkbox:checked")
  ).map((cb) => cb.value);
  const category = checkedCategories.length > 0 ? checkedCategories[0] : null;
  const minPrice = document.getElementById("minPriceSlider")?.value || 50;
  const maxPrice = document.getElementById("maxPriceSlider")?.value || 1200;
  const location = document.getElementById("locationFilter")?.value || "";
  const search = document.getElementById("searchInput")?.value || "";
  const sort = document.getElementById("sortSelect")?.value || "recommended";

  // Build query string
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  params.append("minPrice", minPrice);
  params.append("maxPrice", maxPrice);
  if (location) params.append("location", location);
  if (search) params.append("search", search);
  params.append("sort", sort);
  params.append("page", currentPage);
  params.append("limit", 12);

  // Fetch from API
  fetch(`api/equipment.php?${params.toString()}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success && data.data.equipment) {
        if (currentPage === 1) {
          grid.innerHTML = "";
        }

        data.data.equipment.forEach((item) => {
          const card = createEquipmentCard(item);
          grid.appendChild(card);
        });

        // Update count
        const countEl = document.getElementById("equipmentCount");
        if (countEl) {
          countEl.textContent = data.data.pagination.total;
        }
      } else {
        if (currentPage === 1) {
          grid.innerHTML =
            '<p style="text-align: center; padding: var(--spacing-lg); color: var(--text-gray);">No equipment found.</p>';
        }
      }
      isLoading = false;
    })
    .catch((error) => {
      console.error("Error loading equipment:", error);
      // Fallback to sample data
      if (currentPage === 1) {
        sampleEquipment.forEach((item) => {
          const card = createEquipmentCard(item);
          grid.appendChild(card);
        });
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
  const optimizedImage = item.image || getOptimizedImageUrl(item.publicId || "", 280, 200);
  
  card.innerHTML = `
        <div style="position: relative;">
            <img 
                src="${optimizedImage}" 
                alt="${item.name}" 
                class="card-image" 
                loading="lazy"
                onerror="this.src='https://via.placeholder.com/280x200?text=No+Image'"
            />
            <button class="card-favorite" onclick="event.stopPropagation(); toggleFavorite(${item.id})">
                <i class="far fa-heart"></i>
            </button>
        </div>
        <div class="card-content">
            <h3 class="card-title">${item.name}</h3>
            <div class="card-rating">
                <i class="fas fa-star star-icon"></i>
                <span>${item.rating}</span>
            </div>
            <div class="card-location">
                <i class="fas fa-map-marker-alt"></i>
                <span>${item.location}</span>
            </div>
            <div class="card-owner">Listed by ${item.owner}</div>
            <div class="card-price">GHS ${item.price}/day</div>
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
function toggleFavorite(id) {
  const btn = event.currentTarget;
  const icon = btn.querySelector("i");

  if (icon.classList.contains("far")) {
    icon.classList.remove("far");
    icon.classList.add("fas");
    btn.classList.add("active");
  } else {
    icon.classList.remove("fas");
    icon.classList.add("far");
    btn.classList.remove("active");
  }

  // TODO: Save to backend
  console.log("Toggle favorite:", id);
}
