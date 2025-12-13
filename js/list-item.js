/**
 * List Item Page JavaScript
 * Cr8Kit - Ghana Creative Rentals Platform
 */

let uploadedImages = {}; // Store uploaded image data by slot number

document.addEventListener("DOMContentLoaded", function () {
  // Update user info (navbar avatar) - with retry
  if (window.updateUserInfo) {
    window.updateUserInfo();
    setTimeout(() => {
      if (window.updateUserInfo) {
        window.updateUserInfo();
      }
    }, 300);
  }

  // Initialize photo upload handlers
  initPhotoUploads();

  // Initialize form handlers
  initFormHandlers();

  // Initialize preview modal event listeners
  initPreviewModal();

  // Check if editing existing listing
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("edit");
  if (editId) {
    loadExistingListing(editId);
  } else {
    // Load draft if exists (only if not editing)
    loadDraft();
  }
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

// Calendar functions removed - blocked dates feature no longer needed

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
    previewBtn.addEventListener("click", function (e) {
      e.preventDefault();
      previewListing();
    });
    // Also make it accessible globally
    window.previewListing = previewListing;
    console.log("Preview button initialized");
  } else {
    console.error("Preview button not found!");
  }

  // Publish button
  const publishBtn = document.querySelector(".btn-publish");
  if (publishBtn) {
    publishBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      await publishListing();
    });
    // Also make it accessible globally
    window.publishListing = publishListing;
    console.log("Publish button initialized");
  } else {
    console.error("Publish button not found!");
  }

  // Verify Ghana Card button
  const verifyBtn = document.querySelector(".btn-verify-ghana");
  if (verifyBtn) {
    verifyBtn.addEventListener("click", verifyGhanaCard);
  }
}

// Save draft
function saveDraft() {
  try {
    const formData = collectFormData();
    console.log("Saving draft:", formData);

    // Save to localStorage
    const draftKey = "cr8kit_draft_listing";
    const draftData = {
      ...formData,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(draftKey, JSON.stringify(draftData));

    // Show success message
    const saveBtn = document.querySelector(".btn-save-draft");
    const originalText = saveBtn ? saveBtn.textContent : "Save Draft";

    if (saveBtn) {
      saveBtn.textContent = "Saved!";
      saveBtn.style.backgroundColor = "#28a745";
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = "";
      }, 2000);
    } else {
      alert("Draft saved successfully!");
    }
  } catch (error) {
    console.error("Error saving draft:", error);
    alert("Failed to save draft. Please try again.");
  }
}

// Preview listing
function previewListing() {
  try {
    console.log("Preview button clicked");
    const formData = collectFormData();

    // Populate preview modal with form data
    populatePreview(formData);

    // Show preview modal
    const modal = document.getElementById("previewModal");
    if (modal) {
      modal.style.display = "flex";
      document.body.style.overflow = "hidden"; // Prevent background scrolling
      console.log("Preview modal displayed");
    } else {
      console.error("Preview modal not found!");
      alert("Preview modal not found. Please check the page structure.");
    }
  } catch (error) {
    console.error("Error in previewListing:", error);
    alert("Error showing preview: " + (error.message || "Unknown error"));
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

  // Condition field removed

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

// Make closePreview globally accessible
window.closePreview = closePreview;

// Close preview and publish
async function closePreviewAndPublish() {
  closePreview();
  // Small delay to allow modal to close
  setTimeout(async () => {
    await publishListing();
  }, 300);
}

// Make closePreviewAndPublish globally accessible
window.closePreviewAndPublish = closePreviewAndPublish;

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
async function publishListing() {
  // Validate form
  if (!validateForm()) {
    return;
  }

  const formData = collectFormData();

  // Check if editing existing listing
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("edit");
  const isEdit = editId !== null;

  // Disable publish button
  const publishBtn = document.querySelector(".btn-publish");
  if (publishBtn) {
    publishBtn.disabled = true;
    publishBtn.textContent = "Publishing...";
  }

  // Submit to Supabase
  await publishListingToSupabase(formData, isEdit, editId, publishBtn);
}

// Publish listing to Supabase
async function publishListingToSupabase(formData, isEdit, editId, publishBtn) {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      if (publishBtn) {
        publishBtn.disabled = false;
        publishBtn.textContent = "Publish Listing";
      }
      alert("Please sign in to publish listings.");
      return;
    }

    // Map category to API format
    const categoryMap = {
      cameras: "Cameras",
      lenses: "Cameras",
      lighting: "Lighting",
      audio: "Audio",
      drones: "Drones",
      accessories: "Accessories",
    };
    const apiCategory = categoryMap[formData.category.toLowerCase()] || "Other";

    // Extract city from location
    const locationParts = formData.pickupLocation.split(",");
    const city =
      locationParts.length > 1
        ? locationParts[locationParts.length - 2].trim()
        : "Accra";

    // Get primary image URL
    const coverImage =
      formData.images && formData.images.length > 0
        ? formData.images.find((img) => img.isCover) || formData.images[0]
        : null;

    const equipmentData = {
      name: formData.title,
      category: apiCategory,
      description: formData.description || "",
      price_per_day: parseFloat(formData.dailyRate),
      location: formData.pickupLocation,
      city: city,
      image_url: coverImage ? coverImage.url : null,
      is_available: formData.activeListing ? true : false,
      updated_at: new Date().toISOString(),
    };

    let equipmentId;

    if (isEdit) {
      // Verify ownership
      const { data: existing } = await window.supabaseClient
        .from("equipment")
        .select("owner_id")
        .eq("equipment_id", editId)
        .single();

      if (!existing || existing.owner_id !== userId) {
        if (publishBtn) {
          publishBtn.disabled = false;
          publishBtn.textContent = "Publish Listing";
        }
        alert("You don't have permission to edit this listing.");
        return;
      }

      // Update equipment
      const { error: updateError } = await window.supabaseClient
        .from("equipment")
        .update(equipmentData)
        .eq("equipment_id", editId);

      if (updateError) {
        throw updateError;
      }

      equipmentId = parseInt(editId);

      // Delete old images and add new ones
      await window.supabaseClient
        .from("equipment_images")
        .delete()
        .eq("equipment_id", equipmentId);
    } else {
      // Create new equipment
      equipmentData.owner_id = userId;
      delete equipmentData.updated_at; // Let database set created_at

      const { data: newEquipment, error: createError } =
        await window.supabaseClient
          .from("equipment")
          .insert(equipmentData)
          .select()
          .single();

      if (createError) {
        throw createError;
      }

      equipmentId = newEquipment.equipment_id;
    }

    // Add images to equipment_images table
    if (formData.images && formData.images.length > 0) {
      const imageRecords = formData.images.map((img, index) => ({
        equipment_id: equipmentId,
        image_url: img.url,
        is_primary: index === 0 || img.isCover,
      }));

      const { error: imageError } = await window.supabaseClient
        .from("equipment_images")
        .insert(imageRecords);

      if (imageError) {
        console.error("Error saving images:", imageError);
        // Don't fail the whole operation if images fail
      }
    }

    if (publishBtn) {
      publishBtn.disabled = false;
      publishBtn.textContent = "Publish Listing";
    }

    alert("Listing " + (isEdit ? "updated" : "published") + " successfully!");

    // Clear draft after successful publish
    localStorage.removeItem("cr8kit_draft_listing");

    // Redirect to listings page
    window.location.href = "my-listings.html";
  } catch (error) {
    if (publishBtn) {
      publishBtn.disabled = false;
      publishBtn.textContent = "Publish Listing";
    }
    console.error("Publish error:", error);
    alert("Error: " + (error.message || "Failed to publish listing"));
  }
}

// Load existing listing for editing
async function loadExistingListing(equipmentId) {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      alert("Please sign in to edit listings.");
      window.location.href = "my-listings.html";
      return;
    }

    // Fetch equipment details
    const { data: equipment, error } = await window.supabaseClient
      .from("equipment")
      .select("*")
      .eq("equipment_id", equipmentId)
      .single();

    if (error || !equipment) {
      alert("Equipment not found or you don't have permission to edit it.");
      window.location.href = "my-listings.html";
      return;
    }

    // Verify ownership
    if (equipment.owner_id !== userId) {
      alert("You don't have permission to edit this listing.");
      window.location.href = "my-listings.html";
      return;
    }

    // Populate form fields
    document.getElementById("listingTitle").value = equipment.name || "";
    document.getElementById("category").value = equipment.category || "cameras";
    document.getElementById("description").value = equipment.description || "";
    document.getElementById("dailyRate").value = equipment.price_per_day || "";
    document.getElementById("pickupLocation").value = equipment.location || "";
    document.getElementById("activeListing").checked =
      equipment.is_available || false;

    // Fetch and populate images
    const { data: images } = await window.supabaseClient
      .from("equipment_images")
      .select("image_url, is_primary")
      .eq("equipment_id", equipmentId)
      .order("is_primary", { ascending: false });

    if (images && images.length > 0) {
      images.forEach((img, index) => {
        const slotNumber = index + 1;
        if (slotNumber <= 3) {
          uploadedImages[slotNumber] = {
            url: img.image_url,
            publicId: img.image_url, // Use URL as publicId for existing images
            thumbnailUrl: img.image_url,
          };

          const slot = document.getElementById(`photoSlot${slotNumber}`);
          if (slot) {
            slot.classList.add("has-image");
            const coverButton =
              slotNumber === 1
                ? '<button class="photo-cover-btn">COVER</button>'
                : "";
            slot.innerHTML = `
              <img src="${img.image_url}" alt="Uploaded photo" class="uploaded-photo">
              <button class="photo-remove-btn" onclick="removePhoto(${slotNumber})">
                <i class="fas fa-times"></i>
              </button>
              ${coverButton}
            `;
          }
        }
      });
    }

    // Update page title
    document.querySelector(".breadcrumb-current").textContent = "Edit Listing";
    document.querySelector(".list-item-title").textContent =
      "Edit Your Listing";

    // Update publish button text
    const publishBtn = document.querySelector(".btn-publish");
    if (publishBtn) {
      publishBtn.textContent = "Update Listing";
    }
  } catch (error) {
    console.error("Error loading listing:", error);
    alert("Error loading listing. Please try again.");
    window.location.href = "my-listings.html";
  }
}

// Load draft from localStorage
function loadDraft() {
  try {
    const draftKey = "cr8kit_draft_listing";
    const draftData = localStorage.getItem(draftKey);

    if (draftData) {
      const draft = JSON.parse(draftData);

      // Ask user if they want to load the draft
      const shouldLoad = confirm(
        "You have a saved draft. Would you like to load it? (Click Cancel to start fresh)"
      );

      if (shouldLoad) {
        // Restore form fields
        if (draft.title) {
          document.getElementById("listingTitle").value = draft.title;
        }
        if (draft.category) {
          document.getElementById("category").value = draft.category;
        }
        if (draft.brand) {
          document.getElementById("brand").value = draft.brand;
        }
        if (draft.model) {
          document.getElementById("model").value = draft.model;
        }
        if (draft.description) {
          document.getElementById("description").value = draft.description;
        }
        if (draft.dailyRate) {
          document.getElementById("dailyRate").value = draft.dailyRate;
        }
        if (draft.replacementValue) {
          document.getElementById("replacementValue").value =
            draft.replacementValue;
        }
        if (draft.pickupLocation) {
          document.getElementById("pickupLocation").value =
            draft.pickupLocation;
        }
        if (draft.activeListing !== undefined) {
          document.getElementById("activeListing").checked =
            draft.activeListing;
        }

        // Restore images if they exist
        if (draft.images && draft.images.length > 0) {
          draft.images.forEach((img, index) => {
            const slotNumber = index + 1;
            if (slotNumber <= 3) {
              uploadedImages[slotNumber] = {
                url: img.url,
                publicId: img.publicId,
                thumbnailUrl: img.thumbnailUrl || img.url,
              };

              const slot = document.getElementById(`photoSlot${slotNumber}`);
              if (slot) {
                slot.classList.add("has-image");
                const coverButton =
                  slotNumber === 1
                    ? '<button class="photo-cover-btn">COVER</button>'
                    : "";
                slot.innerHTML = `
                  <img src="${uploadedImages[slotNumber].thumbnailUrl}" alt="Uploaded photo" class="uploaded-photo">
                  <button class="photo-remove-btn" onclick="removePhoto(${slotNumber})">
                    <i class="fas fa-times"></i>
                  </button>
                  ${coverButton}
                `;
              }
            }
          });
        }
      } else {
        // Clear draft if user doesn't want to load it
        localStorage.removeItem(draftKey);
      }
    }
  } catch (error) {
    console.error("Error loading draft:", error);
  }
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
    brand: document.getElementById("brand").value,
    model: document.getElementById("model").value,
    description: document.getElementById("description").value,
    dailyRate: document.getElementById("dailyRate").value,
    replacementValue: document.getElementById("replacementValue").value,
    pickupLocation: document.getElementById("pickupLocation").value,
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
