/**
 * List Item Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

let currentMonth = 10; // October
let currentYear = 2023;
let blockedDates = new Set();

document.addEventListener("DOMContentLoaded", function () {
  // Initialize calendar
  renderCalendar();

  // Initialize photo upload handlers
  initPhotoUploads();

  // Initialize form handlers
  initFormHandlers();

  // Initialize preview modal event listeners
  initPreviewModal();
});

// Initialize photo uploads
function initPhotoUploads() {
  // Cloudinary widget is initialized on button click
}

// Cloudinary Configuration
const cloudinaryConfig = {
  cloudName: "dpfsqrccq",
  apiKey: "112636816111282",
  uploadPreset: "cr8kit_equipment", // We'll create this in Cloudinary
  sources: ["local", "camera"],
  multiple: false,
  maxFiles: 1,
  clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
  maxFileSize: 5000000, // 5MB
  cropping: true,
  croppingAspectRatio: 1.5, // 3:2 aspect ratio
  showAdvancedOptions: true,
  folder: "cr8kit/equipment",
  resourceType: "image",
  transformation: [
    {
      quality: "auto:good",
      fetchFormat: "auto",
      width: 1200,
      height: 800,
      crop: "limit",
    },
  ],
};

// Open Cloudinary Upload Widget
function openCloudinaryWidget(slotNumber) {
  const widget = cloudinary.createUploadWidget(
    cloudinaryConfig,
    (error, result) => {
      if (!error && result && result.event === "success") {
        handleCloudinaryUpload(slotNumber, result.info);
      } else if (error) {
        console.error("Upload error:", error);
        alert("Failed to upload image. Please try again.");
      }
    }
  );

  widget.open();
}

// Handle Cloudinary upload result
function handleCloudinaryUpload(slotNumber, info) {
  // Store the Cloudinary URL and public ID
  uploadedImages[slotNumber] = {
    url: info.secure_url,
    publicId: info.public_id,
    thumbnailUrl: getOptimizedImageUrl(info.public_id, 300, 200),
  };

  // Update the slot with the uploaded image
  const slot = document.getElementById(`photoSlot${slotNumber}`);
  slot.classList.add("has-image");

  const coverButton =
    slotNumber === 1 ? '<button class="photo-cover-btn">COVER</button>' : "";

  slot.innerHTML = `
    <img src="${uploadedImages[slotNumber].thumbnailUrl}" alt="Uploaded photo" class="uploaded-photo">
    <button class="photo-remove-btn" onclick="removePhoto(${slotNumber})">
      <i class="fas fa-times"></i>
    </button>
    ${coverButton}
  `;
}

// Get optimized image URL from Cloudinary
function getOptimizedImageUrl(publicId, width, height) {
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

// Get full optimized image URL (for preview and display)
function getFullOptimizedImageUrl(publicId) {
  const transformations = [
    "w_1200",
    "h_800",
    "c_limit",
    "q_auto:good",
    "f_auto",
    "dpr_auto",
  ].join(",");

  return `https://res.cloudinary.com/dpfsqrccq/image/upload/${transformations}/${publicId}`;
}

// Remove photo
function removePhoto(slotNumber) {
  // Remove from uploaded images
  delete uploadedImages[slotNumber];

  const slot = document.getElementById(`photoSlot${slotNumber}`);
  slot.classList.remove("has-image");
  slot.innerHTML = `
    <button class="photo-upload-label" onclick="openCloudinaryWidget(${slotNumber}); return false;">
      <i class="fas fa-cloud-upload-alt photo-upload-icon"></i>
      <span>Add Photo</span>
    </button>
  `;
}

// Render calendar
function renderCalendar() {
  const calendarGrid = document.getElementById("calendarGrid");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Update month display
  document.getElementById("calendarMonth").textContent = `${
    monthNames[currentMonth - 1]
  } ${currentYear}`;

  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  // Day headers
  const dayHeaders = ["S", "M", "T", "W", "T", "F", "S"];
  let html = "";

  // Add day headers
  dayHeaders.forEach((day) => {
    html += `<div class="calendar-day-header-small">${day}</div>`;
  });

  // Add days from previous month (show trailing days)
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += `<div class="calendar-day-small other-month">${day}</div>`;
  }

  // Add days from current month
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() + 1 === currentMonth &&
    today.getFullYear() === currentYear;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${currentYear}-${String(currentMonth).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const isBlocked = blockedDates.has(dateKey);
    const isToday = isCurrentMonth && day === today.getDate();

    let classes = "calendar-day-small";
    if (isBlocked) classes += " blocked";
    if (isToday) classes += " today";

    html += `<div class="${classes}" data-date="${dateKey}" onclick="toggleBlockedDate('${dateKey}')">${day}</div>`;
  }

  // Fill remaining cells with next month's days
  const totalCells = 42; // 7 days * 6 weeks
  const cellsUsed = dayHeaders.length + firstDay + daysInMonth;
  const remainingCells = totalCells - cellsUsed;

  for (let day = 1; day <= remainingCells; day++) {
    html += `<div class="calendar-day-small other-month">${day}</div>`;
  }

  calendarGrid.innerHTML = html;
}

// Change month
function changeMonth(direction) {
  currentMonth += direction;
  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear++;
  } else if (currentMonth < 1) {
    currentMonth = 12;
    currentYear--;
  }
  renderCalendar();
}

// Toggle blocked date
function toggleBlockedDate(dateKey) {
  if (blockedDates.has(dateKey)) {
    blockedDates.delete(dateKey);
  } else {
    blockedDates.add(dateKey);
  }
  renderCalendar();
}

// Initialize form handlers
function initFormHandlers() {
  // Save draft button
  const saveDraftBtn = document.querySelector(".btn-save-draft");
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", saveDraft);
  }

  // Preview button
  const previewBtn = document.querySelector(".btn-preview");
  if (previewBtn) {
    previewBtn.addEventListener("click", previewListing);
  }

  // Publish button
  const publishBtn = document.querySelector(".btn-publish");
  if (publishBtn) {
    publishBtn.addEventListener("click", publishListing);
  }

  // Verify Ghana Card button
  const verifyBtn = document.querySelector(".btn-verify-ghana");
  if (verifyBtn) {
    verifyBtn.addEventListener("click", verifyGhanaCard);
  }
}

// Save draft
function saveDraft() {
  const formData = collectFormData();
  console.log("Saving draft:", formData);

  // In real app, this would save to backend
  alert("Draft saved successfully!");
}

// Preview listing
function previewListing() {
  const formData = collectFormData();

  // Populate preview modal with form data
  populatePreview(formData);

  // Show preview modal
  const modal = document.getElementById("previewModal");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  }
}

// Populate preview modal with form data
function populatePreview(formData) {
  // Title
  const previewTitle = document.getElementById("previewTitle");
  if (previewTitle) {
    previewTitle.textContent = formData.title || "Listing Title";
  }

  // Category and Condition
  const previewCategory = document.getElementById("previewCategory");
  if (previewCategory) {
    const categoryLabels = {
      cameras: "Cameras",
      lenses: "Lenses",
      lighting: "Lighting",
      audio: "Audio",
      drones: "Drones",
      accessories: "Accessories",
    };
    previewCategory.textContent =
      categoryLabels[formData.category] || formData.category || "Category";
  }

  const previewCondition = document.getElementById("previewCondition");
  if (previewCondition) {
    const conditionLabels = {
      "like-new": "Like New",
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
    };
    previewCondition.textContent =
      conditionLabels[formData.condition] || formData.condition || "Condition";
  }

  // Location
  const previewLocation = document.getElementById("previewLocation");
  if (previewLocation) {
    previewLocation.textContent =
      formData.pickupLocation || "Location not specified";
  }

  // Price
  const previewPrice = document.getElementById("previewPrice");
  if (previewPrice) {
    const price = parseFloat(formData.dailyRate) || 0;
    previewPrice.textContent = `¢${price.toFixed(2)}`;
  }

  // Brand & Model
  const previewBrandModel = document.getElementById("previewBrandModel");
  if (previewBrandModel) {
    const brand = formData.brand || "";
    const model = formData.model || "";
    previewBrandModel.textContent =
      brand && model ? `${brand} ${model}` : brand || model || "-";
  }

  // Description
  const previewDescription = document.getElementById("previewDescription");
  if (previewDescription) {
    previewDescription.textContent =
      formData.description || "No description provided.";
  }

  // Replacement Value
  const previewReplacementValue = document.getElementById(
    "previewReplacementValue"
  );
  if (previewReplacementValue) {
    const value = parseFloat(formData.replacementValue) || 0;
    previewReplacementValue.textContent = `¢${value.toFixed(2)}`;
  }

  // Status
  const previewStatus = document.getElementById("previewStatus");
  if (previewStatus) {
    previewStatus.textContent = formData.activeListing ? "Active" : "Inactive";
    previewStatus.className = formData.activeListing
      ? "preview-status-badge active"
      : "preview-status-badge inactive";
  }

  // Images
  populatePreviewImages();
}

// Populate preview images
function populatePreviewImages() {
  const previewMainImage = document.getElementById("previewMainImage");
  const previewThumbnails = document.getElementById("previewThumbnails");

  const imageSlots = Object.keys(uploadedImages).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  if (imageSlots.length === 0) {
    if (previewMainImage) {
      previewMainImage.src =
        "https://via.placeholder.com/800x600?text=No+Image";
    }
    if (previewThumbnails) {
      previewThumbnails.innerHTML = "";
    }
    return;
  }

  // Get first image as main (use full optimized URL)
  const firstSlot = imageSlots[0];
  const firstImageData = uploadedImages[firstSlot];
  if (firstImageData && previewMainImage) {
    previewMainImage.src = getFullOptimizedImageUrl(firstImageData.publicId);
  }

  // Create thumbnails
  if (previewThumbnails) {
    previewThumbnails.innerHTML = "";
    imageSlots.forEach((slotNumber, index) => {
      const imageData = uploadedImages[slotNumber];
      if (imageData) {
        const thumbnail = document.createElement("div");
        thumbnail.className = "preview-thumbnail";
        if (index === 0) thumbnail.classList.add("active");

        thumbnail.onclick = () => {
          if (previewMainImage) {
            previewMainImage.src = getFullOptimizedImageUrl(imageData.publicId);
          }
          // Update active thumbnail
          document
            .querySelectorAll(".preview-thumbnail")
            .forEach((t) => t.classList.remove("active"));
          thumbnail.classList.add("active");
        };

        const thumbnailImg = document.createElement("img");
        thumbnailImg.src = imageData.thumbnailUrl;
        thumbnailImg.alt = "Thumbnail";
        thumbnail.appendChild(thumbnailImg);
        previewThumbnails.appendChild(thumbnail);
      }
    });
  }
}

// Close preview modal
function closePreview() {
  const modal = document.getElementById("previewModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = ""; // Restore scrolling
  }
}

// Close preview and publish
function closePreviewAndPublish() {
  closePreview();
  // Small delay to allow modal to close
  setTimeout(() => {
    publishListing();
  }, 300);
}

// Initialize preview modal event listeners
function initPreviewModal() {
  // Close modal when clicking outside
  const modal = document.getElementById("previewModal");
  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closePreview();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      const modal = document.getElementById("previewModal");
      if (modal && modal.style.display === "flex") {
        closePreview();
      }
    }
  });
}

// Publish listing
function publishListing() {
  // Validate form
  if (!validateForm()) {
    return;
  }

  const formData = collectFormData();
  console.log("Publishing listing:", formData);

  // In real app, this would submit to backend
  alert("Listing published successfully!");

  // Redirect to listings page
  // window.location.href = "my-listings.html";
}

// Verify Ghana Card
function verifyGhanaCard() {
  // In real app, this would open verification modal or redirect
  alert("Ghana Card verification process will open here.");
}

// Collect form data
function collectFormData() {
  // Collect image URLs and public IDs
  const images = [];
  Object.keys(uploadedImages)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((slotNumber) => {
      const imageData = uploadedImages[slotNumber];
      if (imageData) {
        images.push({
          url: imageData.url,
          publicId: imageData.publicId,
          thumbnailUrl: imageData.thumbnailUrl,
          isCover: parseInt(slotNumber) === 1,
        });
      }
    });

  return {
    title: document.getElementById("listingTitle").value,
    category: document.getElementById("category").value,
    condition: document.getElementById("condition").value,
    brand: document.getElementById("brand").value,
    model: document.getElementById("model").value,
    description: document.getElementById("description").value,
    dailyRate: document.getElementById("dailyRate").value,
    replacementValue: document.getElementById("replacementValue").value,
    pickupLocation: document.getElementById("pickupLocation").value,
    blockedDates: Array.from(blockedDates),
    activeListing: document.getElementById("activeListing").checked,
    images: images,
  };
}

// Validate form
function validateForm() {
  const title = document.getElementById("listingTitle").value.trim();
  const brand = document.getElementById("brand").value.trim();
  const dailyRate = document.getElementById("dailyRate").value;
  const replacementValue = document.getElementById("replacementValue").value;

  if (!title) {
    alert("Please enter a listing title");
    document.getElementById("listingTitle").focus();
    return false;
  }

  if (!brand) {
    alert("Please enter a brand/manufacturer");
    document.getElementById("brand").focus();
    return false;
  }

  if (!dailyRate || parseFloat(dailyRate) <= 0) {
    alert("Please enter a valid daily rate");
    document.getElementById("dailyRate").focus();
    return false;
  }

  if (!replacementValue || parseFloat(replacementValue) <= 0) {
    alert("Please enter a valid replacement value");
    document.getElementById("replacementValue").focus();
    return false;
  }

  // Check if at least one photo is uploaded
  if (Object.keys(uploadedImages).length === 0) {
    alert("Please upload at least one photo");
    return false;
  }

  return true;
}
