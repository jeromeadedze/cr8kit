/**
 * Profile Page JavaScript
 * 
 */

// Make sign out function available globally immediately
window.handleSignOut = async function (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const confirmed = await showConfirm("Are you sure you want to sign out?", {
    title: "Sign Out",
    type: "question",
    confirmText: "Sign Out",
    cancelText: "Cancel"
  });
  
  if (!confirmed) {
    return;
  }

  try {
    // Check if supabaseClient is available
    if (!window.supabaseClient) {
      throw new Error(
        "Supabase client is not available. Please refresh the page."
      );
    }

    // Disable button to prevent double-clicks
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) {
      signOutBtn.disabled = true;
      signOutBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Signing out...';
    }

    // Sign out from Supabase Auth
    const { error } = await window.supabaseClient.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      throw error;
    }

    // Clear all localStorage data
    localStorage.removeItem("cr8kit_profile");
    localStorage.clear();

    // Clear session storage
    sessionStorage.clear();

    // Redirect to login page immediately
    window.location.replace("index.html");
  } catch (error) {
    console.error("Error signing out:", error);

    // Re-enable button on error
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) {
      signOutBtn.disabled = false;
      signOutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
    }

    showAlert("Error signing out: " + (error.message || "Please try again."), { type: "error", title: "Error" });
  }
};

window.signOut = window.handleSignOut;

document.addEventListener("DOMContentLoaded", function () {
  // Update user info (navbar avatar)
  if (window.updateUserInfo) {
    window.updateUserInfo();
  }
  // Load user profile data
  loadUserProfile();
  // Initialize profile page
  initProfilePage();
  // Initialize sign out button
  initSignOutButton();
  // Load user's equipment
  loadMyEquipment();
});


// Load user profile data from Supabase
async function loadUserProfile() {
  try {
    // Get profile from localStorage first (faster)
    let profile = null;
    const storedProfile = localStorage.getItem("cr8kit_profile");
    if (storedProfile) {
      try {
        profile = JSON.parse(storedProfile);
        // Check if profile has required fields
        if (!profile.full_name && !profile.email) {
          profile = null; // Invalid profile, fetch fresh
        }
      } catch (e) {
        console.error("Error parsing stored profile:", e);
        profile = null;
      }
    }

    // If not in localStorage, fetch from Supabase
    if (!profile) {
      const {
        data: { user },
        error: authError,
      } = await window.supabaseClient.auth.getUser();

      if (authError || !user) {
        console.log("User not authenticated");
        // Redirect to login if not authenticated
        window.location.href = "index.html";
        return;
      }

      const { data: fetchedProfile, error: profileError } =
        await window.supabaseClient
          .from("users")
          .select("*")
          .eq("email", user.email)
          .single();

      if (profileError || !fetchedProfile) {
        console.error("Error loading profile:", profileError);
        // Try to create profile if it doesn't exist
        if (profileError && profileError.code === "PGRST116") {
          // Profile doesn't exist, create it
          const newProfile = await window.getOrCreateUserProfile(
            user.email,
            user.user_metadata?.full_name || "",
            user.user_metadata?.phone_number || ""
          );
          if (newProfile) {
            profile = newProfile;
            localStorage.setItem("cr8kit_profile", JSON.stringify(profile));
          } else {
            return;
          }
        } else {
          return;
        }
      } else {
        profile = fetchedProfile;
        localStorage.setItem("cr8kit_profile", JSON.stringify(profile));
      }
    }

    // Ensure we have a valid profile before updating UI
    if (profile && (profile.full_name || profile.email)) {
      console.log("Profile loaded successfully:", profile);
      // Update profile sidebar
      updateProfileSidebar(profile);

      // Update form fields
      updateProfileForm(profile);
    } else {
      console.error("Invalid profile data:", profile);
      // Show error message to user
      const profileName = document.querySelector(".profile-name");
      if (profileName) {
        profileName.textContent = "Error loading profile";
      }
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
    // Show error message to user
    const profileName = document.querySelector(".profile-name");
    if (profileName) {
      profileName.textContent = "Error loading profile";
    }
  }
}

// Update profile sidebar (avatar, name, rating)
async function updateProfileSidebar(profile) {
  if (!profile) {
    console.error("No profile data provided to updateProfileSidebar");
    return;
  }

  const fullName = profile.full_name || profile.email || "User";

  console.log("Updating profile sidebar with:", fullName);

  // Update large avatar
  const largeAvatar = document.querySelector(".profile-avatar-large");
  if (largeAvatar) {
    largeAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fullName
    )}&background=fe742c&color=fff&size=120`;
    largeAvatar.alt = fullName;
  }

  // Update profile name
  const profileName = document.querySelector(".profile-name");
  if (profileName) {
    profileName.textContent = fullName;
  } else {
    console.error("Profile name element not found");
  }

  // Load dynamic rating and rental count
  await loadUserRating(profile.user_id);
  
  // Update verification status button
  updateVerificationStatus(profile.is_verified);
}

// Load user rating from ratings table
async function loadUserRating(userId) {
  try {
    if (!userId) return;
    
    // Get ratings where user is the reviewee (being rated)
    const { data: ratings, error: ratingsError } = await window.supabaseClient
      .from("ratings")
      .select("rating")
      .eq("reviewee_id", userId);
    
    // Get total rentals count (as renter + as owner)
    const { data: renterBookings, error: renterError } = await window.supabaseClient
      .from("bookings")
      .select("booking_id")
      .eq("renter_id", userId)
      .in("status", ["completed", "returned"]);
    
    const { data: ownerBookings, error: ownerError } = await window.supabaseClient
      .from("bookings")
      .select("booking_id")
      .eq("owner_id", userId)
      .in("status", ["completed", "returned"]);
    
    // Calculate average rating
    let avgRating = 0;
    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
      avgRating = sum / ratings.length;
    }
    
    // Calculate total rentals
    const totalRentals = (renterBookings?.length || 0) + (ownerBookings?.length || 0);
    
    // Update UI
    const ratingContainer = document.querySelector(".profile-rating");
    if (ratingContainer) {
      const ratingSpan = ratingContainer.querySelector("span:not(.rating-count)");
      const rentalCountSpan = ratingContainer.querySelector(".rating-count");
      
      if (ratingSpan) {
        ratingSpan.textContent = avgRating > 0 ? avgRating.toFixed(1) : "New";
      }
      if (rentalCountSpan) {
        rentalCountSpan.textContent = `(${totalRentals} rentals)`;
      }
    }
  } catch (error) {
    console.error("Error loading user rating:", error);
  }
}

// Update verification status
function updateVerificationStatus(isVerified) {
  const verifyBtn = document.querySelector(".btn-verified");
  if (verifyBtn) {
    if (isVerified) {
      verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> GHANA CARD VERIFIED';
      verifyBtn.classList.add("verified");
      verifyBtn.style.background = "#27ae60";
      verifyBtn.style.cursor = "default";
      verifyBtn.onclick = null;
    } else {
      verifyBtn.innerHTML = '<i class="fas fa-shield-alt"></i> VERIFY GHANA CARD';
      verifyBtn.classList.remove("verified");
      verifyBtn.style.background = "var(--primary-orange)";
      verifyBtn.style.cursor = "pointer";
      verifyBtn.onclick = () => openGhanaCardVerification();
    }
  }
}

// Open Ghana Card verification modal
async function openGhanaCardVerification() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "ghanaCardModal";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h2 style="margin: 0; font-size: 20px;">
          <i class="fas fa-id-card" style="color: var(--primary-orange); margin-right: 8px;"></i>
          Ghana Card Verification
        </h2>
        <button class="modal-close" onclick="closeGhanaCardModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <p style="color: var(--text-gray); margin-bottom: 20px; line-height: 1.6;">
          For community safety and to prevent scams, we require all users to verify their identity 
          using their Ghana Card before they can rent or list equipment.
        </p>
        
        <div class="form-group" style="margin-bottom: 20px;">
          <label class="form-label">Ghana Card Number</label>
          <input type="text" class="form-input" id="ghanaCardNumber" 
                 placeholder="GHA-XXXXXXXXX-X" 
                 maxlength="15"
                 style="text-transform: uppercase;">
          <p class="form-hint" style="margin-top: 8px;">Enter your Ghana Card personal identification number</p>
        </div>
        
        <div class="form-group" style="margin-bottom: 20px;">
          <label class="form-label">Upload Ghana Card Photo (Front)</label>
          <div id="cardUploadArea" style="
            border: 2px dashed var(--border-color);
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
          " onclick="uploadGhanaCardImage()">
            <i class="fas fa-cloud-upload-alt" style="font-size: 32px; color: var(--text-gray); margin-bottom: 10px;"></i>
            <p style="color: var(--text-gray); margin: 0;">Click to upload or drag and drop</p>
            <p style="color: var(--text-light-gray); font-size: 12px; margin-top: 5px;">PNG, JPG up to 5MB</p>
          </div>
          <input type="file" id="ghanaCardFile" accept="image/*" style="display: none;" onchange="handleGhanaCardFileSelect(event)">
        </div>
        
        <div style="background: rgba(255, 193, 7, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <i class="fas fa-info-circle"></i>
            <strong>Note:</strong> Verification typically takes 24-48 hours. You'll receive a notification once verified.
          </p>
        </div>
        
        <button class="btn btn-primary" id="submitVerificationBtn" onclick="submitGhanaCardVerification()" style="width: 100%;">
          Submit for Verification
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add modal styles if not present
  if (!document.getElementById("ghanaCardModalStyles")) {
    const styles = document.createElement("style");
    styles.id = "ghanaCardModalStyles";
    styles.textContent = `
      .modal-overlay {
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
        animation: fadeIn 0.2s;
      }
      .modal-overlay .modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-height: 90vh;
        overflow-y: auto;
      }
      .modal-overlay .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--border-color);
      }
      .modal-overlay .modal-close {
        background: none;
        border: none;
        font-size: 18px;
        color: var(--text-gray);
        cursor: pointer;
        padding: 4px;
      }
      .modal-overlay .modal-close:hover {
        color: var(--text-dark);
      }
      #cardUploadArea:hover {
        border-color: var(--primary-orange);
        background: rgba(254, 116, 44, 0.05);
      }
      #cardUploadArea.has-file {
        border-color: var(--success-green);
        background: rgba(39, 174, 96, 0.05);
      }
    `;
    document.head.appendChild(styles);
  }
}

// Close Ghana Card modal
function closeGhanaCardModal() {
  const modal = document.getElementById("ghanaCardModal");
  if (modal) {
    modal.remove();
  }
}

// Upload Ghana Card image
function uploadGhanaCardImage() {
  document.getElementById("ghanaCardFile").click();
}

// Handle file selection
let selectedGhanaCardFile = null;

function handleGhanaCardFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      showAlert("File size must be less than 5MB", { type: "error", title: "File Too Large" });
      return;
    }
    
    selectedGhanaCardFile = file;
    const uploadArea = document.getElementById("cardUploadArea");
    uploadArea.classList.add("has-file");
    uploadArea.innerHTML = `
      <i class="fas fa-check-circle" style="font-size: 32px; color: var(--success-green); margin-bottom: 10px;"></i>
      <p style="color: var(--text-dark); margin: 0;">${file.name}</p>
      <p style="color: var(--text-gray); font-size: 12px; margin-top: 5px;">Click to change</p>
    `;
  }
}

// Submit Ghana Card verification
async function submitGhanaCardVerification() {
  const ghanaCardNumber = document.getElementById("ghanaCardNumber").value.trim().toUpperCase();
  
  // Validate Ghana Card number format (GHA-XXXXXXXXX-X)
  const ghanaCardPattern = /^GHA-\d{9}-\d$/;
  if (!ghanaCardNumber) {
    showAlert("Please enter your Ghana Card number", { type: "warning", title: "Missing Information" });
    return;
  }
  
  if (!ghanaCardPattern.test(ghanaCardNumber)) {
    showAlert("Please enter a valid Ghana Card number (Format: GHA-XXXXXXXXX-X)", { type: "warning", title: "Invalid Format" });
    return;
  }
  
  if (!selectedGhanaCardFile) {
    showAlert("Please upload a photo of your Ghana Card", { type: "warning", title: "Missing Image" });
    return;
  }
  
  const submitBtn = document.getElementById("submitVerificationBtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading image...';
  
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      showAlert("Please sign in to verify your Ghana Card", { type: "warning", title: "Sign In Required" });
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit for Verification';
      return;
    }
    
    // Upload image to Cloudinary
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading image...';
    
    const formData = new FormData();
    formData.append('file', selectedGhanaCardFile);
    formData.append('upload_preset', 'cr8kit_equipment');
    formData.append('folder', 'cr8kit/ghana_cards');
    
    const cloudinaryResponse = await fetch(
      'https://api.cloudinary.com/v1_1/dpfsqrccq/image/upload',
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!cloudinaryResponse.ok) {
      throw new Error('Failed to upload image');
    }
    
    const cloudinaryData = await cloudinaryResponse.json();
    const imageUrl = cloudinaryData.secure_url;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    // Update user record with Ghana Card ID and image URL
    const { error } = await window.supabaseClient
      .from("users")
      .update({ 
        ghana_card_id: ghanaCardNumber,
        ghana_card_image: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);
    
    if (error) throw error;
    
    // Create notification for the user
    await window.supabaseClient
      .from("notifications")
      .insert({
        user_id: userId,
        type: "verification",
        title: "Verification Submitted",
        message: "Your Ghana Card verification has been submitted and is pending review. This typically takes 24-48 hours.",
        is_read: false
      });
    
    closeGhanaCardModal();
    showAlert("Your verification request has been submitted! You'll be notified once approved.", { type: "success", title: "Submitted Successfully" });
    
    // Update button to show pending status
    const verifyBtn = document.querySelector(".btn-verified");
    if (verifyBtn) {
      verifyBtn.innerHTML = '<i class="fas fa-clock"></i> VERIFICATION PENDING';
      verifyBtn.style.background = "#f39c12";
      verifyBtn.onclick = null;
    }
    
  } catch (error) {
    console.error("Error submitting verification:", error);
    showAlert("Error submitting verification. Please try again.", { type: "error", title: "Error" });
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit for Verification';
  }
}


// Make functions globally available
window.openGhanaCardVerification = openGhanaCardVerification;
window.closeGhanaCardModal = closeGhanaCardModal;
window.uploadGhanaCardImage = uploadGhanaCardImage;
window.handleGhanaCardFileSelect = handleGhanaCardFileSelect;
window.submitGhanaCardVerification = submitGhanaCardVerification;


// Update profile form fields
function updateProfileForm(profile) {
  const fullName = profile.full_name || "";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Update first name
  const firstNameInput = document.getElementById("firstName");
  if (firstNameInput) {
    firstNameInput.value = firstName;
  }

  // Update last name
  const lastNameInput = document.getElementById("lastName");
  if (lastNameInput) {
    lastNameInput.value = lastName;
  }

  // Update email
  const emailInput = document.getElementById("email");
  if (emailInput) {
    emailInput.value = profile.email || "";
  }

  // Update phone
  const phoneInput = document.getElementById("phone");
  if (phoneInput) {
    phoneInput.value = profile.phone_number || "";
  }

  // Update bio
  const bioInput = document.getElementById("bio");
  if (bioInput) {
    bioInput.value = profile.bio || "";
  }
}

// Initialize profile page
function initProfilePage() {
  // Show personal info section by default
  showSection("personal-info");
}

// Show specific section
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });

  // Show selected section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // Update navigation links
  document.querySelectorAll(".profile-nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  const activeLink = document.querySelector(
    `.profile-nav-link[href="#${sectionId}"]`
  );
  if (activeLink) {
    activeLink.classList.add("active");
  }
}

// Save personal information
async function savePersonalInfo() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const bio = document.getElementById("bio").value.trim();

  // Validate inputs
  if (!firstName || !lastName || !email) {
    showAlert("Please fill in all required fields", { type: "warning", title: "Missing Fields" });
    return;
  }

  try {
    const userId = await window.getCurrentUserId();
    if (!userId) {
      showAlert("Please sign in to save your profile.", { type: "warning", title: "Sign In Required" });
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // Update user profile in Supabase
    const updateData = {
      full_name: fullName,
      email: email,
      phone_number: phone,
      updated_at: new Date().toISOString(),
    };

    // Add bio if it exists in the database schema
    if (bio) {
      updateData.bio = bio;
    }

    const { error } = await window.supabaseClient
      .from("users")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    // Update localStorage
    const updatedProfile = {
      full_name: fullName,
      email: email,
      phone_number: phone,
      bio: bio,
    };
    const existingProfile = JSON.parse(
      localStorage.getItem("cr8kit_profile") || "{}"
    );
    const mergedProfile = { ...existingProfile, ...updatedProfile };
    localStorage.setItem("cr8kit_profile", JSON.stringify(mergedProfile));

    // Update UI
    updateProfileSidebar(mergedProfile);
    if (window.updateUserInfo) {
      window.updateUserInfo();
    }

    showAlert("Personal information saved successfully!", { type: "success", title: "Saved" });
  } catch (error) {
    console.error("Error saving profile:", error);
    showAlert("Error: " + (error.message || "Failed to save profile"), { type: "error", title: "Error" });
  }
}

// Update password
async function updatePassword() {
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!newPassword || !confirmPassword) {
    showAlert("Please enter both password fields", { type: "warning", title: "Missing Fields" });
    return;
  }

  if (newPassword !== confirmPassword) {
    showAlert("Passwords do not match", { type: "error", title: "Password Mismatch" });
    return;
  }

  // Validate password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    showAlert(passwordValidation.message, { type: "warning", title: "Password Requirements" });
    return;
  }

  try {
    // Update password using Supabase Auth
    const { error } = await window.supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    showAlert("Password updated successfully!", { type: "success", title: "Password Updated" });

    // Clear password fields
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
  } catch (error) {
    console.error("Error updating password:", error);
    showAlert("Error: " + (error.message || "Failed to update password"), { type: "error", title: "Error" });
  }
}

// Validate password (reuse from auth.js)
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (password.length < minLength) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (!hasUpperCase) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!hasLowerCase) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!hasNumber) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }

  return { valid: true, message: "" };
}

// Initialize sign out button
function initSignOutButton() {
  console.log("Attempting to initialize sign out button...");
  const signOutBtn = document.getElementById("signOutBtn");

  if (!signOutBtn) {
    console.error("Sign out button not found! Retrying in 100ms...");
    setTimeout(initSignOutButton, 100);
    return;
  }

  console.log("Sign out button found:", signOutBtn);

  // Remove any existing handlers first by cloning
  const newBtn = signOutBtn.cloneNode(true);
  signOutBtn.parentNode.replaceChild(newBtn, signOutBtn);
  const btn = document.getElementById("signOutBtn");

  if (!btn) {
    console.error("Failed to re-find button after clone!");
    return;
  }

  // Set onclick handler directly with debugging
  btn.onclick = function (event) {
    console.log("Button clicked!", event);

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Call the sign out function
    if (typeof window.handleSignOut === "function") {
      console.log("Calling handleSignOut...");
      window.handleSignOut(event);
    } else {
      console.error("handleSignOut function not found!");
      showAlert("Sign out function not available. Please refresh the page.", { type: "error", title: "Error" });
    }
  };

  // Also add event listener as backup
  btn.addEventListener(
    "click",
    function (event) {
      console.log("AddEventListener triggered!");
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    false
  );

  console.log("Button onclick handler set:", typeof btn.onclick);
  console.log("Sign out button initialized successfully");
}

// Sign out function (also available as handleSignOut via window)
// The function is defined above in the global scope

// Load user's equipment for My Equipment section
async function loadMyEquipment() {
  try {
    const userId = await window.getCurrentUserId();
    if (!userId) return;
    
    // Fetch user's equipment
    const { data: equipment, error } = await window.supabaseClient
      .from("equipment")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading equipment:", error);
      return;
    }
    
    const equipmentGrid = document.querySelector("#my-equipment .equipment-grid");
    if (!equipmentGrid) return;
    
    if (!equipment || equipment.length === 0) {
      equipmentGrid.innerHTML = `
        <p style="text-align: center; color: var(--text-gray); padding: var(--spacing-xl); grid-column: 1/-1;">
          No equipment listed yet. 
          <a href="list-item.html" style="color: var(--primary-orange)">List your first item</a>
        </p>
      `;
      return;
    }
    
    // Render equipment cards
    equipmentGrid.innerHTML = equipment.map(eq => `
      <div class="equipment-card" onclick="window.location.href='equipment-details.html?id=${eq.equipment_id}'" style="cursor: pointer;">
        <div style="position: relative;">
          <img src="${eq.image_url || 'https://via.placeholder.com/280x180?text=No+Image'}" 
               alt="${eq.name}" 
               style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px 8px 0 0;">
          <span style="position: absolute; top: 8px; right: 8px; background: ${eq.is_available ? '#27ae60' : '#e74c3c'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
            ${eq.is_available ? 'Active' : 'Unavailable'}
          </span>
        </div>
        <div style="padding: 12px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${eq.name}</h4>
          <p style="margin: 0; color: var(--text-gray); font-size: 12px;">${eq.category || 'Equipment'}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <span style="font-weight: 700; color: var(--primary-orange);">GHS ${eq.price_per_day?.toFixed(2) || '0.00'}/day</span>
            <span style="font-size: 12px; color: var(--text-gray);">
              <i class="fas fa-star" style="color: #f1c40f;"></i> ${eq.rating?.toFixed(1) || 'New'}
            </span>
          </div>
        </div>
      </div>
    `).join('');
    
    // Add styles for equipment cards if not present
    if (!document.getElementById("myEquipmentStyles")) {
      const styles = document.createElement("style");
      styles.id = "myEquipmentStyles";
      styles.textContent = `
        #my-equipment {
          min-width: 100%;
        }
        #my-equipment .equipment-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          width: 100%;
        }
        #my-equipment .equipment-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          min-width: 0;
        }
        #my-equipment .equipment-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        #my-equipment .equipment-card img {
          height: 160px !important;
        }
        @media (max-width: 900px) {
          #my-equipment .equipment-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          #my-equipment .equipment-grid {
            grid-template-columns: 1fr;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    
  } catch (error) {
    console.error("Error loading my equipment:", error);
  }
}
